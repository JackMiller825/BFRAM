import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ADAPTERS, adapterFor, credentialsPresent, missingCredentials, validateDraftText } from '../domain/adapters'
import { campaignBriefMarkdown, campaignFieldIssues } from '../domain/brief'
import { scanCampaignClaims, scanClaims } from '../domain/claims'
import { generateDraftSet } from '../domain/drafts'
import { createId } from '../domain/ids'
import { clientLink, importCsv, importLinkText, linksToCsv } from '../domain/links'
import { isTerminalStatus } from '../domain/progress'
import {
  classifyProviderError,
  contentHash,
  decideAutoRetry,
  evaluatePublishTarget,
  retryBackoffMs,
  runPublishingAttempt,
} from '../domain/publish'
import { inspectPublicUrl } from '../domain/ssrf'
import type {
  Asset,
  AuditEvent,
  Campaign,
  ClientWorkspace,
  ConnectedAccount,
  Draft,
  IntegrationCard,
  LinkCategory,
  LinkRecord,
  PlatformId,
  ProviderResult,
  PublishJob,
  PublishTask,
  ScheduledPost,
  Source,
  SourceType,
  StudioSettings,
  TemplateId,
} from '../domain/types'
import { seedBatches } from './seed-data'
import { starterCampaigns } from './starters'
import { isTelegramAdmin, liveTelegram, TelegramError, type TelegramApi } from './telegram'

const SOURCE_TYPES = new Set<SourceType>(['primary', 'reliable_report', 'unverified'])
const CATEGORIES = new Set<LinkCategory>(['owned', 'partner', 'research', 'prospect'])
const PLATFORMS = new Set<PlatformId>(['telegram', 'x', 'youtube', 'tiktok', 'instagram', 'reddit', 'discord', 'website', 'other'])

export class StudioError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface ServerAccount extends ConnectedAccount {
  botUserId: number | null
}

interface ServerDb {
  version: 1
  owner: { salt: string; hash: string } | null
  settings: StudioSettings
  campaigns: Campaign[]
  links: LinkRecord[]
  accounts: ServerAccount[]
  drafts: Draft[]
  approvals: ClientWorkspace['approvals']
  posts: ScheduledPost[]
  jobs: PublishJob[]
  audit: AuditEvent[]
  idempotency: Record<string, ProviderResult>
}

export interface StudioStore {
  setup(password: string): string
  login(password: string): string
  logout(sessionId: string): void
  hasSession(sessionId: string): boolean
  needsSetup(): boolean
  snapshot(): ClientWorkspace
  saveCampaign(input: unknown): Campaign
  deleteCampaign(id: string): void
  importText(text: string, category: LinkCategory, tags: string[]): { added: number; duplicates: number; invalid: number }
  importCsvText(csv: string): { added: number; duplicates: number; invalid: number }
  updateLink(id: string, patch: unknown): LinkRecord
  archiveLink(id: string, archived: boolean): void
  revealLink(id: string): string
  linksCsv(includeInvites: boolean): string
  addExternalAsset(campaignId: string, input: { kind: Asset['kind']; fileName: string; externalUrl: string; altText: string }): Asset
  addFileAsset(campaignId: string, input: { kind: Asset['kind']; fileName: string; mimeType: string; bytes: Uint8Array; altText: string }): Asset
  readAsset(campaignId: string, assetId: string): { asset: Asset; bytes: Uint8Array } | null
  deleteAsset(campaignId: string, assetId: string): void
  generateDrafts(campaignId: string, template: TemplateId, platform: PlatformId): Draft[]
  updateDraft(id: string, patch: unknown): Draft
  decideDraft(id: string, decision: 'approved' | 'rejected', note: string): Draft
  schedule(input: { draftId: string; linkId: string; scheduledFor: string }): ScheduledPost
  cancelPost(id: string): void
  prepare(campaignId: string): PublishJob
  setPaused(input: { global?: boolean; platform?: PlatformId; paused: boolean }): void
  pauseJob(id: string): void
  resumeJob(id: string): void
  cancelJob(id: string): void
  retryJob(id: string): void
  updateSettings(patch: unknown): StudioSettings
  brief(campaignId: string): string
  report(): string
  reset(password: string): void
  connectTelegram(): Promise<ConnectedAccount>
  disconnect(accountId: string): void
  verifyLink(linkId: string): Promise<LinkRecord>
  pump(): Promise<void>
  onChange(listener: () => void): () => void
}

function clip(value: unknown, max: number): string {
  return String(value ?? '').split('\u0000').join('').trim().slice(0, max)
}

function httpsOrEmpty(value: string): string | null {
  if (!value) return null
  const inspected = inspectPublicUrl(value)
  if (!inspected.ok || inspected.url.protocol !== 'https:') throw new StudioError(400, 'Campaign links must be public https URLs.')
  return inspected.url.toString()
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let index = 0; index < out.length; index += 1) out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  return out
}

function hashPassword(password: string, salt = randomBytes(16)): { salt: string; hash: string } {
  const hash = scryptSync(password, salt, 32)
  return { salt: bytesToHex(salt), hash: bytesToHex(hash) }
}

function checkPassword(password: string, owner: { salt: string; hash: string }): boolean {
  const next = scryptSync(password, hexToBytes(owner.salt), 32)
  const current = hexToBytes(owner.hash)
  return next.length === current.length && timingSafeEqual(next, current)
}

function defaultSettings(): StudioSettings {
  return {
    timezone: 'UTC',
    quietHours: { enabled: true, start: '22:00', end: '08:00' },
    globalPause: false,
    platformPause: {},
  }
}

function emptyDb(): ServerDb {
  return {
    version: 1,
    owner: null,
    settings: defaultSettings(),
    campaigns: [],
    links: [],
    accounts: [],
    drafts: [],
    approvals: [],
    posts: [],
    jobs: [],
    audit: [],
    idempotency: {},
  }
}

export function loadEnvFile(root: string, env: NodeJS.ProcessEnv): void {
  const file = join(root, '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    if (!/^[A-Z0-9_]+$/.test(key) || env[key] !== undefined) continue
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
}

function seedDb(now: string): ServerDb {
  const db = emptyDb()
  db.campaigns = starterCampaigns(now)
  let links: LinkRecord[] = []
  for (const batch of seedBatches) {
    const result = importLinkText(links, batch.lines, batch, now)
    links = result.links
  }
  db.links = links
  return db
}

function publicAccount(account: ServerAccount): ConnectedAccount {
  return {
    id: account.id,
    platform: account.platform,
    label: account.label,
    externalId: account.externalId,
    scopes: account.scopes,
    status: account.status,
    authSource: account.authSource,
    connectedAt: account.connectedAt,
    tokenStored: false,
  }
}

function integrations(accounts: ServerAccount[], env: NodeJS.ProcessEnv): IntegrationCard[] {
  return ADAPTERS.map((adapter) => {
    const account = accounts.find((item) => item.platform === adapter.platform && item.status === 'authorized')
    if (adapter.publish && account && credentialsPresent(adapter.platform, env)) {
      return {
        platform: adapter.platform,
        name: adapter.name,
        state: 'connected',
        detail: `Connected as ${account.label}. Posts still need a verified destination and manual approval.`,
        missingEnv: [],
        canPublish: true,
      }
    }
    if (!adapter.publish) {
      const detected = adapter.envKeys.filter((key) => env[key]?.trim())
      const unused = detected.length > 0 ? ' Credentials were detected and are not used.' : ''
      return {
        platform: adapter.platform,
        name: adapter.name,
        state: 'unavailable',
        detail: `${adapter.summary}${unused} Drafts stay ready to copy.`,
        missingEnv: adapter.envKeys,
        canPublish: false,
      }
    }
    const missing = missingCredentials(adapter.platform, env)
    return {
      platform: adapter.platform,
      name: adapter.name,
      state: 'unavailable',
      detail: missing.length
        ? 'Connect account is unavailable until the server credentials are set.'
        : 'Credentials detected. Connect the account to verify it.',
      missingEnv: missing,
      canPublish: false,
    }
  })
}

function taskShell(label: string, kind: PublishTask['kind'], platform: PublishTask['platform']): PublishTask {
  return {
    id: createId('task'),
    idempotencyKey: createId('idem'),
    label,
    platform,
    kind,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    errorClass: null,
    errorSummary: null,
    waitingOnProvider: false,
    scheduledPostId: null,
    result: null,
    logs: [],
    nextAttemptAt: null,
  }
}

function finishJob(job: PublishJob, now: string): void {
  if (job.tasks.length === 0) return
  if (!job.tasks.every((item) => isTerminalStatus(item.status))) return
  job.status = job.status === 'canceled' ? 'canceled' : 'completed'
  job.finishedAt = now
}

export function createStore(
  dir: string,
  options: { telegram?: (token: string) => TelegramApi; env?: NodeJS.ProcessEnv; now?: () => string } = {},
): StudioStore {
  mkdirSync(dir, { recursive: true })
  const env = options.env ?? process.env
  if (options.env === undefined) loadEnvFile(process.cwd(), env)
  const file = join(dir, 'studio.json')
  const uploads = join(dir, 'uploads')
  mkdirSync(uploads, { recursive: true })
  const now = () => options.now?.() ?? new Date().toISOString()
  const telegramFor = options.telegram ?? ((token: string) => liveTelegram(token))
  const sessions = new Map<string, number>()
  const listeners = new Set<() => void>()
  let loginFailures = 0
  let loginLockedUntil = 0
  let pumping = false
  let db = readDb()

  function readDb(): ServerDb {
    if (!existsSync(file)) {
      const seeded = seedDb(now())
      write(seeded)
      return seeded
    }
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as ServerDb
    if (parsed.version !== 1) throw new StudioError(500, 'The studio database version is not supported.')
    return parsed
  }

  function write(next: ServerDb = db): void {
    const tmp = join(dir, 'studio.json.tmp')
    writeFileSync(tmp, JSON.stringify(next), 'utf8')
    renameSync(tmp, file)
  }

  function audit(action: string, summary: string): void {
    db.audit.unshift({ id: createId('audit'), at: now(), action, summary: clip(summary, 400) })
    db.audit = db.audit.slice(0, 200)
  }

  function emit(): void {
    for (const listener of listeners) listener()
  }

  function persist(): void {
    write()
    emit()
  }

  function requireCampaign(id: string): Campaign {
    const campaign = db.campaigns.find((item) => item.id === id)
    if (!campaign) throw new StudioError(404, 'Campaign not found.')
    return campaign
  }

  function requireDraft(id: string): Draft {
    const draft = db.drafts.find((item) => item.id === id)
    if (!draft) throw new StudioError(404, 'Draft not found.')
    return draft
  }

  function sanitizeSources(value: unknown): Source[] {
    if (!Array.isArray(value)) return []
    return value.slice(0, 40).map((item) => {
      const source = item as Partial<Source>
      const url = clip(source.url, 500)
      const inspected = inspectPublicUrl(url)
      if (!inspected.ok || inspected.url.protocol !== 'https:') throw new StudioError(400, 'Each source needs a public https URL.')
      const sourceType = SOURCE_TYPES.has(source.sourceType as SourceType) ? (source.sourceType as SourceType) : 'unverified'
      return {
        id: clip(source.id, 80) || createId('src'),
        url,
        publisher: clip(source.publisher, 160),
        publishedAt: clip(source.publishedAt, 40) || null,
        eventAt: clip(source.eventAt, 40) || null,
        sourceType,
        verificationNotes: clip(source.verificationNotes, 1000),
      }
    })
  }

  function sanitizeCampaign(current: Campaign | null, input: unknown): Campaign {
    const body = input as Partial<Campaign>
    const token = (body.token ?? {}) as Campaign['token']
    const timezone = clip(body.timezone || token?.timezone, 80) || 'UTC'
    const address = clip(token?.contractAddress, 80)
    const contractConfirmed = Boolean(token?.contractConfirmed) && /^0x[a-fA-F0-9]{40}$/.test(address)
    const limits: Campaign['platformLimits'] = {}
    const rawLimits = token && body.platformLimits ? body.platformLimits : {}
    for (const [key, value] of Object.entries(rawLimits)) {
      if (!PLATFORMS.has(key as PlatformId)) continue
      const number = Number(value)
      if (Number.isInteger(number) && number >= 0 && number <= 24) limits[key as PlatformId] = number
    }
    const createdAt = current?.createdAt ?? now()
    return {
      id: current?.id ?? createId('camp'),
      name: clip(body.name || token?.projectName, 120) || 'Untitled campaign',
      demo: current?.demo ?? Boolean(body.demo),
      status: current?.status ?? 'draft',
      createdAt,
      updatedAt: now(),
      token: {
        projectName: clip(token?.projectName, 120),
        ticker: clip(token?.ticker, 16).replace(/^\$+/, ''),
        chain: clip(token?.chain, 80),
        contractAddress: address || null,
        contractConfirmed,
        launchAt: clip(token?.launchAt, 40) || null,
        timezone,
        websiteUrl: httpsOrEmpty(clip(token?.websiteUrl, 500)),
        officialUrls: Array.isArray(token?.officialUrls)
          ? token.officialUrls.slice(0, 20).flatMap((item) => {
              const url = httpsOrEmpty(clip(item.url, 500))
              return url ? [{ id: clip(item.id, 80) || createId('url'), label: clip(item.label, 80), url }] : []
            })
          : [],
        dexUrls: Array.isArray(token?.dexUrls)
          ? token.dexUrls.slice(0, 20).flatMap((item) => {
              const url = httpsOrEmpty(clip(item.url, 500))
              return url ? [{ id: clip(item.id, 80) || createId('url'), label: clip(item.label, 80), url }] : []
            })
          : [],
        shortDescription: clip(token?.shortDescription, 2000),
        longDescription: clip(token?.longDescription, 20000),
        narrative: clip(token?.narrative, 20000),
        utility: clip(token?.utility, 8000),
        tokenomics: clip(token?.tokenomics, 8000),
        risks: clip(token?.risks, 8000),
        disclosures: clip(token?.disclosures, 8000),
      },
      sources: sanitizeSources(body.sources),
      objective: clip(body.objective, 4000),
      audience: clip(body.audience, 2000),
      tone: clip(body.tone, 400),
      languages: Array.isArray(body.languages) ? body.languages.map((item) => clip(item, 40)).filter(Boolean).slice(0, 8) : [],
      startDate: clip(body.startDate, 40) || null,
      endDate: clip(body.endDate, 40) || null,
      timezone,
      postingFrequency: clip(body.postingFrequency, 400),
      platformLimits: Object.keys(limits).length > 0 ? limits : current?.platformLimits ?? { telegram: 4, x: 3 },
      assets: current?.assets ?? [],
      briefNotes: clip(body.briefNotes, 8000),
    }
  }

  function executeLocal(job: PublishJob, task: PublishTask): void {
    const campaign = db.campaigns.find((item) => item.id === job.campaignId)
    if (!campaign) {
      task.status = 'failed'
      task.errorClass = 'permanent'
      task.errorSummary = 'Campaign not found.'
      task.logs.push({ at: now(), message: task.errorSummary })
      return
    }
    if (task.kind === 'validate') {
      const issues = campaignFieldIssues(campaign)
      task.logs.push({ at: now(), message: issues.length ? issues.join(' ') : 'Required fields are present.' })
      task.status = issues.some((issue) => issue.endsWith('is required.') || issue.includes('end date')) ? 'failed' : 'succeeded'
      task.errorClass = task.status === 'failed' ? 'permanent' : null
      task.errorSummary = task.status === 'failed' ? issues[0] : null
      return
    }
    if (task.kind === 'claims') {
      const issues = scanCampaignClaims(campaign)
      task.logs.push({
        at: now(),
        message: issues.length ? `${issues.length} unsupported claim${issues.length === 1 ? '' : 's'} must be corrected before publishing.` : 'No unsupported-claim patterns found.',
      })
      task.status = 'succeeded'
      return
    }
    if (task.kind === 'links') {
      const blocked = db.links.filter((link) => !link.archived && link.category !== 'owned').length
      task.logs.push({ at: now(), message: `${blocked} research or prospect records are blocked from the publishing queue.` })
      task.status = 'succeeded'
      return
    }
    if (task.kind === 'drafts') {
      const existing = db.drafts.filter((draft) => draft.campaignId === campaign.id)
      if (existing.length > 0) {
        task.logs.push({ at: now(), message: `${existing.length} drafts already exist and were left in review.` })
        task.status = 'succeeded'
        return
      }
      const created = [
        ...generateDraftSet(campaign, 'launch', 'telegram', now()),
        ...generateDraftSet(campaign, 'x_post', 'x', now()),
        ...generateDraftSet(campaign, 'faq', 'telegram', now()),
      ]
      db.drafts.push(...created)
      task.logs.push({ at: now(), message: `Generated ${created.length} drafts for review.` })
      task.status = 'succeeded'
      return
    }
    const brief = campaignBriefMarkdown(campaign, db.links.map(clientLink))
    task.logs.push({ at: now(), message: `Brief is ready (${brief.length} characters).` })
    task.status = 'succeeded'
  }

  async function executePublish(task: PublishTask): Promise<void> {
    const post = db.posts.find((item) => item.id === task.scheduledPostId)
    if (!post) {
      task.status = 'skipped'
      task.errorSummary = 'Scheduled post no longer exists.'
      task.logs.push({ at: now(), message: task.errorSummary })
      return
    }
    const link = db.links.find((item) => item.id === post.linkId) ?? null
    const draft = db.drafts.find((item) => item.id === post.draftId) ?? null
    const campaign = db.campaigns.find((item) => item.id === post.campaignId)
    const account = db.accounts.find((item) => item.platform === post.platform && item.status === 'authorized') ?? null
    const gate = evaluatePublishTarget({
      link,
      account: account ? publicAccount(account) : null,
      draft,
      adapterCanPublish: adapterFor(post.platform).publish,
      credentialsConfigured: credentialsPresent(post.platform, env),
      settings: db.settings,
      scheduledFor: post.scheduledFor,
      timezone: post.timezone,
      existingPosts: db.posts.filter((item) => item.id !== post.id),
      contentHash: post.contentHash,
      platformLimit: campaign?.platformLimits[post.platform] ?? adapterFor(post.platform).appDailyCap,
      budgetApproved: Boolean(link?.budgetApproved),
    })
    if (!gate.allowed) {
      task.status = 'skipped'
      task.errorClass = 'permanent'
      task.errorSummary = gate.reasons[0] ?? 'Publishing was blocked.'
      task.result = { ok: false, confirmed: false, code: 'not_authorized', providerPostId: null, providerUrl: null, message: task.errorSummary }
      post.status = 'canceled'
      post.errorSummary = task.errorSummary
      post.updatedAt = now()
      task.logs.push({ at: now(), message: task.errorSummary })
      return
    }
    task.status = 'running'
    task.waitingOnProvider = true
    post.status = 'publishing'
    post.updatedAt = now()
    task.logs.push({ at: now(), message: 'Waiting for platform response' })
    persist()

    const token = env.TELEGRAM_BOT_TOKEN?.trim() ?? ''
    const { result, replayed } = await runPublishingAttempt({
      key: post.idempotencyKey,
      store: db.idempotency,
      attempt: async () => {
        if (post.platform !== 'telegram' || !token || !link?.verifiedChatId) {
          return {
            ok: false,
            confirmed: false,
            code: 'integration_unavailable',
            providerPostId: null,
            providerUrl: null,
            message: 'Integration unavailable. The draft was not published.',
          }
        }
        try {
          const message = await telegramFor(token).sendMessage(link.verifiedChatId, draft?.body ?? '')
          const url = message.chat.username ? `https://t.me/${message.chat.username}/${message.message_id}` : null
          return {
            ok: true,
            confirmed: true,
            code: 'published',
            providerPostId: String(message.message_id),
            providerUrl: url,
            message: 'Telegram confirmed the message id.',
          }
        } catch (error) {
          const code = error instanceof TelegramError ? error.code : 'network'
          const message = error instanceof Error ? error.message : 'Telegram request failed.'
          return { ok: false, confirmed: false, code, providerPostId: null, providerUrl: null, message }
        }
      },
    })
    task.waitingOnProvider = false
    task.result = result
    if (replayed) task.logs.push({ at: now(), message: 'Reused the confirmed provider result for this idempotency key.' })
    if (result.confirmed && result.providerPostId) {
      task.status = 'succeeded'
      task.errorClass = null
      task.errorSummary = null
      post.status = 'published'
      post.providerPostId = result.providerPostId
      post.providerUrl = result.providerUrl
      post.errorSummary = null
      task.logs.push({ at: now(), message: result.message })
    } else if (result.code === 'integration_unavailable' || result.code === 'not_authorized') {
      task.status = 'skipped'
      task.errorClass = 'permanent'
      task.errorSummary = result.message
      post.status = 'approved'
      post.errorSummary = result.message
      task.logs.push({ at: now(), message: result.message })
    } else {
      task.attempts += 1
      task.errorClass = classifyProviderError(result.code)
      task.errorSummary = result.message
      if (decideAutoRetry(task) === 'retry') {
        task.status = 'pending'
        task.nextAttemptAt = new Date(Date.parse(now()) + retryBackoffMs(task.attempts)).toISOString()
        post.status = 'scheduled'
        task.logs.push({ at: now(), message: `Transient failure. Retry ${task.attempts} of ${task.maxAttempts}.` })
      } else {
        task.status = 'failed'
        post.status = 'failed'
        task.logs.push({ at: now(), message: result.message })
      }
    }
    post.updatedAt = now()
  }

  return {
    setup(password) {
      if (db.owner) throw new StudioError(409, 'The workspace already has an owner.')
      if (password.length < 10 || password.length > 200) throw new StudioError(400, 'Use a password of at least 10 characters.')
      if (/^\d+:[A-Za-z0-9_-]{20,}$/.test(password)) throw new StudioError(400, 'Do not use an API token as the password.')
      db.owner = hashPassword(password)
      audit('setup', 'Owner password created.')
      persist()
      const session = bytesToHex(randomBytes(32))
      sessions.set(session, Date.now())
      return session
    },
    login(password) {
      if (!db.owner) throw new StudioError(409, 'Create the owner password first.')
      if (Date.now() < loginLockedUntil) throw new StudioError(429, 'Too many attempts. Wait a moment and try again.')
      if (!checkPassword(password, db.owner)) {
        loginFailures += 1
        if (loginFailures >= 5) {
          loginLockedUntil = Date.now() + 30_000
          loginFailures = 0
        }
        throw new StudioError(401, 'Password did not match.')
      }
      loginFailures = 0
      const session = bytesToHex(randomBytes(32))
      sessions.set(session, Date.now())
      audit('login', 'Owner signed in.')
      persist()
      return session
    },
    logout(sessionId) {
      sessions.delete(sessionId)
    },
    hasSession(sessionId) {
      const created = sessions.get(sessionId)
      if (!created) return false
      if (Date.now() - created > 7 * 24 * 60 * 60 * 1000) {
        sessions.delete(sessionId)
        return false
      }
      return true
    },
    needsSetup() {
      return db.owner === null
    },
    snapshot() {
      return {
        settings: db.settings,
        campaigns: db.campaigns,
        links: db.links.map(clientLink),
        accounts: db.accounts.map(publicAccount),
        drafts: db.drafts,
        approvals: db.approvals,
        posts: db.posts,
        jobs: db.jobs,
        audit: db.audit.slice(0, 40),
        integrations: integrations(db.accounts, env),
      }
    },
    saveCampaign(input) {
      const incoming = input as { id?: string }
      const current = incoming.id ? requireCampaign(clip(incoming.id, 80)) : null
      const next = sanitizeCampaign(current, input)
      if (current) Object.assign(current, next)
      else db.campaigns.unshift(next)
      audit('campaign', `Saved campaign ${next.name}.`)
      persist()
      return next
    },
    deleteCampaign(id) {
      const campaign = requireCampaign(id)
      db.campaigns = db.campaigns.filter((item) => item.id !== id)
      db.drafts = db.drafts.filter((item) => item.campaignId !== id)
      db.posts = db.posts.filter((item) => item.campaignId !== id)
      for (const asset of campaign.assets) {
        if (asset.storageName) rmSync(join(uploads, asset.storageName), { force: true })
      }
      audit('delete', `Deleted campaign ${campaign.name}.`)
      persist()
    },
    importText(text, category, tags) {
      if (!CATEGORIES.has(category)) throw new StudioError(400, 'Unknown link category.')
      const result = importLinkText(db.links, clip(text, 200_000), { batch: 'Manual import', category, tags: tags.map((tag) => clip(tag, 40)).slice(0, 12) }, now())
      db.links = result.links
      audit('links', `Imported links. Added ${result.added}, exact duplicates ${result.duplicates}.`)
      persist()
      return { added: result.added, duplicates: result.duplicates, invalid: result.invalid.length }
    },
    importCsvText(csv) {
      const result = importCsv(db.links, clip(csv, 500_000), now())
      db.links = result.links
      audit('links', `CSV import added ${result.added} and merged ${result.duplicates} duplicates.`)
      persist()
      return { added: result.added, duplicates: result.duplicates, invalid: result.invalid.length }
    },
    updateLink(id, patch) {
      const link = db.links.find((item) => item.id === id)
      if (!link) throw new StudioError(404, 'Link not found.')
      const body = patch as Partial<LinkRecord>
      if (body.category && CATEGORIES.has(body.category) && body.category !== link.category) {
        link.category = body.category
        link.authorizationStatus = 'unverified'
        link.verifiedChatId = null
        link.authorizationEvidence = ''
      }
      if (typeof body.displayName === 'string') link.displayName = clip(body.displayName, 120)
      if (typeof body.contactNotes === 'string') link.contactNotes = clip(body.contactNotes, 2000)
      if (typeof body.notes === 'string') link.notes = clip(body.notes, 4000)
      if (typeof body.budgetNote === 'string') link.budgetNote = clip(body.budgetNote, 1000)
      if (typeof body.budgetApproved === 'boolean' && link.category === 'partner') link.budgetApproved = body.budgetApproved
      if (Array.isArray(body.tags)) link.tags = body.tags.map((tag) => clip(tag, 40)).filter(Boolean).slice(0, 16)
      link.updatedAt = now()
      persist()
      return clientLink(link)
    },
    archiveLink(id, archived) {
      const link = db.links.find((item) => item.id === id)
      if (!link) throw new StudioError(404, 'Link not found.')
      link.archived = archived
      link.updatedAt = now()
      persist()
    },
    revealLink(id) {
      const link = db.links.find((item) => item.id === id)
      if (!link) throw new StudioError(404, 'Link not found.')
      if (!link.privateInvite) return link.original
      audit('reveal', 'Owner revealed a private invite link.')
      persist()
      return link.original
    },
    linksCsv(includeInvites) {
      return linksToCsv(includeInvites ? db.links : db.links.map(clientLink), includeInvites)
    },
    addExternalAsset(campaignId, input) {
      const campaign = requireCampaign(campaignId)
      const inspected = inspectPublicUrl(input.externalUrl)
      if (!inspected.ok || inspected.url.protocol !== 'https:') throw new StudioError(400, 'Asset links must be public https URLs.')
      const asset: Asset = {
        id: createId('asset'),
        campaignId,
        kind: input.kind,
        fileName: clip(input.fileName, 160) || inspected.url.hostname,
        mimeType: 'text/uri-list',
        size: 0,
        storageName: null,
        externalUrl: inspected.url.toString(),
        altText: clip(input.altText, 300),
        createdAt: now(),
      }
      campaign.assets.push(asset)
      campaign.updatedAt = now()
      persist()
      return asset
    },
    addFileAsset(campaignId, input) {
      const campaign = requireCampaign(campaignId)
      const assetId = createId('asset')
      const storageName = `${assetId}.bin`
      writeFileSync(join(uploads, storageName), input.bytes)
      const asset: Asset = {
        id: assetId,
        campaignId,
        kind: input.kind,
        fileName: clip(input.fileName, 160) || 'upload',
        mimeType: input.mimeType,
        size: input.bytes.length,
        storageName,
        externalUrl: null,
        altText: clip(input.altText, 300),
        createdAt: now(),
      }
      campaign.assets.push(asset)
      campaign.updatedAt = now()
      persist()
      return asset
    },
    readAsset(campaignId, assetId) {
      const campaign = requireCampaign(campaignId)
      const asset = campaign.assets.find((item) => item.id === assetId)
      if (!asset?.storageName) return null
      const bytes = readFileSync(join(uploads, asset.storageName))
      return { asset, bytes }
    },
    deleteAsset(campaignId, assetId) {
      const campaign = requireCampaign(campaignId)
      const asset = campaign.assets.find((item) => item.id === assetId)
      if (!asset) throw new StudioError(404, 'Asset not found.')
      if (asset.storageName) rmSync(join(uploads, asset.storageName), { force: true })
      campaign.assets = campaign.assets.filter((item) => item.id !== assetId)
      persist()
    },
    generateDrafts(campaignId, template, platform) {
      const campaign = requireCampaign(campaignId)
      const drafts = generateDraftSet(campaign, template, platform, now())
      db.drafts.unshift(...drafts)
      audit('drafts', `Generated ${drafts.length} ${template} drafts.`)
      persist()
      return drafts
    },
    updateDraft(id, patch) {
      const draft = requireDraft(id)
      const body = patch as Partial<Draft>
      const previous = { id: createId('ver'), title: draft.title, body: draft.body, savedAt: now() }
      const nextBody = typeof body.body === 'string' ? clip(body.body, 20000) : draft.body
      const nextTitle = typeof body.title === 'string' ? clip(body.title, 300) : draft.title
      if (nextBody !== draft.body || nextTitle !== draft.title) {
        draft.versions.unshift(previous)
        draft.versions = draft.versions.slice(0, 20)
        if (draft.status === 'approved') draft.status = 'needs_review'
      }
      draft.body = nextBody
      draft.title = nextTitle
      if (typeof body.altText === 'string') draft.altText = clip(body.altText, 300)
      if (typeof body.disclosure === 'string') draft.disclosure = clip(body.disclosure, 500)
      if (typeof body.sponsored === 'boolean') draft.sponsored = body.sponsored
      if (typeof body.callToAction === 'string') draft.callToAction = clip(body.callToAction, 400)
      draft.updatedAt = now()
      persist()
      return draft
    },
    decideDraft(id, decision, note) {
      const draft = requireDraft(id)
      if (decision === 'approved') {
        const issues = scanClaims(`${draft.title}\n${draft.body}\n${draft.disclosure}`)
        if (issues.length > 0) throw new StudioError(400, issues.map((issue) => `${issue.excerpt}: ${issue.concern}`).join(' '))
        const errors = validateDraftText(draft.platform, draft.title, draft.body, draft.sponsored, draft.disclosure)
        if (errors.length > 0) throw new StudioError(400, errors.join(' '))
        draft.status = 'approved'
      } else {
        draft.status = 'needs_review'
      }
      db.approvals.unshift({ id: createId('approval'), draftId: id, decision, note: clip(note, 1000), at: now() })
      draft.updatedAt = now()
      audit('review', `${decision === 'approved' ? 'Approved' : 'Rejected'} a ${draft.platform} draft.`)
      persist()
      return draft
    },
    schedule(input) {
      const draft = requireDraft(input.draftId)
      const link = db.links.find((item) => item.id === input.linkId)
      if (!link) throw new StudioError(404, 'Link not found.')
      const campaign = requireCampaign(draft.campaignId)
      const account = db.accounts.find((item) => item.platform === link.platform && item.status === 'authorized') ?? null
      const scheduledFor = clip(input.scheduledFor, 40)
      if (Number.isNaN(Date.parse(scheduledFor))) throw new StudioError(400, 'Scheduled time is not a valid date.')
      const gate = evaluatePublishTarget({
        link,
        account: account ? publicAccount(account) : null,
        draft,
        adapterCanPublish: adapterFor(link.platform).publish,
        credentialsConfigured: credentialsPresent(link.platform, env),
        settings: db.settings,
        scheduledFor,
        timezone: campaign.timezone,
        existingPosts: db.posts,
        contentHash: contentHash(draft.body),
        platformLimit: campaign.platformLimits[link.platform] ?? adapterFor(link.platform).appDailyCap,
        budgetApproved: link.budgetApproved,
      })
      if (!gate.allowed) throw new StudioError(403, gate.reasons.join(' '))
      const post: ScheduledPost = {
        id: createId('post'),
        draftId: draft.id,
        campaignId: campaign.id,
        linkId: link.id,
        accountId: account?.id ?? null,
        platform: link.platform,
        status: 'scheduled',
        scheduledFor,
        timezone: campaign.timezone,
        idempotencyKey: createId('idem'),
        contentHash: contentHash(draft.body),
        disclosure: draft.disclosure,
        sponsored: draft.sponsored,
        providerPostId: null,
        providerUrl: null,
        errorSummary: null,
        createdAt: now(),
        updatedAt: now(),
      }
      db.posts.unshift(post)
      const publishTask = taskShell(`Publish ${draft.title || draft.template}`, 'publish', link.platform)
      publishTask.scheduledPostId = post.id
      publishTask.idempotencyKey = post.idempotencyKey
      publishTask.nextAttemptAt = scheduledFor
      const job: PublishJob = {
        id: createId('job'),
        campaignId: campaign.id,
        kind: 'publishing',
        status: 'queued',
        createdAt: now(),
        startedAt: null,
        finishedAt: null,
        tasks: [publishTask],
        planRevision: 1,
        planTotal: 1,
      }
      db.jobs.unshift(job)
      audit('queue', `Scheduled a ${link.platform} post for a verified destination.`)
      persist()
      return post
    },
    cancelPost(id) {
      const post = db.posts.find((item) => item.id === id)
      if (!post) throw new StudioError(404, 'Scheduled post not found.')
      if (post.status === 'published') throw new StudioError(409, 'A confirmed post cannot be canceled here.')
      post.status = 'canceled'
      post.updatedAt = now()
      for (const job of db.jobs) {
        for (const task of job.tasks) {
          if (task.scheduledPostId === id && task.status === 'pending') task.status = 'canceled'
        }
        finishJob(job, now())
      }
      persist()
    },
    prepare(campaignId) {
      requireCampaign(campaignId)
      const tasks = [
        taskShell('Validate campaign brief', 'validate', 'local'),
        taskShell('Scan claims and disclosures', 'claims', 'local'),
        taskShell('Check reference links against the publishing rules', 'links', 'local'),
        taskShell('Generate review drafts', 'drafts', 'local'),
        taskShell('Build the exportable brief', 'brief', 'local'),
      ]
      const job: PublishJob = {
        id: createId('job'),
        campaignId,
        kind: 'preparation',
        status: 'queued',
        createdAt: now(),
        startedAt: null,
        finishedAt: null,
        tasks,
        planRevision: 1,
        planTotal: tasks.length,
      }
      db.jobs.unshift(job)
      audit('prepare', 'Started campaign preparation.')
      persist()
      return job
    },
    setPaused(input) {
      if (typeof input.global === 'boolean') db.settings.globalPause = input.global
      if (input.platform) db.settings.platformPause = { ...db.settings.platformPause, [input.platform]: input.paused }
      if (db.settings.globalPause) {
        for (const job of db.jobs) {
          if (job.status === 'queued' || job.status === 'running') job.status = 'paused'
        }
      }
      audit('pause', db.settings.globalPause ? 'Paused all publishing.' : 'Updated pause switches.')
      persist()
    },
    pauseJob(id) {
      const job = db.jobs.find((item) => item.id === id)
      if (!job) throw new StudioError(404, 'Job not found.')
      if (job.status === 'queued' || job.status === 'running') job.status = 'paused'
      persist()
    },
    resumeJob(id) {
      if (db.settings.globalPause) throw new StudioError(409, 'Turn off the global pause before resuming work.')
      const job = db.jobs.find((item) => item.id === id)
      if (!job) throw new StudioError(404, 'Job not found.')
      if (job.tasks.every((item) => isTerminalStatus(item.status))) throw new StudioError(409, 'This job has already finished.')
      job.status = 'queued'
      job.finishedAt = null
      persist()
    },
    cancelJob(id) {
      const job = db.jobs.find((item) => item.id === id)
      if (!job) throw new StudioError(404, 'Job not found.')
      job.status = 'canceled'
      for (const task of job.tasks) {
        if (task.status === 'pending') {
          task.status = 'canceled'
          task.logs.push({ at: now(), message: 'Canceled before it started.' })
        }
      }
      finishJob(job, now())
      audit('cancel', 'Canceled a job.')
      persist()
    },
    retryJob(id) {
      const job = db.jobs.find((item) => item.id === id)
      if (!job) throw new StudioError(404, 'Job not found.')
      let count = 0
      for (const task of job.tasks) {
        if (task.status !== 'failed') continue
        if (task.attempts >= task.maxAttempts) continue
        task.status = 'pending'
        task.nextAttemptAt = null
        task.logs.push({ at: now(), message: 'Manual retry requested with the same idempotency key.' })
        count += 1
      }
      if (count === 0) throw new StudioError(409, 'No failed items can be retried. Permanent errors stop at the retry limit.')
      job.status = 'queued'
      job.finishedAt = null
      persist()
    },
    updateSettings(patch) {
      const body = patch as Partial<StudioSettings>
      if (typeof body.timezone === 'string' && body.timezone.trim()) db.settings.timezone = clip(body.timezone, 80)
      if (body.quietHours) {
        const start = clip(body.quietHours.start, 5)
        const end = clip(body.quietHours.end, 5)
        if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) throw new StudioError(400, 'Quiet hours use HH:MM.')
        db.settings.quietHours = { enabled: Boolean(body.quietHours.enabled), start, end }
      }
      persist()
      return db.settings
    },
    brief(campaignId) {
      const campaign = requireCampaign(campaignId)
      return campaignBriefMarkdown(campaign, db.links.map(clientLink))
    },
    report() {
      const lines = ['# Token Campaign Studio report', '', 'Provider metrics are shown only when a platform returns them. None are invented here.', '']
      for (const campaign of db.campaigns) {
        lines.push(`## ${campaign.name}`, campaign.demo ? 'Demo campaign.' : 'Owner campaign.', '')
        const drafts = db.drafts.filter((draft) => draft.campaignId === campaign.id)
        const posts = db.posts.filter((post) => post.campaignId === campaign.id)
        lines.push(`Drafts: ${drafts.length}`, `Queued or published records: ${posts.length}`, '')
        for (const post of posts) {
          lines.push(`- ${post.platform} ${post.status}${post.providerPostId ? ` · provider id ${post.providerPostId}` : ''}`)
        }
      }
      lines.push('', '## Failures')
      const failed = db.posts.filter((post) => post.status === 'failed')
      if (failed.length === 0) lines.push('No failed posts.')
      for (const post of failed) lines.push(`- ${post.platform}: ${post.errorSummary || 'Failed'}`)
      lines.push('', 'Reach and engagement: not reported by a provider.')
      return lines.join('\n')
    },
    reset(password) {
      if (!db.owner || !checkPassword(password, db.owner)) throw new StudioError(401, 'Password did not match.')
      const owner = db.owner
      rmSync(uploads, { recursive: true, force: true })
      mkdirSync(uploads, { recursive: true })
      db = seedDb(now())
      db.owner = owner
      audit('reset', 'Workspace content was deleted and the reference library was loaded again.')
      persist()
    },
    async connectTelegram() {
      const token = env.TELEGRAM_BOT_TOKEN?.trim()
      if (!token) throw new StudioError(409, 'Integration unavailable. Set TELEGRAM_BOT_TOKEN in the server environment.')
      let me: { id: number; username: string }
      try {
        me = await telegramFor(token).getMe()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Telegram did not confirm the bot.'
        throw new StudioError(502, message)
      }
      db.accounts = db.accounts.filter((account) => account.platform !== 'telegram')
      const account: ServerAccount = {
        id: createId('acct'),
        platform: 'telegram',
        label: me.username ? `@${me.username}` : `Telegram bot ${me.id}`,
        externalId: String(me.id),
        scopes: ['bot-admin-post'],
        status: 'authorized',
        authSource: 'env',
        connectedAt: now(),
        tokenStored: false,
        botUserId: me.id,
      }
      db.accounts.push(account)
      audit('connect', `Connected Telegram bot ${account.label}. The token stays in the server environment.`)
      persist()
      return publicAccount(account)
    },
    disconnect(accountId) {
      const account = db.accounts.find((item) => item.id === accountId)
      if (!account) throw new StudioError(404, 'Account not found.')
      account.status = 'disconnected'
      for (const link of db.links) {
        if (link.platform === account.platform && link.authorizationStatus === 'verified') {
          link.authorizationStatus = 'unverified'
          link.verifiedChatId = null
          link.authorizationEvidence = 'Disconnected. Verify the destination again after reconnecting.'
        }
      }
      audit('disconnect', `Disconnected ${account.label}. Revoke the bot or app token at the provider if you want it invalidated there.`)
      persist()
    },
    async verifyLink(linkId) {
      const link = db.links.find((item) => item.id === linkId)
      if (!link) throw new StudioError(404, 'Link not found.')
      if (link.category !== 'owned' && link.category !== 'partner') {
        throw new StudioError(403, 'Only an owned account or an authorized partner destination can be verified. Research links stay references.')
      }
      if (link.privateInvite || link.kind === 'invite' || link.kind === 'post') {
        throw new StudioError(403, 'Post URLs and invite links cannot be verified as publishing targets.')
      }
      if (link.platform !== 'telegram') throw new StudioError(409, 'Integration unavailable. This platform cannot be verified in this build.')
      const account = db.accounts.find((item) => item.platform === 'telegram' && item.status === 'authorized')
      const token = env.TELEGRAM_BOT_TOKEN?.trim()
      if (!account?.botUserId || !token) throw new StudioError(409, 'Connect the Telegram bot before verifying a chat.')
      if (!link.handle) throw new StudioError(400, 'This record has no public chat handle to verify.')
      try {
        const api = telegramFor(token)
        const chat = await api.getChat(`@${link.handle}`)
        if (chat.username && chat.username.toLowerCase() !== link.handle.toLowerCase()) {
          throw new StudioError(403, 'The chat username did not match this record.')
        }
        const member = await api.getChatMember(String(chat.id), account.botUserId)
        if (!isTelegramAdmin(member.status)) {
          link.authorizationStatus = 'rejected'
          link.verifiedChatId = null
          link.authorizationEvidence = 'The connected bot is not an administrator of this chat.'
          link.updatedAt = now()
          persist()
          throw new StudioError(403, link.authorizationEvidence)
        }
        link.authorizationStatus = 'verified'
        link.verifiedChatId = String(chat.id)
        link.authorizationEvidence = `Connected bot is ${member.status} of this chat.`
        link.lastChecked = now()
        link.checkStatus = 'ok'
        link.checkDetail = 'Verified through the Telegram Bot API. The public URL alone was not treated as permission.'
        link.updatedAt = now()
        audit('verify', `Verified admin access for @${link.handle}.`)
        persist()
        return clientLink(link)
      } catch (error) {
        if (error instanceof StudioError) throw error
        const message = error instanceof Error ? error.message : 'Telegram could not verify this chat.'
        link.authorizationStatus = 'rejected'
        link.updatedAt = now()
        persist()
        throw new StudioError(502, message)
      }
    },
    async pump() {
      if (pumping) return
      pumping = true
      let changed = false
      try {
        const stamp = now()
        for (const job of db.jobs) {
          if (db.settings.globalPause && (job.status === 'queued' || job.status === 'running')) {
            job.status = 'paused'
            changed = true
          }
          if (job.status === 'paused' || job.status === 'canceled' || job.status === 'completed') {
            finishJob(job, stamp)
            continue
          }
          const active = job.tasks.some((item) => item.status === 'running')
          if (active) continue
          const task = job.tasks.find((item) => item.status === 'pending' && (!item.nextAttemptAt || item.nextAttemptAt <= stamp))
          if (!task) {
            finishJob(job, stamp)
            continue
          }
          if (task.platform !== 'local' && db.settings.platformPause[task.platform]) {
            job.status = 'paused'
            changed = true
            continue
          }
          job.status = 'running'
          if (!job.startedAt) job.startedAt = stamp
          if (task.kind === 'publish') await executePublish(task)
          else {
            task.status = 'running'
            executeLocal(job, task)
          }
          finishJob(job, now())
          persist()
          return
        }
        if (changed) persist()
      } finally {
        pumping = false
      }
    },
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let text = ''
  for (let index = start; index < end && index < bytes.length; index += 1) text += String.fromCharCode(bytes[index])
  return text
}

export function assertUpload(bytes: Uint8Array, declaredType: string): { mimeType: string } {
  if (bytes.length === 0 || bytes.length > 8_000_000) throw new StudioError(400, 'Files must be between 1 byte and 8 MB.')
  const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const png = pngHeader.every((value, index) => bytes[index] === value)
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const gif = ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a'
  const webp = ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP'
  const mp4 = bytes.length > 12 && ascii(bytes, 4, 8) === 'ftyp'
  if (png && declaredType === 'image/png') return { mimeType: 'image/png' }
  if (jpg && (declaredType === 'image/jpeg' || declaredType === 'image/jpg')) return { mimeType: 'image/jpeg' }
  if (gif && declaredType === 'image/gif') return { mimeType: 'image/gif' }
  if (webp && declaredType === 'image/webp') return { mimeType: 'image/webp' }
  if (mp4 && declaredType === 'video/mp4') return { mimeType: 'video/mp4' }
  throw new StudioError(400, 'Upload a PNG, JPEG, GIF, WEBP, or MP4 file.')
}
