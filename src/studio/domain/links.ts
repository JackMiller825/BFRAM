import { createId } from './ids'
import { inspectPublicUrl } from './ssrf'
import type {
  LinkCategory,
  LinkKind,
  LinkRecord,
  PlatformId,
  SourceHistoryEntry,
} from './types'

const TRACKING_PARAMS = new Set([
  's',
  'si',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'ref_src',
  'ref_url',
  'igshid',
  'feature',
])

export interface ParsedLink {
  platform: PlatformId
  kind: LinkKind
  original: string
  normalized: string
  handle: string | null
  messageId: string | null
  privateInvite: boolean
  checkStatus: LinkRecord['checkStatus']
  checkDetail: string
}

export interface ImportMeta {
  batch: string
  category: LinkCategory
  tags: string[]
  notes?: string
}

export interface ImportResult {
  links: LinkRecord[]
  added: number
  duplicates: number
  invalid: { line: string; error: string }[]
}

function stripTracking(url: URL): void {
  const kept: [string, string][] = []
  url.searchParams.forEach((value, key) => {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) kept.push([key, value])
  })
  url.search = ''
  for (const [key, value] of kept) url.searchParams.append(key, value)
  url.hash = ''
}

function canonicalHost(hostname: string): { host: string; platform: PlatformId } {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  if (host === 'twitter.com' || host === 'mobile.twitter.com' || host === 'x.com' || host === 'mobile.x.com') {
    return { host: 'x.com', platform: 'x' }
  }
  if (host === 't.me' || host === 'telegram.me') return { host: 't.me', platform: 'telegram' }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') return { host, platform: 'youtube' }
  if (host === 'tiktok.com' || host === 'vm.tiktok.com') return { host: 'tiktok.com', platform: 'tiktok' }
  if (host === 'instagram.com') return { host, platform: 'instagram' }
  if (host === 'reddit.com' || host === 'old.reddit.com') return { host: 'reddit.com', platform: 'reddit' }
  if (host === 'discord.com' || host === 'discord.gg') return { host, platform: 'discord' }
  return { host, platform: 'website' }
}

function trimSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

export function maskPrivateUrl(value: string): string {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if ((host === 't.me' || host === 'telegram.me') && url.pathname.startsWith('/+')) return 'https://t.me/+[private-invite]'
    if (url.pathname.startsWith('/joinchat/')) return 'https://t.me/joinchat/[private-invite]'
  } catch {
    return '[private-invite]'
  }
  return value
}

export function clientLink(link: LinkRecord): LinkRecord {
  if (!link.privateInvite) return link
  return {
    ...link,
    original: maskPrivateUrl(link.original),
    normalized: maskPrivateUrl(link.normalized),
    displayName: 'Private Telegram invite',
    sourceHistory: link.sourceHistory.map((entry) => ({ ...entry, raw: maskPrivateUrl(entry.raw) })),
  }
}

export function parseLinkInput(raw: string): ParsedLink | { error: string } {
  const original = raw.trim()
  if (!original) return { error: 'Empty link.' }
  if (/^(javascript|data|file|vbscript):/i.test(original)) {
    return {
      platform: 'other',
      kind: 'unknown',
      original,
      normalized: original,
      handle: null,
      messageId: null,
      privateInvite: false,
      checkStatus: 'unsupported',
      checkDetail: 'Unsupported URL scheme.',
    }
  }

  let text = original
  if (text.startsWith('@')) {
    const handle = text.slice(1).trim()
    if (!/^[\w]{3,64}$/.test(handle)) return { error: `Could not read the handle ${original}.` }
    return {
      platform: 'telegram',
      kind: 'channel',
      original,
      normalized: `https://t.me/${handle}`,
      handle,
      messageId: null,
      privateInvite: false,
      checkStatus: 'unchecked',
      checkDetail: 'Handle stored as a Telegram reference. A handle is not posting permission.',
    }
  }

  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) {
    if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(text)) text = `https://${text}`
    else return { error: `Could not parse ${original}.` }
  }

  const inspected = inspectPublicUrl(text)
  if (!inspected.ok) {
    return {
      platform: 'other',
      kind: 'unknown',
      original,
      normalized: original,
      handle: null,
      messageId: null,
      privateInvite: false,
      checkStatus: 'unsupported',
      checkDetail: inspected.reason,
    }
  }

  const url = inspected.url
  if (url.protocol === 'http:') url.protocol = 'https:'
  const { host, platform } = canonicalHost(url.hostname)
  url.hostname = host
  stripTracking(url)
  let pathname = trimSlash(url.pathname)
  let kind: LinkKind = platform === 'website' ? 'website' : 'profile'
  let handle: string | null = null
  let messageId: string | null = null
  let privateInvite = false

  if (platform === 'telegram') {
    const parts = pathname.split('/').filter(Boolean)
    if (parts[0]?.startsWith('+') || parts[0] === 'joinchat') {
      privateInvite = true
      kind = 'invite'
      handle = null
    } else if (parts[0] && parts[0] !== 's') {
      handle = parts[0]
      if (parts[1] && /^\d+$/.test(parts[1])) {
        messageId = parts[1]
        kind = 'post'
        pathname = `/${handle}/${messageId}`
      } else {
        kind = 'channel'
        pathname = `/${handle}`
      }
    }
  } else if (platform === 'x') {
    const parts = pathname.split('/').filter(Boolean)
    const reserved = new Set(['intent', 'share', 'home', 'search', 'i'])
    if (parts[0] && !reserved.has(parts[0].toLowerCase())) {
      handle = parts[0].replace(/^@/, '')
      pathname = `/${handle}`
      kind = 'profile'
    }
  } else if (platform === 'youtube') {
    const parts = pathname.split('/').filter(Boolean)
    if (host === 'youtu.be' && parts[0]) {
      kind = 'video'
      pathname = `/${parts[0]}`
    } else if (parts[0]?.startsWith('@')) {
      handle = parts[0].slice(1)
      kind = 'channel'
      pathname = `/@${handle}`
    } else if (parts[0] === 'watch') {
      kind = 'video'
    } else if (parts[0] === 'channel' && parts[1]) {
      handle = parts[1]
      kind = 'channel'
      pathname = `/channel/${handle}`
    }
  } else if (platform === 'reddit') {
    const parts = pathname.split('/').filter(Boolean)
    if (parts[0] === 'r' && parts[1]) {
      handle = parts[1]
      kind = 'channel'
    } else if (parts[0] === 'user' && parts[1]) {
      handle = parts[1]
      kind = 'profile'
    }
  } else if (platform === 'instagram' || platform === 'tiktok') {
    const parts = pathname.split('/').filter(Boolean)
    if (parts[0]) {
      handle = parts[0].replace(/^@/, '')
      kind = 'profile'
      pathname = `/${handle}`
    }
  }

  url.pathname = pathname || '/'
  const normalized = url.toString()
  const checkStatus = privateInvite ? 'skipped' : 'unchecked'
  const checkDetail = privateInvite
    ? 'Invite-only Telegram URL. Kept inside this workspace and never joined or posted to.'
    : platform === 'website'
      ? 'Stored as a reference. This app does not fetch user-supplied websites.'
      : 'Stored as a reference. A public URL is not posting authorization.'

  return {
    platform,
    kind,
    original,
    normalized,
    handle,
    messageId,
    privateInvite,
    checkStatus,
    checkDetail,
  }
}

function nextOrder(links: LinkRecord[]): number {
  let max = 0
  for (const link of links) {
    for (const entry of link.sourceHistory) max = Math.max(max, entry.order)
  }
  return max + 1
}

export function refreshDuplicateFlags(links: LinkRecord[]): LinkRecord[] {
  const groups = new Map<string, Set<string>>()
  for (const link of links) {
    if (!link.handle || link.archived) continue
    const key = `${link.platform}:${link.handle.toLowerCase()}`
    const urls = groups.get(key) ?? new Set<string>()
    urls.add(link.normalized)
    groups.set(key, urls)
  }
  return links.map((link) => {
    if (!link.handle) return { ...link, likelyDuplicate: false, relatedGroup: null }
    const key = `${link.platform}:${link.handle.toLowerCase()}`
    const urls = groups.get(key)
    const likely = Boolean(urls && urls.size > 1)
    return { ...link, likelyDuplicate: likely, relatedGroup: likely ? key : null }
  })
}

export function importLinkText(
  existing: LinkRecord[],
  text: string,
  meta: ImportMeta,
  now: string,
  idFor: (prefix: string) => string = createId,
): ImportResult {
  const links = existing.map((link) => ({ ...link, sourceHistory: [...link.sourceHistory], tags: [...link.tags] }))
  const byKey = new Map(links.map((link) => [link.normalized, link]))
  let added = 0
  let duplicates = 0
  const invalid: { line: string; error: string }[] = []
  let order = nextOrder(links)

  for (const line of text.split(/\r?\n/)) {
    const raw = line.trim()
    if (!raw || raw.startsWith('#')) continue
    const parsed = parseLinkInput(raw)
    if ('error' in parsed) {
      invalid.push({ line: raw, error: parsed.error })
      continue
    }
    const history: SourceHistoryEntry = { order, raw: parsed.original, batch: meta.batch }
    order += 1
    const current = byKey.get(parsed.normalized)
    if (current) {
      current.duplicateCount += 1
      current.sourceHistory.push(history)
      current.updatedAt = now
      duplicates += 1
      continue
    }
    const tags = [...meta.tags]
    if (parsed.privateInvite && !tags.includes('private-invite')) tags.push('private-invite')
    const record: LinkRecord = {
      id: idFor('link'),
      platform: parsed.platform,
      kind: parsed.kind,
      original: parsed.original,
      normalized: parsed.normalized,
      handle: parsed.handle,
      messageId: parsed.messageId,
      displayName: parsed.privateInvite ? 'Private Telegram invite' : parsed.handle ? `@${parsed.handle}` : parsed.normalized,
      category: meta.category,
      authorizationStatus: 'unverified',
      authorizationEvidence: '',
      verifiedChatId: null,
      budgetApproved: false,
      budgetNote: '',
      contactNotes: '',
      tags,
      notes: meta.notes ?? '',
      lastChecked: null,
      checkStatus: parsed.checkStatus,
      checkDetail: parsed.checkDetail,
      duplicateCount: 1,
      sourceHistory: [history],
      relatedGroup: null,
      likelyDuplicate: false,
      archived: false,
      privateInvite: parsed.privateInvite,
      createdAt: now,
      updatedAt: now,
    }
    links.push(record)
    byKey.set(record.normalized, record)
    added += 1
  }

  return { links: refreshDuplicateFlags(links), added, duplicates, invalid }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else quoted = false
      } else cell += char
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    if (char !== '\r') cell += char
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((entry) => entry.some((value) => value.trim() !== ''))
}

export function importCsv(
  existing: LinkRecord[],
  csv: string,
  now: string,
  idFor?: (prefix: string) => string,
): ImportResult {
  const rows = parseCsv(csv)
  if (rows.length === 0) return { links: existing, added: 0, duplicates: 0, invalid: [] }
  const header = rows[0].map((cell) => cell.trim().toLowerCase())
  const urlIndex = header.indexOf('url')
  if (urlIndex === -1) {
    return importLinkText(existing, csv, { batch: 'CSV import', category: 'research', tags: ['csv'] }, now, idFor)
  }
  const categoryIndex = header.indexOf('category')
  const nameIndex = header.indexOf('displayname')
  const tagsIndex = header.indexOf('tags')
  const notesIndex = header.indexOf('notes')
  let links = existing
  let added = 0
  let duplicates = 0
  const invalid: { line: string; error: string }[] = []
  for (const row of rows.slice(1)) {
    const url = row[urlIndex]?.trim() ?? ''
    if (!url) continue
    const requested = (categoryIndex >= 0 ? row[categoryIndex] : '')?.trim().toLowerCase()
    const allowed = new Set<string>(['owned', 'partner', 'listing', 'ad_network', 'creator', 'research', 'prospect'])
    const category: LinkCategory = allowed.has(requested) ? (requested as LinkCategory) : 'research'
    const result = importLinkText(
      links,
      url,
      {
        batch: 'CSV import',
        category,
        tags: (tagsIndex >= 0 ? row[tagsIndex] : '')
          .split('|')
          .map((tag) => tag.trim())
          .filter(Boolean),
        notes: notesIndex >= 0 ? row[notesIndex]?.trim() : undefined,
      },
      now,
      idFor,
    )
    links = result.links
    added += result.added
    duplicates += result.duplicates
    invalid.push(...result.invalid)
    if (nameIndex >= 0 && row[nameIndex]?.trim() && result.added === 1) {
      const parsed = parseLinkInput(url)
      if (!('error' in parsed)) {
        const created = links.find((link) => link.normalized === parsed.normalized)
        if (created && created.duplicateCount === 1) created.displayName = row[nameIndex].trim()
      }
    }
  }
  return { links, added, duplicates, invalid }
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

export function linksToCsv(links: LinkRecord[], includeInvites: boolean): string {
  const header = ['url', 'platform', 'category', 'displayName', 'tags', 'notes', 'duplicateCount', 'authorizationStatus']
  const lines = [header.join(',')]
  for (const link of links) {
    const url = link.privateInvite && !includeInvites ? maskPrivateUrl(link.original) : link.original
    lines.push(
      [
        url,
        link.platform,
        link.category,
        link.displayName,
        link.tags.join('|'),
        link.notes,
        String(link.duplicateCount),
        link.authorizationStatus,
      ]
        .map(csvCell)
        .join(','),
    )
  }
  return lines.join('\n')
}

export function linkPublishBlock(link: LinkRecord): string | null {
  if (link.archived) return 'Archived records stay out of the publishing queue.'
  if (link.privateInvite) return 'Invite links are private references. This app will not join or post to them.'
  if (link.kind === 'post') return 'A post URL is a reference to someone else’s message, not permission to publish.'
  if (link.category === 'research') return 'Research and reference records are not posting authorization.'
  if (link.category === 'prospect' || link.category === 'creator') {
    return 'A prospect or creator lead is not authorization. Paid placement needs owner review, budget approval, and a verified destination.'
  }
  if (link.category === 'listing' || link.category === 'ad_network') {
    return 'Listing forms and ad networks are opportunities to review, not destinations this app can post to.'
  }
  if (link.authorizationStatus !== 'verified' || !link.verifiedChatId) {
    return 'Publishing requires verified admin or OAuth access on a connected account. A URL alone is not enough.'
  }
  if (link.category === 'partner' && !link.budgetApproved) {
    return 'Paid placements need explicit budget approval before they can be queued.'
  }
  return null
}
