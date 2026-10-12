import { createId } from './ids'
import type { PromotionOpportunity, OpportunityGroup, OpportunityStatus } from './types'

export const DILIGENCE_ITEMS = [
  ['deliverables', 'Written deliverables and the exact placement URLs'],
  ['audience', 'Audience geography and language'],
  ['reach', 'Recent authentic reach and engagement evidence'],
  ['fraud', 'Bot and fraud controls'],
  ['fees', 'Total fees and refund terms'],
  ['approval', 'Content approval rights'],
  ['disclosure', 'Sponsorship disclosure'],
  ['identity', 'Contract and identity checks'],
  ['tracking', 'A campaign-specific tracking plan'],
] as const

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  unreviewed: 'Unreviewed',
  owner_approved: 'Owner approved',
  requirements_checked: 'Requirements checked',
  application_prepared: 'Application prepared',
  owner_submitted: 'Owner submitted',
  provider_confirmed: 'Provider confirmed',
  rejected: 'Rejected',
  expired: 'Expired',
}

const FLOW: OpportunityStatus[] = [
  'unreviewed',
  'owner_approved',
  'requirements_checked',
  'application_prepared',
  'owner_submitted',
  'provider_confirmed',
]

const RED_FLAGS: { id: string; pattern: RegExp; reason: string }[] = [
  { id: 'wash', pattern: /wash trad|artificial (trading )?volume|fake volume|wallet rotation/i, reason: 'Artificial trading volume or wash trading is blocked. Use an official profile update or a disclosed post on an account you control.' },
  { id: 'fake', pattern: /fake followers|fake views|bot engagement|bought engagement/i, reason: 'Fake followers, views, or engagement are blocked. Ask for recent authentic reach evidence instead.' },
  { id: 'shill', pattern: /shill army|shill armies|undisclosed paid|look(?:s|ing) like (an )?independent organic/i, reason: 'Undisclosed or fake-organic endorsements are a spam/astroturfing risk. Use a disclosed creator placement.' },
  { id: 'flood', pattern: /message flood|flood(ing)? (groups|chats|messages)|high-volume positive messaging/i, reason: 'Message flooding is a spam/astroturfing risk, not a safe template. Publish a useful update on an owner-controlled channel instead.' },
  { id: 'guarantee', pattern: /guaranteed (buyers|listing|price|returns)|guarantee[ds]? (a )?(price increase|buyers|listings)/i, reason: 'Guaranteed buyers, listings, or price increases are blocked. Complete an official data profile or educational post without a performance promise.' },
]

export function manipulationRisks(text: string): string[] {
  return RED_FLAGS.filter((flag) => flag.pattern.test(text)).map((flag) => flag.reason)
}

export function diligenceComplete(item: Pick<PromotionOpportunity, 'diligence'>): boolean {
  return DILIGENCE_ITEMS.every(([key]) => item.diligence[key])
}

export function nextStatus(status: OpportunityStatus): OpportunityStatus | null {
  const index = FLOW.indexOf(status)
  if (index < 0 || index === FLOW.length - 1) return null
  return FLOW[index + 1]
}

export function statusChangeError(item: PromotionOpportunity, next: OpportunityStatus): string | null {
  if (item.redFlags.length > 0 || item.blocked) {
    return item.blockReason || 'This service is blocked because it describes a manipulation tactic.'
  }
  if (next === 'rejected' || next === 'expired') return null
  if (next === item.status) return null
  const from = FLOW.indexOf(item.status)
  const to = FLOW.indexOf(next)
  if (from < 0 || to < 0) return 'That status is not part of the opportunity workflow.'
  if (to !== from + 1) {
    return 'Move one step at a time. Application prepared is not submitted, and submitted is not provider-confirmed.'
  }
  if ((next === 'requirements_checked' || next === 'application_prepared' || next === 'owner_submitted') && item.group !== 'policy' && !diligenceComplete(item)) {
    return 'Finish the due-diligence checklist before preparing or submitting this opportunity.'
  }
  if (next === 'owner_submitted' && item.group === 'advertising' && !item.spendApproved) {
    return 'Explicit spend approval is required before an advertising opportunity can be marked submitted.'
  }
  if (next === 'provider_confirmed') {
    return item.status === 'owner_submitted' ? null : 'Provider confirmed is only available after the owner records a real submission.'
  }
  return null
}

interface CatalogEntry {
  name: string
  group: OpportunityGroup
  url: string
  summary: string
}

const CATALOG: CatalogEntry[] = [
  { name: 'CoinGecko token listing guide', group: 'listing', url: 'https://support.coingecko.com/hc/en-us/articles/7291312302617-How-to-List-a-New-Cryptocurrency-on-CoinGecko', summary: 'Official listing guide. A submission is a review request, not a guaranteed placement.' },
  { name: 'CoinGecko official request form', group: 'listing', url: 'https://partner.coingecko.com/request-form/new', summary: 'Official request form. Do not treat a prepared application as submitted until you send it.' },
  { name: 'CoinMarketCap official request form', group: 'listing', url: 'https://coinmarketcap.com/request/', summary: 'Submit only through this official form. This app does not offer a paid guaranteed listing.' },
  { name: 'CoinMarketCap listing criteria', group: 'listing', url: 'https://support.coinmarketcap.com/hc/en-us/articles/360043659351-Listings-Criteria', summary: 'Official criteria. Duplicate or spam requests are discouraged. External services are not authorized to file the application for you.' },
  { name: 'DEX Screener token info docs', group: 'listing', url: 'https://docs.dexscreener.com/token-listing', summary: 'Official token-info documentation. Profile completion is not a promise of buyers or price movement.' },
  { name: 'DEX Screener Enhanced Token Info', group: 'listing', url: 'https://marketplace.dexscreener.com/product/token-info', summary: 'Provider product page. Confirm the current terms on the page before paying. Prices are not stored here.' },
  { name: 'GeckoTerminal token info update', group: 'listing', url: 'https://www.geckoterminal.com/update-token-info', summary: 'Official update form. Recheck pricing and review terms at the time you act.' },
  { name: 'CoinPaprika add or update request', group: 'listing', url: 'https://coinpaprika.com/add/', summary: 'Official add/update request. Acceptance is not guaranteed.' },
  { name: 'Coinzilla advertisers', group: 'advertising', url: 'https://coinzilla.com/advertisers/', summary: 'Unvetted ad-network prospect. Book only after the due-diligence checklist and an explicit spend approval.' },
  { name: 'Bitmedia', group: 'advertising', url: 'https://bitmedia.io/', summary: 'Unvetted ad-network prospect. Provider claims stay provider-reported until you verify them.' },
  { name: 'Adexium', group: 'advertising', url: 'https://adexium.io/', summary: 'Unvetted ad-network prospect. Do not connect a wallet or share a seed phrase.' },
  { name: 'Blockchain-Ads', group: 'advertising', url: 'https://www.blockchain-ads.com/crypto-advertising', summary: 'Unvetted advertising prospect. Require written placement URLs, fees, and disclosure terms.' },
  { name: 'Telegram Ads', group: 'advertising', url: 'https://ads.telegram.org/', summary: 'Official Telegram Ads site. Recheck the guidelines before any spend. This app does not submit ads.' },
  { name: 'Coinbound influencer services', group: 'advertising', url: 'https://coinbound.io/influencers/', summary: 'Unvetted creator-service prospect. Testimonials and self-reported reach are not verified performance.' },
  { name: 'X Paid Partnerships Policy', group: 'policy', url: 'https://help.x.com/en/rules-and-policies/paid-partnerships-policy', summary: 'Recheck this policy before a paid X post. A connected account is not approval to run ads.' },
  { name: 'Reddit promotions guidance', group: 'policy', url: 'https://support.reddithelp.com/hc/en-us/articles/22755369815700-Running-promotions-on-Reddit', summary: 'Recheck before a Reddit promotion. Commercial use can need a separate agreement.' },
  { name: 'YouTube paid promotion disclosure', group: 'policy', url: 'https://support.google.com/youtube/answer/154235', summary: 'Paid promotions need a disclosure. Collect the label evidence before publishing.' },
  { name: 'TikTok financial-services ad policy', group: 'policy', url: 'https://ads.tiktok.com/resources/help/article/tiktok-ads-policy-financial-services', summary: 'Recheck eligibility for the market you want to reach. This app does not submit TikTok ads.' },
  { name: 'Google Ads cryptocurrency policy', group: 'policy', url: 'https://support.google.com/adspolicy/answer/14009787', summary: 'Cryptocurrency ad eligibility varies by country and product. Recheck before any spend.' },
  { name: 'Telegram Ads guidelines', group: 'policy', url: 'https://ads.telegram.org/guidelines', summary: 'Official guidelines to recheck before enabling a paid Telegram Ads action.' },
]

function emptyDiligence(): PromotionOpportunity['diligence'] {
  return {
    deliverables: false,
    audience: false,
    reach: false,
    fraud: false,
    fees: false,
    approval: false,
    disclosure: false,
    identity: false,
    tracking: false,
  }
}

export function seedOpportunities(now: string): PromotionOpportunity[] {
  return CATALOG.map((entry) => ({
    id: createId('opp'),
    name: entry.name,
    group: entry.group,
    url: entry.url,
    summary: entry.summary,
    providerClaim: entry.group === 'policy' ? 'policy_reference' : 'provider_reported',
    status: 'unreviewed',
    redFlags: [],
    blocked: false,
    blockReason: null,
    diligence: emptyDiligence(),
    quotedCost: '',
    referenceNumber: '',
    eligibilityNotes: '',
    submittedAt: null,
    followUpAt: null,
    lastChecked: null,
    sourceUrl: entry.url,
    ownerApproved: false,
    spendApproved: false,
    disclosureRequired: entry.group !== 'listing',
    createdAt: now,
    updatedAt: now,
  }))
}

export function applyOpportunityPatch(current: PromotionOpportunity, patch: Record<string, unknown>, now: string): PromotionOpportunity {
  const next: PromotionOpportunity = {
    ...current,
    diligence: { ...current.diligence },
    updatedAt: now,
  }
  if (typeof patch.quotedCost === 'string') next.quotedCost = patch.quotedCost.slice(0, 160)
  if (typeof patch.referenceNumber === 'string') next.referenceNumber = patch.referenceNumber.slice(0, 160)
  if (typeof patch.eligibilityNotes === 'string') next.eligibilityNotes = patch.eligibilityNotes.slice(0, 2000)
  if (typeof patch.followUpAt === 'string') next.followUpAt = patch.followUpAt.slice(0, 40) || null
  if (patch.diligence && typeof patch.diligence === 'object') {
    const incoming = patch.diligence as Record<string, unknown>
    for (const [key] of DILIGENCE_ITEMS) {
      if (typeof incoming[key] === 'boolean') next.diligence[key] = incoming[key]
    }
  }
  if (typeof patch.spendApproved === 'boolean') {
    if (next.group !== 'advertising') throw new Error('Spend approval applies to advertising prospects only.')
    next.spendApproved = patch.spendApproved
  }
  const notes = `${next.name}\n${next.summary}\n${next.eligibilityNotes}`
  const flags = manipulationRisks(notes)
  next.redFlags = flags
  next.blocked = flags.length > 0
  next.blockReason = flags[0] ?? null
  if (typeof patch.status === 'string' && patch.status !== current.status) {
    const status = patch.status as OpportunityStatus
    const error = statusChangeError(next, status)
    if (error) throw new Error(error)
    next.status = status
    next.ownerApproved = ['owner_approved', 'requirements_checked', 'application_prepared', 'owner_submitted', 'provider_confirmed'].includes(status)
    if (status === 'owner_submitted' && !next.submittedAt) next.submittedAt = now
    if (status === 'unreviewed') next.ownerApproved = false
    next.lastChecked = now
  }
  return next
}
