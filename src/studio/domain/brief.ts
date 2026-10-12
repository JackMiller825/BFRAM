import { scanCampaignClaims } from './claims'
import type { Campaign, LinkRecord } from './types'

export function campaignFieldIssues(campaign: Campaign): string[] {
  const issues: string[] = []
  const token = campaign.token
  if (!token.projectName.trim()) issues.push('Project name is required.')
  if (!token.ticker.trim()) issues.push('Ticker is required.')
  if (!token.chain.trim()) issues.push('Chain is required.')
  if (!token.shortDescription.trim()) issues.push('Short description is required.')
  if (!token.risks.trim()) issues.push('Risk language is required.')
  if (!token.disclosures.trim()) issues.push('Disclosures are required.')
  if (!campaign.objective.trim()) issues.push('Campaign objective is required.')
  if (!campaign.audience.trim()) issues.push('Audience is required.')
  if (!campaign.timezone.trim()) issues.push('Timezone is required.')
  if (campaign.startDate && campaign.endDate && campaign.endDate < campaign.startDate) {
    issues.push('The end date is before the start date.')
  }
  if (token.contractAddress && !token.contractConfirmed) {
    issues.push('A contract address is present but not confirmed. Drafts will keep it pending.')
  }
  return issues
}

export function requiredFieldProgress(campaign: Campaign): { done: number; total: number } {
  const checks = [
    campaign.token.projectName,
    campaign.token.ticker,
    campaign.token.chain,
    campaign.token.shortDescription,
    campaign.token.risks,
    campaign.token.disclosures,
    campaign.objective,
    campaign.audience,
    campaign.timezone,
  ]
  const done = checks.filter((value) => value.trim().length > 0).length
  return { done, total: checks.length }
}

export function campaignBriefMarkdown(campaign: Campaign, links: LinkRecord[]): string {
  const claims = scanCampaignClaims(campaign)
  const token = campaign.token
  const lines = [
    `# ${campaign.name}`,
    '',
    campaign.demo ? 'Status: DEMO. This campaign is fictional sample content.' : 'Status: owner campaign.',
    '',
    'Confirmed facts are marked. Everything else is owner-provided or still pending.',
    '',
    '## Token',
    `- Project: ${token.projectName || 'Pending confirmation'}`,
    `- Ticker: ${token.ticker || 'Pending confirmation'}`,
    `- Chain: ${token.chain || 'Pending confirmation'}`,
    `- Contract: ${token.contractConfirmed && token.contractAddress ? token.contractAddress : 'Pending confirmation'}`,
    `- Launch: ${token.launchAt || 'Pending confirmation'} (${token.timezone || campaign.timezone})`,
    `- Website: ${token.websiteUrl || 'Pending confirmation'}`,
    '',
    '## Descriptions',
    token.shortDescription || 'Pending confirmation.',
    '',
    token.longDescription || '',
    '',
    '## Narrative',
    token.narrative || 'Pending confirmation.',
    '',
    '## Utility',
    token.utility || 'No utility has been stated.',
    '',
    '## Tokenomics',
    token.tokenomics || 'Pending confirmation.',
    '',
    '## Risks and disclosures',
    token.risks || 'Pending confirmation.',
    '',
    token.disclosures || '',
    '',
    '## Campaign',
    `- Objective: ${campaign.objective || 'Pending'}`,
    `- Audience: ${campaign.audience || 'Pending'}`,
    `- Tone: ${campaign.tone || 'Pending'}`,
    `- Languages: ${campaign.languages.join(', ') || 'Pending'}`,
    `- Window: ${campaign.startDate || 'open'} to ${campaign.endDate || 'open'}`,
    `- Frequency: ${campaign.postingFrequency || 'Not set'}`,
    '',
    '## Sources',
  ]
  if (campaign.sources.length === 0) lines.push('No sources attached.')
  for (const source of campaign.sources) {
    lines.push(`- ${source.sourceType}: ${source.publisher || 'Publisher pending'} — ${source.url}`)
    if (source.verificationNotes) lines.push(`  Notes: ${source.verificationNotes}`)
  }
  lines.push('', '## Claims to resolve')
  if (claims.length === 0) lines.push('No unsupported-claim patterns are currently flagged.')
  for (const claim of claims) lines.push(`- “${claim.excerpt}”: ${claim.concern}`)
  lines.push('', '## Linked records used as references')
  lines.push('These are not publishing targets unless a separate owned record is verified.')
  const related = links.filter((link) => !link.archived).slice(0, 30)
  if (related.length === 0) lines.push('No link records.')
  for (const link of related) {
    const url = link.privateInvite ? 'https://t.me/+[private-invite]' : link.original
    lines.push(`- ${link.category} / ${link.platform}: ${url}`)
  }
  lines.push('', '## Assets')
  if (campaign.assets.length === 0) lines.push('No assets uploaded.')
  for (const asset of campaign.assets) {
    lines.push(`- ${asset.kind}: ${asset.fileName}${asset.altText ? ` (alt: ${asset.altText})` : ' (alt text missing)'}`)
  }
  return lines.filter((line) => line !== undefined).join('\n')
}

export function emptyToken(timezone: string): Campaign['token'] {
  return {
    projectName: '',
    ticker: '',
    chain: '',
    contractAddress: null,
    contractConfirmed: false,
    launchAt: null,
    timezone,
    websiteUrl: null,
    officialUrls: [],
    dexUrls: [],
    shortDescription: '',
    longDescription: '',
    narrative: '',
    utility: '',
    tokenomics: '',
    risks: '',
    disclosures: '',
  }
}
