import { adapterFor } from '../domain/adapters'
import type { Asset, LinkCategory, PlatformId, TemplateId } from '../domain/types'
import { assertUpload, createStore, StudioError, type StudioStore } from '../server/store'

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
const CATEGORIES = new Set<LinkCategory>(['owned', 'partner', 'research', 'prospect'])
const ASSET_KINDS = new Set<Asset['kind']>(['image', 'logo', 'banner', 'video', 'sticker_pack', 'emoji_pack', 'other'])
const PLATFORMS = new Set(['telegram', 'x', 'youtube', 'tiktok', 'instagram', 'reddit', 'discord', 'website'])

let installed = false

function platformOf(value: unknown): PlatformId {
  if (!PLATFORMS.has(String(value))) throw new StudioError(400, 'Unknown platform.')
  return String(value) as PlatformId
}

function reply(status: number, body: unknown, contentType?: string): Response {
  const text = typeof body === 'string'
  return new Response(text ? body : JSON.stringify(body), {
    status,
    headers: {
      'content-type': contentType ?? (text ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8'),
      'cache-control': 'no-store',
    },
  })
}

async function readJson(init?: RequestInit): Promise<Record<string, unknown>> {
  if (typeof init?.body !== 'string' || init.body.length === 0) return {}
  try {
    const parsed = JSON.parse(init.body) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new StudioError(400, 'JSON body must be an object.')
    return parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof StudioError) throw error
    throw new StudioError(400, 'JSON body was not valid.')
  }
}

async function readBytes(init?: RequestInit): Promise<Uint8Array> {
  const body = init?.body
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer())
  if (body instanceof ArrayBuffer) return new Uint8Array(body)
  if (body instanceof Uint8Array) return body
  return new Uint8Array()
}

async function route(store: StudioStore, session: { id: string }, url: URL, init?: RequestInit): Promise<Response> {
  const path = url.pathname
  const method = (init?.method ?? 'GET').toUpperCase()
  if (method === 'GET' && path === '/api/health') return reply(200, { ok: true, service: 'token-campaign-studio', mode: 'browser-preview' })
  if (method === 'GET' && path === '/api/session') {
    return reply(200, { needsSetup: store.needsSetup(), authenticated: store.hasSession(session.id) })
  }
  if (method === 'POST' && path === '/api/setup') {
    session.id = store.setup(String((await readJson(init)).password ?? ''))
    return reply(200, { workspace: store.snapshot() })
  }
  if (method === 'POST' && path === '/api/login') {
    session.id = store.login(String((await readJson(init)).password ?? ''))
    return reply(200, { workspace: store.snapshot() })
  }
  if (!store.hasSession(session.id)) return reply(401, { error: 'Sign in to the campaign workspace.' })
  if (method === 'POST' && path === '/api/logout') {
    store.logout(session.id)
    session.id = ''
    return reply(200, { ok: true })
  }
  if (method === 'GET' && path === '/api/workspace') return reply(200, { workspace: store.snapshot() })
  if (method === 'GET' && path === '/api/links.csv') {
    return reply(200, store.linksCsv(false), 'text/csv; charset=utf-8')
  }
  if (method === 'GET' && path === '/api/report') return reply(200, store.report(), 'text/markdown; charset=utf-8')
  const brief = /^\/api\/campaigns\/([^/]+)\/brief$/.exec(path)
  if (method === 'GET' && brief) return reply(200, store.brief(decodeURIComponent(brief[1])), 'text/markdown; charset=utf-8')
  const assetGet = /^\/api\/campaigns\/([^/]+)\/assets\/([^/]+)$/.exec(path)
  if (method === 'GET' && assetGet) {
    const file = store.readAsset(decodeURIComponent(assetGet[1]), decodeURIComponent(assetGet[2]))
    if (!file) return reply(404, { error: 'Asset not found.' })
    return new Response(new Blob([file.bytes.slice()]), { status: 200, headers: { 'content-type': file.asset.mimeType, 'cache-control': 'no-store' } })
  }
  if (method === 'POST' && path === '/api/campaigns') {
    store.saveCampaign(await readJson(init))
    return reply(200, { workspace: store.snapshot() })
  }
  const campaignPut = /^\/api\/campaigns\/([^/]+)$/.exec(path)
  if (campaignPut && method === 'PUT') {
    store.saveCampaign({ ...(await readJson(init)), id: decodeURIComponent(campaignPut[1]) })
    return reply(200, { workspace: store.snapshot() })
  }
  if (campaignPut && method === 'DELETE') {
    store.deleteCampaign(decodeURIComponent(campaignPut[1]))
    return reply(200, { workspace: store.snapshot() })
  }
  const prepare = /^\/api\/campaigns\/([^/]+)\/prepare$/.exec(path)
  if (method === 'POST' && prepare) {
    store.prepare(decodeURIComponent(prepare[1]))
    return reply(200, { workspace: store.snapshot() })
  }
  const drafts = /^\/api\/campaigns\/([^/]+)\/drafts$/.exec(path)
  if (method === 'POST' && drafts) {
    const body = await readJson(init)
    const template = String(body.template ?? '')
    if (!TEMPLATES.has(template as TemplateId)) throw new StudioError(400, 'Unknown template.')
    store.generateDrafts(decodeURIComponent(drafts[1]), template as TemplateId, platformOf(body.platform))
    return reply(200, { workspace: store.snapshot() })
  }
  const assets = /^\/api\/campaigns\/([^/]+)\/assets$/.exec(path)
  if (method === 'POST' && assets) {
    const body = await readJson(init)
    const kind = String(body.kind ?? 'other')
    if (!ASSET_KINDS.has(kind as Asset['kind'])) throw new StudioError(400, 'Unknown asset type.')
    store.addExternalAsset(decodeURIComponent(assets[1]), {
      kind: kind as Asset['kind'],
      fileName: String(body.fileName ?? ''),
      externalUrl: String(body.externalUrl ?? ''),
      altText: String(body.altText ?? ''),
    })
    return reply(200, { workspace: store.snapshot() })
  }
  const upload = /^\/api\/campaigns\/([^/]+)\/uploads$/.exec(path)
  if (method === 'POST' && upload) {
    const headers = new Headers(init?.headers)
    const bytes = await readBytes(init)
    const checked = assertUpload(bytes, (headers.get('content-type') ?? '').split(';')[0])
    const kindHeader = headers.get('x-asset-kind') ?? 'image'
    if (!ASSET_KINDS.has(kindHeader as Asset['kind'])) throw new StudioError(400, 'Unknown asset type.')
    store.addFileAsset(decodeURIComponent(upload[1]), {
      kind: kindHeader as Asset['kind'],
      fileName: headers.get('x-file-name') ?? 'upload',
      mimeType: checked.mimeType,
      bytes,
      altText: headers.get('x-alt-text') ?? '',
    })
    return reply(200, { workspace: store.snapshot() })
  }
  if (assetGet && method === 'DELETE') {
    store.deleteAsset(decodeURIComponent(assetGet[1]), decodeURIComponent(assetGet[2]))
    return reply(200, { workspace: store.snapshot() })
  }
  if (method === 'POST' && path === '/api/links/import') {
    const body = await readJson(init)
    const category = String(body.category ?? 'research')
    if (!CATEGORIES.has(category as LinkCategory)) throw new StudioError(400, 'Unknown link category.')
    const result = store.importText(String(body.text ?? ''), category as LinkCategory, Array.isArray(body.tags) ? body.tags.map(String) : [])
    return reply(200, { ...result, workspace: store.snapshot() })
  }
  if (method === 'POST' && path === '/api/links/import-csv') {
    const result = store.importCsvText(String((await readJson(init)).csv ?? ''))
    return reply(200, { ...result, workspace: store.snapshot() })
  }
  const link = /^\/api\/links\/([^/]+)$/.exec(path)
  if (link && method === 'PATCH') {
    store.updateLink(decodeURIComponent(link[1]), await readJson(init))
    return reply(200, { workspace: store.snapshot() })
  }
  const archive = /^\/api\/links\/([^/]+)\/archive$/.exec(path)
  if (archive && method === 'POST') {
    store.archiveLink(decodeURIComponent(archive[1]), Boolean((await readJson(init)).archived))
    return reply(200, { workspace: store.snapshot() })
  }
  const reveal = /^\/api\/links\/([^/]+)\/reveal$/.exec(path)
  if (reveal && method === 'POST') return reply(200, { url: store.revealLink(decodeURIComponent(reveal[1])) })
  const verify = /^\/api\/links\/([^/]+)\/verify$/.exec(path)
  if (verify && method === 'POST') {
    await store.verifyLink(decodeURIComponent(verify[1]))
    return reply(200, { workspace: store.snapshot() })
  }
  const draft = /^\/api\/drafts\/([^/]+)$/.exec(path)
  if (draft && method === 'PATCH') {
    store.updateDraft(decodeURIComponent(draft[1]), await readJson(init))
    return reply(200, { workspace: store.snapshot() })
  }
  const approve = /^\/api\/drafts\/([^/]+)\/(approve|reject)$/.exec(path)
  if (approve && method === 'POST') {
    store.decideDraft(decodeURIComponent(approve[1]), approve[2] === 'approve' ? 'approved' : 'rejected', String((await readJson(init)).note ?? ''))
    return reply(200, { workspace: store.snapshot() })
  }
  if (method === 'POST' && path === '/api/queue') {
    const body = await readJson(init)
    store.schedule({ draftId: String(body.draftId ?? ''), linkId: String(body.linkId ?? ''), scheduledFor: String(body.scheduledFor ?? '') })
    return reply(200, { workspace: store.snapshot() })
  }
  const postCancel = /^\/api\/posts\/([^/]+)\/cancel$/.exec(path)
  if (postCancel && method === 'POST') {
    store.cancelPost(decodeURIComponent(postCancel[1]))
    return reply(200, { workspace: store.snapshot() })
  }
  const jobAction = /^\/api\/jobs\/([^/]+)\/(pause|resume|cancel|retry)$/.exec(path)
  if (jobAction && method === 'POST') {
    const id = decodeURIComponent(jobAction[1])
    if (jobAction[2] === 'pause') store.pauseJob(id)
    if (jobAction[2] === 'resume') store.resumeJob(id)
    if (jobAction[2] === 'cancel') store.cancelJob(id)
    if (jobAction[2] === 'retry') store.retryJob(id)
    return reply(200, { workspace: store.snapshot() })
  }
  if (method === 'POST' && path === '/api/pause') {
    const body = await readJson(init)
    store.setPaused({
      global: typeof body.global === 'boolean' ? body.global : undefined,
      platform: body.platform ? platformOf(body.platform) : undefined,
      paused: Boolean(body.paused),
    })
    return reply(200, { workspace: store.snapshot() })
  }
  if (method === 'PATCH' && path === '/api/settings') {
    store.updateSettings(await readJson(init))
    return reply(200, { workspace: store.snapshot() })
  }
  if (method === 'POST' && path === '/api/reset') {
    store.reset(String((await readJson(init)).password ?? ''))
    return reply(200, { workspace: store.snapshot() })
  }
  if (method === 'POST' && path === '/api/integrations/telegram/connect') {
    await store.connectTelegram()
    return reply(200, { workspace: store.snapshot() })
  }
  const disconnect = /^\/api\/integrations\/([^/]+)\/disconnect$/.exec(path)
  if (disconnect && method === 'POST') {
    store.disconnect(decodeURIComponent(disconnect[1]))
    return reply(200, { workspace: store.snapshot() })
  }
  if (method === 'POST' && /^\/api\/integrations\/[^/]+\/connect$/.test(path)) {
    const adapter = adapterFor(platformOf(path.split('/')[3]))
    return reply(409, {
      error: `Integration unavailable. ${adapter.name} stays export-only in this build. Drafts are ready to copy, and nothing is marked published.`,
    })
  }
  return reply(404, { error: 'Unknown API route.' })
}

export function installPagesApi(): void {
  if (installed) return
  installed = true
  const store = createStore('pages-workspace', { env: {} })
  const session = { id: '' }
  window.setInterval(() => {
    void store.pump()
  }, 400)
  const nativeFetch = window.fetch.bind(window)
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const parsed = new URL(raw, window.location.origin)
    if (!parsed.pathname.startsWith('/api/')) return nativeFetch(input, init)
    try {
      return await route(store, session, parsed, init)
    } catch (error) {
      const status = error instanceof StudioError ? error.status : 500
      const message = error instanceof StudioError ? error.message : 'The campaign preview hit an unexpected error.'
      return reply(status, { error: message })
    }
  }) as typeof window.fetch

  class PagesEventSource extends EventTarget {
    private stop: () => void = () => undefined

    constructor(url: string) {
      super()
      if (!url.includes('/api/jobs/stream')) return
      const write = () => {
        this.dispatchEvent(new MessageEvent('progress', { data: JSON.stringify({ jobs: store.snapshot().jobs }) }))
      }
      write()
      const unsubscribe = store.onChange(write)
      this.stop = () => unsubscribe()
    }

    close(): void {
      this.stop()
    }
  }
  window.EventSource = PagesEventSource as unknown as typeof EventSource
}
