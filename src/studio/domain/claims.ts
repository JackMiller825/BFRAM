import type { Campaign, ClaimIssue } from './types'

interface ClaimRule {
  id: string
  pattern: RegExp
  concern: string
}

const RULES: ClaimRule[] = [
  {
    id: 'multiple',
    pattern: /\b\d+\s*x\b/i,
    concern: 'Return multiples are unsupported performance promises. Remove the claim or rewrite it without a promised multiple.',
  },
  {
    id: 'guaranteed',
    pattern: /\b(guaranteed|risk-?free|cannot lose|can't lose|sure profit|no risk)\b/i,
    concern: 'Guaranteed or risk-free language overstates what a token can promise. Remove it before publishing.',
  },
  {
    id: 'buyers',
    pattern: /\b(guaranteed buyers|buyers waiting|will be bought out)\b/i,
    concern: 'Promised buyers are an unsupported claim. Remove it before publishing.',
  },
  {
    id: 'price',
    pattern: /\b(price target|will reach|going to hit|guaranteed to hit)\b[^.]{0,40}/i,
    concern: 'Price targets and certain price outcomes are unsupported. Remove the claim before publishing.',
  },
  {
    id: 'listing',
    pattern: /\b(confirmed listing|listing guaranteed|will be listed|definitely listed|certain to list)\b/i,
    concern: 'A listing is not confirmed unless a primary source says so. Remove certainty about listings.',
  },
  {
    id: 'endorsement',
    pattern: /\b(endorsed by|partnership with|partnered with|audited by|officially listed on)\b/i,
    concern: 'Endorsements, partnerships, audits, and listings need a verified primary source. Remove the claim if it is not sourced.',
  },
  {
    id: 'audience',
    pattern: /\b\d[\d,]*\+?\s*(holders|members|users|followers)\b/i,
    concern: 'Audience or holder counts need a verified source. Remove the number if it is not confirmed.',
  },
]

function isNegated(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 48), index).toLowerCase()
  return /\b(not|no|never|without|isn't|is not|aren't|are not)\b/.test(before)
}

export function scanClaims(text: string): ClaimIssue[] {
  const issues: ClaimIssue[] = []
  for (const rule of RULES) {
    const flags = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`)
    for (const match of text.matchAll(flags)) {
      const index = match.index ?? 0
      if (isNegated(text, index)) continue
      const excerpt = match[0].trim()
      if (!excerpt) continue
      if (issues.some((issue) => issue.ruleId === rule.id && issue.excerpt.toLowerCase() === excerpt.toLowerCase())) continue
      issues.push({ id: `${rule.id}:${excerpt.toLowerCase()}`, ruleId: rule.id, excerpt, concern: rule.concern })
    }
  }
  return issues
}

export function scanCampaignClaims(campaign: Campaign): ClaimIssue[] {
  const chunks = [
    campaign.token.shortDescription,
    campaign.token.longDescription,
    campaign.token.narrative,
    campaign.token.utility,
    campaign.token.tokenomics,
    campaign.briefNotes,
    campaign.objective,
  ]
  const issues: ClaimIssue[] = []
  for (const chunk of chunks) {
    for (const issue of scanClaims(chunk)) {
      if (!issues.some((item) => item.id === issue.id)) issues.push(issue)
    }
  }
  return issues
}

export function withholdUnsupported(text: string): { clean: string; withheld: string[] } {
  const parts = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const kept: string[] = []
  const withheld: string[] = []
  for (const part of parts) {
    if (scanClaims(part).length > 0) withheld.push(part)
    else kept.push(part)
  }
  return { clean: kept.join(' '), withheld }
}
