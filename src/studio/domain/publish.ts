import { scanClaims } from './claims'
import { linkPublishBlock } from './links'
import type {
  ConnectedAccount,
  Draft,
  LinkRecord,
  PlatformId,
  ProviderResult,
  QuietHours,
  ScheduledPost,
  StudioSettings,
} from './types'

export interface PublishGateInput {
  link: LinkRecord | null
  account: ConnectedAccount | null
  draft: Pick<Draft, 'status' | 'body' | 'title' | 'disclosure' | 'sponsored'> | null
  adapterCanPublish: boolean
  credentialsConfigured: boolean
  settings: StudioSettings
  scheduledFor: string
  timezone: string
  existingPosts: Pick<ScheduledPost, 'contentHash' | 'status' | 'platform' | 'scheduledFor' | 'timezone'>[]
  contentHash: string
  platformLimit: number | null
  budgetApproved: boolean
}

export function evaluatePublishTarget(input: PublishGateInput): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (!input.draft) reasons.push('Choose an approved draft.')
  else if (input.draft.status !== 'approved') reasons.push('Every post needs manual approval before it can be queued.')
  if (input.draft) {
    const issues = scanClaims(`${input.draft.title}\n${input.draft.body}\n${input.draft.disclosure}`)
    if (issues.length > 0) reasons.push('Unsupported claims are still in the draft. Correct or remove them before publishing.')
  }
  if (input.draft?.sponsored && input.draft.disclosure.trim().length < 8) {
    reasons.push('Sponsored posts need a clear disclosure before they can be queued.')
  }
  if (!input.link) reasons.push('Choose a destination.')
  else {
    const block = linkPublishBlock(input.link)
    if (block) reasons.push(block)
    if (input.link.category === 'partner' && !input.budgetApproved) {
      reasons.push('Paid placements need explicit budget approval and a sponsorship disclosure.')
    }
    if (input.link.category === 'partner' && input.draft && input.draft.disclosure.trim().length < 8) {
      reasons.push('Partner placements must show a sponsorship disclosure.')
    }
  }
  if (!input.account || input.account.status !== 'authorized') {
    reasons.push('Connect an authorized account for this platform. A public profile link is not a connection.')
  } else if (input.link && input.account.platform !== input.link.platform) {
    reasons.push('The connected account is for a different platform.')
  }
  if (!input.credentialsConfigured || !input.adapterCanPublish) {
    reasons.push('Integration unavailable. The draft stays ready to copy until the provider confirms a connection.')
  }
  if (input.settings.globalPause) reasons.push('Publishing is paused.')
  if (input.link && input.settings.platformPause[input.link.platform]) reasons.push('This platform is paused.')
  if (input.existingPosts.some((post) => post.contentHash === input.contentHash && ['scheduled', 'publishing', 'published'].includes(post.status))) {
    reasons.push('An identical post is already queued or published.')
  }
  if (isQuiet(input.scheduledFor, input.timezone, input.settings.quietHours)) {
    reasons.push('That time falls in quiet hours. Pick another time.')
  }
  if (input.link && input.platformLimit !== null) {
    const used = countPlatformDay(input.existingPosts, input.link.platform, input.scheduledFor, input.timezone)
    if (used >= input.platformLimit) reasons.push(`The daily cap for this platform is ${input.platformLimit}.`)
  }
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)] }
}

export function contentHash(text: string): string {
  const norm = text.trim().replace(/\s+/g, ' ').toLowerCase()
  let hash = 5381
  for (let i = 0; i < norm.length; i += 1) hash = (hash * 33) ^ norm.charCodeAt(i)
  return (hash >>> 0).toString(16)
}

export function classifyProviderError(code: string): 'transient' | 'permanent' {
  if (['timeout', 'rate_limited', 'server_error', 'network'].includes(code)) return 'transient'
  return 'permanent'
}

export function decideAutoRetry(task: { attempts: number; maxAttempts: number; errorClass: 'transient' | 'permanent' | null }): 'retry' | 'stop' {
  if (task.errorClass !== 'transient') return 'stop'
  if (task.attempts >= task.maxAttempts) return 'stop'
  return 'retry'
}

export function retryBackoffMs(attempts: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, attempts - 1))
}

export function lookupConfirmedResult(
  store: Record<string, ProviderResult>,
  key: string,
): ProviderResult | null {
  const found = store[key]
  if (found?.confirmed && found.providerPostId) return found
  return null
}

export async function runPublishingAttempt(args: {
  key: string
  store: Record<string, ProviderResult>
  attempt: () => Promise<ProviderResult>
}): Promise<{ result: ProviderResult; replayed: boolean }> {
  const existing = lookupConfirmedResult(args.store, args.key)
  if (existing) return { result: existing, replayed: true }
  const result = await args.attempt()
  if (result.confirmed && result.providerPostId) args.store[args.key] = result
  return { result, replayed: false }
}

function minutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

export function zonedParts(iso: string, timeZone: string): { year: number; month: number; day: number; minutes: number } | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value)
    return { year: read('year'), month: read('month'), day: read('day'), minutes: read('hour') * 60 + read('minute') }
  } catch {
    return null
  }
}

export function isQuiet(iso: string, timeZone: string, quiet: QuietHours): boolean {
  if (!quiet.enabled) return false
  const start = minutes(quiet.start)
  const end = minutes(quiet.end)
  const zoned = zonedParts(iso, timeZone)
  if (start === null || end === null || !zoned || start === end) return false
  const current = zoned.minutes
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}

export function countPlatformDay(
  posts: Pick<ScheduledPost, 'platform' | 'status' | 'scheduledFor' | 'timezone'>[],
  platform: PlatformId,
  iso: string,
  timeZone: string,
): number {
  const target = zonedParts(iso, timeZone)
  if (!target) return 0
  return posts.filter((post) => {
    if (post.platform !== platform) return false
    if (!['scheduled', 'publishing', 'published'].includes(post.status)) return false
    const parts = zonedParts(post.scheduledFor, post.timezone || timeZone)
    return Boolean(parts && parts.year === target.year && parts.month === target.month && parts.day === target.day)
  }).length
}
