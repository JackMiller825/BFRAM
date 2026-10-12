import { adapterFor } from './adapters'
import { scanClaims, withholdUnsupported } from './claims'
import { createId } from './ids'
import type { Campaign, Draft, FactualityItem, PlatformId, TemplateId, TokenFacts } from './types'

export interface TemplateOption {
  id: TemplateId
  label: string
  platforms: PlatformId[]
  description: string
}

export const TEMPLATES: TemplateOption[] = [
  { id: 'launch', label: 'Launch announcement', platforms: ['telegram', 'x'], description: 'What is known about the launch, plus risks.' },
  { id: 'story', label: 'Project story', platforms: ['telegram', 'x'], description: 'Narrative from the owner’s brief, without new facts.' },
  { id: 'community', label: 'Community post', platforms: ['telegram', 'discord'], description: 'A short community note and a next step.' },
  { id: 'video_script', label: 'Short video script', platforms: ['tiktok', 'youtube'], description: 'Spoken script with on-screen title ideas.' },
  { id: 'telegram', label: 'Telegram post', platforms: ['telegram'], description: 'A single Telegram message within the caption and text limits.' },
  { id: 'x_post', label: 'X post', platforms: ['x'], description: 'One post within 280 characters.' },
  { id: 'x_thread', label: 'X thread', platforms: ['x'], description: 'A short thread. Each post stays within 280 characters.' },
  { id: 'youtube', label: 'YouTube package', platforms: ['youtube'], description: 'Title, description, and a short script.' },
  { id: 'tiktok', label: 'TikTok caption and script', platforms: ['tiktok'], description: 'Caption plus a spoken script.' },
  { id: 'faq', label: 'FAQ', platforms: ['telegram', 'website'], description: 'Questions answered only from the brief.' },
  { id: 'follow_up', label: 'Follow-up update', platforms: ['telegram', 'x'], description: 'An update that does not invent news.' },
]

const DEFAULT_RISK = 'Crypto assets can lose value. This is not financial advice or a promise of a listing, return, or buyer.'

export function pending(value: string | null | undefined, label: string): string {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : `${label}: pending confirmation`
}

export function tickerLabel(token: TokenFacts): string {
  const raw = token.ticker.trim().replace(/^\$+/, '')
  return raw ? `$${raw}` : 'Ticker: pending confirmation'
}

function factLine(label: string, value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ''
  return trimmed ? `${label}: ${trimmed}` : `${label}: pending confirmation`
}

function riskLine(token: TokenFacts): string {
  const risks = token.risks.trim()
  const disclosures = token.disclosures.trim()
  if (risks && disclosures && risks !== disclosures) return `${risks} ${disclosures}`
  return risks || disclosures || DEFAULT_RISK
}

function hashtags(token: TokenFacts): string[] {
  const ticker = token.ticker.replace(/[^A-Za-z0-9]/g, '')
  return ticker ? [`#${ticker}`] : []
}

function factualityFor(campaign: Campaign, withheld: string[]): FactualityItem[] {
  const items: FactualityItem[] = []
  const push = (text: string, basis: FactualityItem['basis'], sourceId: string | null = null) => {
    if (!text.trim()) return
    items.push({ id: createId('fact'), text: text.trim(), basis, sourceId })
  }
  push(`${campaign.token.projectName} (${tickerLabel(campaign.token)}) on ${pending(campaign.token.chain, 'Chain')}`, 'owner_provided')
  if (campaign.token.contractConfirmed && campaign.token.contractAddress) {
    push(`Contract ${campaign.token.contractAddress}`, 'confirmed')
  } else {
    push('Contract address is pending confirmation.', 'pending')
  }
  if (campaign.token.websiteUrl) push(`Website ${campaign.token.websiteUrl}`, 'owner_provided')
  else push('Website is pending confirmation.', 'pending')
  for (const source of campaign.sources) {
    push(`${source.publisher || 'Source'} — ${source.url}`, source.sourceType === 'unverified' ? 'unverified' : source.sourceType === 'primary' ? 'confirmed' : 'owner_provided', source.id)
  }
  if (campaign.sources.length === 0) push('No news sources have been attached.', 'pending')
  for (const claim of withheld) push(`Withheld from the draft: ${claim}`, 'unverified')
  return items
}

function cleanField(value: string): { clean: string; withheld: string[] } {
  return withholdUnsupported(value)
}

function fit(text: string, limit: number): string {
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function siteLine(token: TokenFacts): string {
  return token.websiteUrl?.trim() ? token.websiteUrl.trim() : 'Website: pending confirmation'
}

interface BuiltCopy {
  title: string
  body: string
  withheld: string[]
}

function assemble(parts: string[], limit: number, risk: string): string {
  const required = risk.trim()
  const optional = parts.map((part) => part.trim()).filter(Boolean)
  const kept: string[] = []
  for (const part of optional) {
    const trial = [...kept, part, required].join('\n\n')
    if (trial.length <= limit) kept.push(part)
  }
  const body = [...kept, required].filter(Boolean).join('\n\n')
  return body.length <= limit ? body : `${fit(kept.join('\n\n'), Math.max(0, limit - required.length - 2))}\n\n${required}`.trim()
}

export function buildCopy(campaign: Campaign, template: TemplateId, variant: string, platform: PlatformId): BuiltCopy {
  const token = campaign.token
  const short = cleanField(token.shortDescription)
  const narrative = cleanField(token.narrative)
  const utility = cleanField(token.utility)
  const tokenomics = cleanField(token.tokenomics)
  const withheld = [...short.withheld, ...narrative.withheld, ...utility.withheld, ...tokenomics.withheld]
  const name = pending(token.projectName, 'Project')
  const tick = tickerLabel(token)
  const risk = riskLine(token)
  const limit = adapterFor(platform).textLimit
  const titleLimit = adapterFor(platform).captionLimit ?? 120

  if (template === 'x_post') {
    const body = assemble([`${name} (${tick})`, short.clean, siteLine(token)], 280, risk)
    return { title: fit(`${name} on X`, titleLimit), body: fit(body, 280), withheld }
  }

  if (template === 'x_thread') {
    const posts = [
      assemble([`${name} (${tick})`, short.clean], 280, ''),
      assemble([narrative.clean || 'Story: pending confirmation', siteLine(token)], 280, ''),
      assemble([factLine('Utility', utility.clean), factLine('Tokenomics', tokenomics.clean)], 280, risk),
    ].map((post, index) => `${index + 1}/${3} ${post}`.trim())
    return { title: fit(`${name} thread`, titleLimit), body: posts.map((post) => fit(post, 280)).join('\n\n'), withheld }
  }

  if (template === 'youtube') {
    const title = fit(`${name} (${tick}) — project update`, 100)
    const body = assemble(
      [
        `Title: ${title}`,
        short.clean,
        narrative.clean,
        factLine('Chain', token.chain),
        factLine('Launch', token.launchAt),
        siteLine(token),
        'Script:',
        `Open on the name ${name}. Say only what is in the brief. If a fact is pending, say pending confirmation.`,
        utility.clean,
      ],
      limit,
      risk,
    )
    return { title, body, withheld }
  }

  if (template === 'tiktok' || template === 'video_script') {
    const title = fit(`${name} (${tick})`, titleLimit)
    const body = assemble(
      [
        `On-screen title: ${title}`,
        'Script: Introduce the project name and ticker. Read the short description. Say which facts are still pending. End with the risk line.',
        short.clean,
        siteLine(token),
      ],
      limit,
      risk,
    )
    return { title, body, withheld }
  }

  if (template === 'faq') {
    const body = assemble(
      [
        `What is ${name}?`,
        short.clean || 'Pending confirmation.',
        'Is the contract confirmed?',
        token.contractConfirmed && token.contractAddress ? token.contractAddress : 'Pending confirmation. Do not trade from an unconfirmed address.',
        'What utility is claimed?',
        utility.clean || 'No utility is claimed beyond what is written here.',
        'Where is the site?',
        siteLine(token),
      ],
      limit,
      risk,
    )
    return { title: fit(`${name} FAQ`, titleLimit), body, withheld }
  }

  if (variant === 'checklist') {
    const body = assemble(
      [
        name,
        tick,
        factLine('Chain', token.chain),
        factLine('Launch', token.launchAt),
        short.clean,
        factLine('Utility', utility.clean),
        factLine('Tokenomics', tokenomics.clean),
        siteLine(token),
      ],
      limit,
      risk,
    )
    return { title: fit(`${name} facts`, titleLimit), body, withheld }
  }

  if (variant === 'story') {
    const body = assemble([name, narrative.clean || short.clean, siteLine(token)], limit, risk)
    return { title: fit(`${name} story`, titleLimit), body, withheld }
  }

  const body = assemble([`${name} (${tick})`, short.clean, factLine('Chain', token.chain), siteLine(token)], limit, risk)
  const label = template === 'follow_up' ? `${name} update` : name
  return { title: fit(label, titleLimit), body, withheld }
}

export function generateDraft(campaign: Campaign, template: TemplateId, variant: string, platform: PlatformId, now: string): Draft {
  const copy = buildCopy(campaign, template, variant, platform)
  const issues = scanClaims(`${copy.title}\n${copy.body}`)
  const withheld = [...copy.withheld]
  let body = copy.body
  if (issues.length > 0) {
    const cleaned = withholdUnsupported(body)
    body = cleaned.clean || `Correct the unsupported claims in the brief before this ${adapterFor(platform).name} draft can be written.\n\n${riskLine(campaign.token)}`
    withheld.push(...cleaned.withheld)
  }
  return {
    id: createId('draft'),
    campaignId: campaign.id,
    platform,
    template,
    variant,
    title: copy.title,
    body,
    altText: '',
    hashtags: hashtags(campaign.token),
    callToAction: campaign.token.websiteUrl ? 'Read the project site and verify the facts that are still pending.' : 'Wait for confirmed links before asking anyone to trade.',
    disclosure: '',
    sponsored: false,
    status: 'needs_review',
    factuality: factualityFor(campaign, withheld),
    withheld: [...new Set(withheld)],
    versions: [],
    linkId: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function generateDraftSet(campaign: Campaign, template: TemplateId, platform: PlatformId, now: string): Draft[] {
  const variants = template === 'x_post' || template === 'x_thread' ? ['brief', 'story'] : ['brief', 'story', 'checklist']
  return variants.map((variant) => generateDraft(campaign, template, variant, platform, now))
}

export function defaultPlatformLimits(): Partial<Record<PlatformId, number>> {
  return { telegram: 4, x: 3, youtube: 1, tiktok: 2, instagram: 2, reddit: 1, discord: 4 }
}
