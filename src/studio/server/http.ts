import type { IncomingMessage, ServerResponse } from 'node:http'
import { adapterFor } from '../domain/adapters'
import type { Asset, LinkCategory, PlatformId, TemplateId } from '../domain/types'
import { assertUpload, StudioError, type StudioStore } from './store'

const TEMPLATES = new Set<TemplateId>([
  'launch',
  'story',
  'community',
  'video_script',
  'telegram',
  'x_post',
  'x_thread',
  'youtube',
  'tiktok',
  'faq',
  'follow_up',
])

const CATEGORIES = new Set<LinkCategory>(['owned', 'partner', 'listing', 'ad_network', 'creator', 'research', 'prospect'])
const ASSET_KINDS = new Set<Asset['kind']>(['image', 'logo', 'banner', 'video', 'sticker_pack', 'emoji_pack', 'other'])

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  const type = typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8'
  res.writeHead(status, {
    'content-type': headers['content-type'] ?? type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...headers,
  })
  res.end(payload)
}

function cookieValue(header: string | undefined, name: string): string {
  if (!header) return ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return ''
}

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limit) throw new StudioError(413, 'Request is too large.')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readBody(req, 1_000_000)
  if (raw.length === 0) return {}
  try {
    const parsed = JSON.parse(raw.toString('utf8')) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new StudioError(400, 'JSON body must be an object.')
    return parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof StudioError) throw error
    throw new StudioError(400, 'JSON body was not valid.')
  }
}

function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  const host = req.headers.host
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function platformOf(value: unknown): PlatformId {
  const platforms = new Set(['telegram', 'x', 'youtube', 'tiktok', 'instagram', 'reddit', 'discord', 'website'])
  if (!platforms.has(String(value))) throw new StudioError(400, 'Unknown platform.')
  return String(value) as PlatformId
}

export function createHandler(store: StudioStore) {
  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const path = url.pathname
      const method = req.method ?? 'GET'
      if (method === 'GET' && path === '/api/health') {
        send(res, 200, { ok: true, service: 'token-campaign-studio' })
        return
      }
      if (method === 'GET' && path === '/api/session') {
        const session = cookieValue(req.headers.cookie, 'studio_session')
        send(res, 200, { needsSetup: store.needsSetup(), authenticated: store.hasSession(session) })
        return
      }
      if (method !== 'GET' && method !== 'HEAD' && !sameOrigin(req)) {
        send(res, 403, { error: 'The request origin was rejected.' })
        return
      }
      if (method === 'GET' && path === '/api/workspace') {
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (method === 'GET' && path === '/api/jobs/stream') {
        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-store',
          connection: 'keep-alive',
          'x-content-type-options': 'nosniff',
        })
        const writeJobs = () => {
          res.write(`event: progress\ndata: ${JSON.stringify({ jobs: store.snapshot().jobs })}\n\n`)
        }
        writeJobs()
        const stop = store.onChange(writeJobs)
        const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000)
        req.on('close', () => {
          clearInterval(heartbeat)
          stop()
        })
        return
      }
      if (method === 'GET' && path === '/api/links.csv') {
        send(res, 200, store.linksCsv(url.searchParams.get('includeInvites') === '1'), {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="link-library.csv"',
        })
        return
      }
      if (method === 'GET' && path === '/api/report') {
        send(res, 200, store.report(), {
          'content-type': 'text/markdown; charset=utf-8',
          'content-disposition': 'attachment; filename="campaign-report.md"',
        })
        return
      }
      const brief = /^\/api\/campaigns\/([^/]+)\/brief$/.exec(path)
      if (method === 'GET' && brief) {
        send(res, 200, store.brief(decodeURIComponent(brief[1])), {
          'content-type': 'text/markdown; charset=utf-8',
          'content-disposition': 'attachment; filename="campaign-brief.md"',
        })
        return
      }
      const assetGet = /^\/api\/campaigns\/([^/]+)\/assets\/([^/]+)$/.exec(path)
      if (method === 'GET' && assetGet) {
        const file = store.readAsset(decodeURIComponent(assetGet[1]), decodeURIComponent(assetGet[2]))
        if (!file) {
          send(res, 404, { error: 'Asset not found.' })
          return
        }
        res.writeHead(200, {
          'content-type': file.asset.mimeType,
          'cache-control': 'private, no-store',
          'x-content-type-options': 'nosniff',
          'content-disposition': `inline; filename="${encodeURIComponent(file.asset.fileName)}"`,
        })
        res.end(file.bytes)
        return
      }
      if (method === 'POST' && path === '/api/campaigns') {
        store.saveCampaign(await readJson(req))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const campaignPut = /^\/api\/campaigns\/([^/]+)$/.exec(path)
      if (campaignPut && method === 'PUT') {
        store.saveCampaign({ ...(await readJson(req)), id: decodeURIComponent(campaignPut[1]) })
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (campaignPut && method === 'DELETE') {
        store.deleteCampaign(decodeURIComponent(campaignPut[1]))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const prepare = /^\/api\/campaigns\/([^/]+)\/prepare$/.exec(path)
      if (method === 'POST' && prepare) {
        store.prepare(decodeURIComponent(prepare[1]))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const drafts = /^\/api\/campaigns\/([^/]+)\/drafts$/.exec(path)
      if (method === 'POST' && drafts) {
        const body = await readJson(req)
        const template = String(body.template ?? '')
        if (!TEMPLATES.has(template as TemplateId)) throw new StudioError(400, 'Unknown template.')
        store.generateDrafts(decodeURIComponent(drafts[1]), template as TemplateId, platformOf(body.platform))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const assets = /^\/api\/campaigns\/([^/]+)\/assets$/.exec(path)
      if (method === 'POST' && assets) {
        const body = await readJson(req)
        const kind = String(body.kind ?? 'other')
        if (!ASSET_KINDS.has(kind as Asset['kind'])) throw new StudioError(400, 'Unknown asset type.')
        store.addExternalAsset(decodeURIComponent(assets[1]), {
          kind: kind as Asset['kind'],
          fileName: String(body.fileName ?? ''),
          externalUrl: String(body.externalUrl ?? ''),
          altText: String(body.altText ?? ''),
        })
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const upload = /^\/api\/campaigns\/([^/]+)\/uploads$/.exec(path)
      if (method === 'POST' && upload) {
        const bytes = await readBody(req, 8_000_000)
        const declared = String(req.headers['content-type'] ?? '').split(';')[0]
        const checked = assertUpload(bytes, declared)
        const kindHeader = String(req.headers['x-asset-kind'] ?? 'image')
        if (!ASSET_KINDS.has(kindHeader as Asset['kind'])) throw new StudioError(400, 'Unknown asset type.')
        store.addFileAsset(decodeURIComponent(upload[1]), {
          kind: kindHeader as Asset['kind'],
          fileName: String(req.headers['x-file-name'] ?? 'upload'),
          mimeType: checked.mimeType,
          bytes,
          altText: String(req.headers['x-alt-text'] ?? ''),
        })
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (assetGet && method === 'DELETE') {
        store.deleteAsset(decodeURIComponent(assetGet[1]), decodeURIComponent(assetGet[2]))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (method === 'POST' && path === '/api/links/import') {
        const body = await readJson(req)
        const category = String(body.category ?? 'research')
        if (!CATEGORIES.has(category as LinkCategory)) throw new StudioError(400, 'Unknown link category.')
        const result = store.importText(String(body.text ?? ''), category as LinkCategory, Array.isArray(body.tags) ? body.tags.map(String) : [])
        send(res, 200, { ...result, workspace: store.snapshot() })
        return
      }
      if (method === 'POST' && path === '/api/links/import-csv') {
        const body = await readJson(req)
        const result = store.importCsvText(String(body.csv ?? ''))
        send(res, 200, { ...result, workspace: store.snapshot() })
        return
      }
      const link = /^\/api\/links\/([^/]+)$/.exec(path)
      if (link && method === 'PATCH') {
        store.updateLink(decodeURIComponent(link[1]), await readJson(req))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const archive = /^\/api\/links\/([^/]+)\/archive$/.exec(path)
      if (archive && method === 'POST') {
        const body = await readJson(req)
        store.archiveLink(decodeURIComponent(archive[1]), Boolean(body.archived))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const reveal = /^\/api\/links\/([^/]+)\/reveal$/.exec(path)
      if (reveal && method === 'POST') {
        send(res, 200, { url: store.revealLink(decodeURIComponent(reveal[1])) })
        return
      }
      const verify = /^\/api\/links\/([^/]+)\/verify$/.exec(path)
      if (verify && method === 'POST') {
        await store.verifyLink(decodeURIComponent(verify[1]))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const draft = /^\/api\/drafts\/([^/]+)$/.exec(path)
      if (draft && method === 'PATCH') {
        store.updateDraft(decodeURIComponent(draft[1]), await readJson(req))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const approve = /^\/api\/drafts\/([^/]+)\/(approve|reject)$/.exec(path)
      if (approve && method === 'POST') {
        const body = await readJson(req)
        store.decideDraft(decodeURIComponent(approve[1]), approve[2] === 'approve' ? 'approved' : 'rejected', String(body.note ?? ''))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (method === 'POST' && path === '/api/queue') {
        const body = await readJson(req)
        store.schedule({
          draftId: String(body.draftId ?? ''),
          linkId: String(body.linkId ?? ''),
          scheduledFor: String(body.scheduledFor ?? ''),
        })
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const postCancel = /^\/api\/posts\/([^/]+)\/cancel$/.exec(path)
      if (postCancel && method === 'POST') {
        store.cancelPost(decodeURIComponent(postCancel[1]))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const jobAction = /^\/api\/jobs\/([^/]+)\/(pause|resume|cancel|retry)$/.exec(path)
      if (jobAction && method === 'POST') {
        const id = decodeURIComponent(jobAction[1])
        if (jobAction[2] === 'pause') store.pauseJob(id)
        if (jobAction[2] === 'resume') store.resumeJob(id)
        if (jobAction[2] === 'cancel') store.cancelJob(id)
        if (jobAction[2] === 'retry') store.retryJob(id)
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (method === 'POST' && path === '/api/pause') {
        const body = await readJson(req)
        store.setPaused({
          global: typeof body.global === 'boolean' ? body.global : undefined,
          platform: body.platform ? platformOf(body.platform) : undefined,
          paused: Boolean(body.paused),
        })
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (method === 'PATCH' && path === '/api/settings') {
        store.updateSettings(await readJson(req))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (method === 'POST' && path === '/api/reset') {
        const body = await readJson(req)
        store.reset(String(body.password ?? ''))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const opportunity = /^\/api\/opportunities\/([^/]+)$/.exec(path)
      if (opportunity && method === 'PATCH') {
        store.updateOpportunity(decodeURIComponent(opportunity[1]), await readJson(req))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (method === 'POST' && path === '/api/integrations/telegram/connect') {
        await store.connectTelegram()
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      const disconnect = /^\/api\/integrations\/([^/]+)\/disconnect$/.exec(path)
      if (disconnect && method === 'POST') {
        store.disconnect(decodeURIComponent(disconnect[1]))
        send(res, 200, { workspace: store.snapshot() })
        return
      }
      if (method === 'POST' && /^\/api\/integrations\/[^/]+\/connect$/.test(path)) {
        const name = path.split('/')[3]
        const adapter = adapterFor(platformOf(name))
        send(res, 409, {
          error: `Integration unavailable. ${adapter.name} stays export-only in this build. Drafts are ready to copy, and nothing is marked published.`,
        })
        return
      }
      send(res, 404, { error: 'Unknown API route.' })
    } catch (error) {
      const status = error instanceof StudioError ? error.status : 500
      const message = error instanceof StudioError ? error.message : 'The campaign server hit an unexpected error.'
      if (!res.headersSent) send(res, status, { error: message })
    }
  }
}
