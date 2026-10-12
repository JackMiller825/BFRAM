import { describe, expect, it } from 'vitest'
import { scanClaims, withholdUnsupported } from './claims'
import { generateDraft } from './drafts'
import { importLinkText, linkPublishBlock, maskPrivateUrl } from './links'
import { compareProgress, estimateRemainingMs, jobProgress } from './progress'
import { classifyProviderError, decideAutoRetry, evaluatePublishTarget, retryBackoffMs, runPublishingAttempt } from './publish'
import { containsSecret, redactSecrets } from './redact'
import { isPrivateAddress } from './ssrf'
import { starterCampaigns } from '../server/starters'
import type { Draft, LinkRecord, PublishTask, StudioSettings } from './types'

const now = '2026-10-12T15:00:00.000Z'

function settings(): StudioSettings {
  return { timezone: 'UTC', quietHours: { enabled: true, start: '22:00', end: '08:00' }, globalPause: false, platformPause: {} }
}

function draft(status: Draft['status'] = 'approved'): Draft {
  return {
    id: 'draft_1',
    campaignId: 'camp',
    platform: 'telegram',
    template: 'telegram',
    variant: 'brief',
    title: 'Update',
    body: 'Northwind Acorns is a fictional sample. Crypto assets can lose value.',
    altText: '',
    hashtags: [],
    callToAction: '',
    disclosure: '',
    sponsored: false,
    status,
    factuality: [],
    withheld: [],
    versions: [],
    linkId: null,
    createdAt: now,
    updatedAt: now,
  }
}

describe('link registry', () => {
  it('merges exact repeats, keeps history, and flags related handles', () => {
    const first = importLinkText([], 'https://t.me/mad_apes_gambles/8515\nhttps://t.me/mad_apes_gambles/8498\nhttps://t.me/mad_apes_gambles/8515', {
      batch: 'test',
      category: 'research',
      tags: ['telegram'],
    }, now, (prefix) => `${prefix}_fixed`)
    expect(first.added).toBe(2)
    expect(first.duplicates).toBe(1)
    const post = first.links.find((link) => link.messageId === '8515')
    expect(post?.duplicateCount).toBe(2)
    expect(post?.sourceHistory.map((entry) => entry.order)).toEqual([1, 3])
    expect(post?.original).toBe('https://t.me/mad_apes_gambles/8515')
    expect(first.links.every((link) => link.likelyDuplicate)).toBe(true)
    expect(first.links.every((link) => link.category === 'research')).toBe(true)
  })

  it('normalizes host variants without dropping the original and masks invites', () => {
    const result = importLinkText([], 'http://x.com/CryptoArena_Co\nhttps://x.com/cryptovictoria_?s=09\nhttps://t.me/+ExampleInviteHash\n@CryptoKingAnn', {
      batch: 'test',
      category: 'research',
      tags: [],
    }, now, (prefix) => `${prefix}_n`)
    expect(result.links.find((link) => link.handle === 'CryptoArena_Co')?.normalized).toBe('https://x.com/CryptoArena_Co')
    expect(result.links.find((link) => link.handle === 'cryptovictoria_')?.normalized).toBe('https://x.com/cryptovictoria_')
    const invite = result.links.find((link) => link.privateInvite)
    expect(invite?.checkStatus).toBe('skipped')
    expect(maskPrivateUrl(invite?.original ?? '')).toBe('https://t.me/+[private-invite]')
    expect(linkPublishBlock(invite as LinkRecord)).toMatch(/Invite links/)
  })
})

describe('publish gates', () => {
  it('refuses research, prospect, and unverified targets', () => {
    const research = importLinkText([], 'https://t.me/examplechannel', { batch: 't', category: 'research', tags: [] }, now).links[0]
    const prospect = importLinkText([], 'https://top100token.com', { batch: 't', category: 'prospect', tags: [] }, now).links[0]
    expect(linkPublishBlock(research)).toMatch(/not posting authorization/)
    expect(linkPublishBlock(prospect)).toMatch(/not authorization/)
    const gate = evaluatePublishTarget({
      link: { ...research, authorizationStatus: 'verified', verifiedChatId: '1' },
      account: { id: 'a', platform: 'telegram', label: '@bot', externalId: '1', scopes: [], status: 'authorized', authSource: 'env', connectedAt: now, tokenStored: false },
      draft: draft(),
      adapterCanPublish: true,
      credentialsConfigured: true,
      settings: settings(),
      scheduledFor: '2026-10-13T15:00:00.000Z',
      timezone: 'UTC',
      existingPosts: [],
      contentHash: 'abc',
      platformLimit: 4,
      budgetApproved: false,
    })
    expect(gate.allowed).toBe(false)
    expect(gate.reasons.join(' ')).toMatch(/Research/)
  })
})

describe('progress', () => {
  it('uses completed tasks over the plan and reaches 100 only when every task is terminal', () => {
    const tasks = [
      { status: 'succeeded' as const, label: 'Validate', waitingOnProvider: false },
      { status: 'running' as const, label: 'Publish', waitingOnProvider: true },
    ]
    const mid = jobProgress(tasks)
    expect(mid.percent).toBe(50)
    expect(mid.done).toBe(false)
    expect(mid.waitingOnProvider).toBe(true)
    expect(mid.currentStep).toBe('Publish')
    const done = jobProgress([
      { status: 'succeeded', label: 'One', waitingOnProvider: false },
      { status: 'skipped', label: 'Two', waitingOnProvider: false },
    ])
    expect(done.percent).toBe(100)
    expect(done.done).toBe(true)
    expect(jobProgress([]).indeterminate).toBe(true)
    expect(jobProgress([]).percent).toBeNull()
    const revised = compareProgress({ completed: 1, total: 2 }, { completed: 1, total: 3 })
    expect(revised.revised).toBe(true)
    expect(compareProgress({ completed: 1, total: 2 }, { completed: 0, total: 2 }).monotonic).toBe(false)
    expect(estimateRemainingMs(1, 4, 1000)).toBeNull()
    expect(estimateRemainingMs(2, 4, 1000)).toBe(1000)
  })
})

describe('retry and idempotency', () => {
  it('stops permanent errors and replays a confirmed result', async () => {
    expect(classifyProviderError('rate_limited')).toBe('transient')
    expect(classifyProviderError('forbidden')).toBe('permanent')
    expect(decideAutoRetry({ attempts: 1, maxAttempts: 3, errorClass: 'permanent' })).toBe('stop')
    expect(decideAutoRetry({ attempts: 3, maxAttempts: 3, errorClass: 'transient' })).toBe('stop')
    expect(decideAutoRetry({ attempts: 1, maxAttempts: 3, errorClass: 'transient' })).toBe('retry')
    expect(retryBackoffMs(1)).toBe(1000)
    expect(retryBackoffMs(6)).toBe(30_000)
    const store: Record<string, { ok: boolean; confirmed: boolean; code: string; providerPostId: string | null; providerUrl: string | null; message: string }> = {}
    let calls = 0
    const first = await runPublishingAttempt({
      key: 'same',
      store,
      attempt: async () => {
        calls += 1
        return { ok: true, confirmed: true, code: 'published', providerPostId: '55', providerUrl: 'https://t.me/owned/55', message: 'confirmed' }
      },
    })
    const second = await runPublishingAttempt({
      key: 'same',
      store,
      attempt: async () => {
        calls += 1
        return { ok: true, confirmed: true, code: 'published', providerPostId: '56', providerUrl: null, message: 'again' }
      },
    })
    expect(first.replayed).toBe(false)
    expect(second.replayed).toBe(true)
    expect(second.result.providerPostId).toBe('55')
    expect(calls).toBe(1)
  })
})

describe('secrets and claims', () => {
  it('redacts tokens and withholds unsupported claims from drafts', () => {
    const token = 'bot123456:AAAAAAAAAA_bbbbbbbbbbbbbbbbbbb'
    const redacted = redactSecrets(`failed ${token} bearer abcdefghijklmnop`, [token])
    expect(redacted).not.toContain(token)
    expect(containsSecret(redacted, [token])).toBe(false)
    expect(isPrivateAddress('127.0.0.1')).toBe(true)
    expect(isPrivateAddress('169.254.169.254')).toBe(true)
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    const issues = scanClaims('Some posts online claim this will 100x after listing. This is not guaranteed.')
    expect(issues.some((issue) => issue.excerpt.toLowerCase().includes('100x'))).toBe(true)
    expect(issues.some((issue) => issue.ruleId === 'guaranteed')).toBe(false)
    const demo = starterCampaigns(now).find((campaign) => campaign.demo)
    if (!demo) throw new Error('missing demo')
    const generated = generateDraft(demo, 'telegram', 'brief', 'telegram', now)
    expect(generated.body.toLowerCase()).not.toContain('100x')
    expect(generated.body).toMatch(/lose value|not financial advice|Demo content/i)
    expect(withholdUnsupported(demo.token.longDescription).withheld.join(' ')).toMatch(/100x/i)
  })
})

describe('task shape', () => {
  it('keeps a running provider task out of the completed count', () => {
    const task = { status: 'running', waitingOnProvider: true, label: 'Publish' } satisfies Pick<PublishTask, 'status' | 'waitingOnProvider' | 'label'>
    expect(jobProgress([task]).percent).toBe(0)
  })
})
