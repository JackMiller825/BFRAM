import { describe, expect, it } from 'vitest'
import { applyOpportunityPatch, seedOpportunities, statusChangeError } from './opportunities'
import type { PromotionOpportunity } from './types'

const now = '2026-10-12T00:00:00.000Z'

function readyAd(): PromotionOpportunity {
  const item = seedOpportunities(now).find((entry) => entry.group === 'advertising')
  if (!item) throw new Error('missing ad prospect')
  const diligence = Object.fromEntries(Object.keys(item.diligence).map((key) => [key, true])) as PromotionOpportunity['diligence']
  return { ...item, diligence, spendApproved: true, status: 'application_prepared', ownerApproved: true }
}

describe('promotion opportunities', () => {
  it('seeds official references as unreviewed and unconfirmed', () => {
    const items = seedOpportunities(now)
    expect(items.length).toBeGreaterThanOrEqual(20)
    expect(items.every((item) => item.status === 'unreviewed')).toBe(true)
    expect(items.some((item) => item.url.includes('coinmarketcap.com/request'))).toBe(true)
    expect(items.some((item) => item.status === 'provider_confirmed' || item.status === 'owner_submitted')).toBe(false)
  })

  it('blocks guaranteed-buyer and flooding pitches', () => {
    const item = seedOpportunities(now)[0]
    expect(() => applyOpportunityPatch(item, { eligibilityNotes: 'We provide guaranteed buyers and wash trading volume.' }, now)).not.toThrow()
    const blocked = applyOpportunityPatch(item, { eligibilityNotes: 'We provide guaranteed buyers and wash trading volume.' }, now)
    expect(blocked.blocked).toBe(true)
    expect(statusChangeError(blocked, 'owner_approved')).toMatch(/blocked|Guaranteed|wash/i)
  })

  it('refuses to mark an application confirmed before the owner submits it', () => {
    const item = seedOpportunities(now).find((entry) => entry.group === 'listing')
    if (!item) throw new Error('missing listing')
    expect(statusChangeError(item, 'provider_confirmed')).toMatch(/one step|owner records a real submission/i)
    expect(statusChangeError({ ...item, status: 'application_prepared' }, 'provider_confirmed')).toMatch(/one step|submitted/i)
  })

  it('requires spend approval before an ad prospect can be marked submitted', () => {
    const item = readyAd()
    expect(statusChangeError({ ...item, spendApproved: false }, 'owner_submitted')).toMatch(/spend approval/i)
    const submitted = applyOpportunityPatch(item, { status: 'owner_submitted' }, now)
    expect(submitted.status).toBe('owner_submitted')
    expect(submitted.submittedAt).toBe(now)
    const confirmed = applyOpportunityPatch(submitted, { status: 'provider_confirmed', referenceNumber: 'REF-1' }, now)
    expect(confirmed.status).toBe('provider_confirmed')
    expect(confirmed.referenceNumber).toBe('REF-1')
  })
})
