import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { jobProgress } from '../domain/progress'
import { seedBatches } from './seed-data'
import { createStore } from './store'
import { TelegramError, type TelegramApi } from './telegram'

const token = '999999999:AAHexampletokenvalue1234567890abcd'

function tempStore(telegram?: (token: string) => TelegramApi, env: NodeJS.ProcessEnv = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'studio-'))
  const store = createStore(dir, { env, telegram })
  return { dir, store }
}

describe('studio store', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  it('seeds reference links without scheduling them or exposing invite secrets', () => {
    const { dir, store } = tempStore()
    dirs.push(dir)
    store.setup('studio-owner-pass')
    const snap = store.snapshot()
    const supplied = seedBatches.reduce((sum, batch) => sum + batch.lines.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#')).length, 0)
    expect(snap.links.reduce((sum, link) => sum + link.duplicateCount, 0)).toBe(supplied)
    expect(snap.links.some((link) => link.category === 'owned' || link.authorizationStatus === 'verified')).toBe(false)
    expect(snap.posts).toHaveLength(0)
    expect(snap.opportunities.length).toBeGreaterThanOrEqual(20)
    expect(snap.opportunities.some((item) => item.status === 'owner_submitted' || item.status === 'provider_confirmed')).toBe(false)
    expect(snap.links.find((link) => link.normalized === 'https://t.me/CRYPTO_RAVEN_CALL')?.duplicateCount).toBe(3)
    expect(snap.links.find((link) => link.normalized.includes('top100token.com'))?.category).toBe('prospect')
    expect(seedBatches.map((batch) => batch.lines).join('\n')).not.toMatch(/https?:\/\/t\.me\/\+/)
    expect(JSON.stringify(snap)).not.toMatch(/t\.me\/\+[A-Za-z0-9_-]/)
    expect(JSON.stringify(snap)).not.toContain('studio-owner-pass')
    expect(JSON.stringify(snap)).not.toContain(token)
  })

  it('blocks unauthorized targets and does not mark missing integrations as published', async () => {
    const { dir, store } = tempStore(undefined, { TELEGRAM_BOT_TOKEN: token })
    dirs.push(dir)
    store.setup('studio-owner-pass')
    const drafts = store.generateDrafts('camp_demo', 'telegram', 'telegram')
    store.decideDraft(drafts[0].id, 'approved', 'ok')
    const research = store.snapshot().links.find((link) => link.category === 'research' && link.platform === 'telegram' && link.kind === 'channel')
    expect(research).toBeTruthy()
    expect(() => store.schedule({ draftId: drafts[0].id, linkId: research?.id ?? '', scheduledFor: '2026-10-13T15:00:00.000Z' })).toThrow(/authorization|Research|permission/i)
    expect(store.snapshot().posts).toHaveLength(0)

    store.importText('https://t.me/ownedchannel', 'owned', [])
    const owned = store.snapshot().links.find((link) => link.handle === 'ownedchannel')
    store.updateLink(owned?.id ?? '', { authorizationStatus: 'verified', verifiedChatId: '99' })
    expect(store.snapshot().links.find((link) => link.handle === 'ownedchannel')?.authorizationStatus).toBe('unverified')
    expect(() => store.schedule({ draftId: drafts[0].id, linkId: owned?.id ?? '', scheduledFor: '2026-10-13T15:00:00.000Z' })).toThrow(/verified|Connect|Integration/i)
    expect(store.snapshot().posts).toHaveLength(0)
    expect(JSON.stringify(store.snapshot())).not.toContain(token)
  })

  it('publishes only after the provider confirms and replays the same idempotency key', async () => {
    let sends = 0
    const telegram = (): TelegramApi => ({
      getMe: async () => ({ id: 10, username: 'owned_bot' }),
      getChat: async (chatId) => ({ id: 99, username: chatId.replace(/^@/, ''), type: 'channel' }),
      getChatMember: async () => ({ status: 'administrator' }),
      sendMessage: async () => {
        sends += 1
        return { message_id: 5, chat: { id: 99, username: 'ownedchannel' } }
      },
    })
    const { dir, store } = tempStore(telegram, { TELEGRAM_BOT_TOKEN: token })
    dirs.push(dir)
    store.setup('studio-owner-pass')
    store.updateSettings({ quietHours: { enabled: false, start: '22:00', end: '08:00' } })
    await store.connectTelegram()
    store.importText('https://t.me/ownedchannel', 'owned', [])
    const owned = store.snapshot().links.find((link) => link.handle === 'ownedchannel')
    await store.verifyLink(owned?.id ?? '')
    const drafts = store.generateDrafts('camp_bfram', 'telegram', 'telegram')
    store.decideDraft(drafts[0].id, 'approved', 'ok')
    store.schedule({ draftId: drafts[0].id, linkId: owned?.id ?? '', scheduledFor: new Date(Date.now() - 60_000).toISOString() })
    await store.pump()
    const published = store.snapshot().posts[0]
    expect(published.status).toBe('published')
    expect(published.providerPostId).toBe('5')
    expect(sends).toBe(1)
    const job = store.snapshot().jobs[0]
    expect(jobProgress(job.tasks).percent).toBe(100)
    job.status = 'queued'
    job.finishedAt = null
    job.tasks[0].status = 'pending'
    job.tasks[0].result = null
    await store.pump()
    expect(sends).toBe(1)
    expect(job.tasks[0].logs.some((entry) => entry.message.includes('Reused'))).toBe(true)
    expect(store.snapshot().posts[0].providerPostId).toBe('5')
  })

  it('completes preparation from real tasks and stops permanent publish failures', async () => {
    let sends = 0
    const telegram = (): TelegramApi => ({
      getMe: async () => ({ id: 10, username: 'owned_bot' }),
      getChat: async (chatId) => ({ id: 44, username: chatId.replace(/^@/, ''), type: 'channel' }),
      getChatMember: async () => ({ status: 'administrator' }),
      sendMessage: async () => {
        sends += 1
        throw new TelegramError('forbidden', 'The bot is not allowed to post.')
      },
    })
    const { dir, store } = tempStore(telegram, { TELEGRAM_BOT_TOKEN: token })
    dirs.push(dir)
    store.setup('studio-owner-pass')
    store.updateSettings({ quietHours: { enabled: false, start: '22:00', end: '08:00' } })
    store.prepare('camp_demo')
    for (let step = 0; step < 6; step += 1) await store.pump()
    const prep = store.snapshot().jobs.find((job) => job.kind === 'preparation')
    expect(jobProgress(prep?.tasks ?? []).percent).toBe(100)
    expect(prep?.status).toBe('completed')
    expect(store.snapshot().drafts.length).toBeGreaterThan(0)
    expect(store.snapshot().posts.every((post) => post.status !== 'published')).toBe(true)

    await store.connectTelegram()
    store.importText('https://t.me/ownedchannel', 'owned', [])
    const owned = store.snapshot().links.find((link) => link.handle === 'ownedchannel')
    await store.verifyLink(owned?.id ?? '')
    const draft = store.snapshot().drafts.find((item) => item.campaignId === 'camp_demo' && item.platform === 'telegram')
    if (!draft) throw new Error('missing draft')
    store.decideDraft(draft.id, 'approved', 'ok')
    store.schedule({ draftId: draft.id, linkId: owned?.id ?? '', scheduledFor: new Date(Date.now() - 60_000).toISOString() })
    await store.pump()
    await store.pump()
    expect(sends).toBe(1)
    expect(store.snapshot().posts[0].status).toBe('failed')
    expect(store.snapshot().posts[0].providerPostId).toBeNull()
  })
})
