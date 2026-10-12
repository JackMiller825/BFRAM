import { tokenConfig } from '../../config/token'
import { defaultPlatformLimits } from '../domain/drafts'
import { createId } from '../domain/ids'
import type { Campaign } from '../domain/types'

export function starterCampaigns(now: string): Campaign[] {
  const limits = defaultPlatformLimits()
  const demo: Campaign = {
    id: 'camp_demo',
    name: 'Northwind Acorns (demo)',
    demo: true,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    token: {
      projectName: 'Northwind Acorns',
      ticker: 'ACORN',
      chain: 'Demo Chain (fictional)',
      contractAddress: null,
      contractConfirmed: false,
      launchAt: null,
      timezone: 'UTC',
      websiteUrl: 'https://example.com/northwind-acorns',
      officialUrls: [{ id: createId('url'), label: 'Fictional site', url: 'https://example.com/northwind-acorns' }],
      dexUrls: [],
      shortDescription: 'Northwind Acorns is a fictional sample project used to show the campaign studio. It is not a live token.',
      longDescription:
        'The sample story is about a town that catalogs oak trees. Some posts online claim this will 100x after listing. That sentence is intentionally unsupported so the claims checklist has something to flag.',
      narrative: 'This narrative is fictional sample copy. It describes a town archive, not a tradable asset with real buyers or partners.',
      utility: 'No token utility is claimed. The demo exists so the owner can practice review and approval.',
      tokenomics: 'Pending confirmation. The demo does not invent supply, tax, or liquidity figures.',
      risks: 'Demo content only. Crypto assets can lose value. Nothing here is financial advice.',
      disclosures: 'Fictional sample. Not an offer, listing, audit, or endorsement.',
    },
    sources: [
      {
        id: 'src_demo',
        url: 'https://example.com/northwind-acorns/notes',
        publisher: 'Northwind sample desk',
        publishedAt: null,
        eventAt: null,
        sourceType: 'unverified',
        verificationNotes: 'Fictional source. Do not treat it as news.',
      },
    ],
    objective: 'Show a full review workflow with fictional copy.',
    audience: 'The workspace owner learning the tool.',
    tone: 'Plain and specific.',
    languages: ['English'],
    startDate: null,
    endDate: null,
    timezone: 'UTC',
    postingFrequency: 'Manual review only. No automatic posting.',
    platformLimits: limits,
    assets: [],
    briefNotes: 'Labeled demo. Do not attach real publishing accounts to this sample.',
  }

  const bfram: Campaign = {
    id: 'camp_bfram',
    name: 'BuffaRumble',
    demo: false,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    token: {
      projectName: tokenConfig.name,
      ticker: tokenConfig.ticker,
      chain: tokenConfig.network,
      contractAddress: null,
      contractConfirmed: false,
      launchAt: null,
      timezone: 'UTC',
      websiteUrl: tokenConfig.siteUrl,
      officialUrls: tokenConfig.siteUrl ? [{ id: createId('url'), label: 'Website', url: tokenConfig.siteUrl }] : [],
      dexUrls: [],
      shortDescription: tokenConfig.tagline,
      longDescription:
        'BuffaRumble turns a buffalo-and-ram rivalry into an original community meme. Two oversized personalities. One undersized football. The buffalo brought the noise. The ram brought the attitude. Neither brought a helmet that fits.',
      narrative: 'Fictional mascot story. Independent characters. No team or league affiliation.',
      utility: 'No token utility is claimed on the public site.',
      tokenomics: 'Supply, tax, liquidity, and ownership are pending confirmation.',
      risks: 'Independent meme project. Details pending confirmation. Verify official information before trading. This is not financial advice.',
      disclosures: 'No team or league affiliation. Contract address, trading, Telegram, and X links are pending confirmation on the public site.',
    },
    sources: [],
    objective: 'Prepare accurate updates that can be published only to accounts the owner connects and verifies.',
    audience: 'People already looking for official BuffaRumble information.',
    tone: 'Playful, clear, and non-promissory.',
    languages: ['English'],
    startDate: null,
    endDate: null,
    timezone: 'UTC',
    postingFrequency: 'Only after manual approval, inside the per-platform caps.',
    platformLimits: limits,
    assets: [],
    briefNotes: 'Facts come from the public site configuration. Unknown facts stay pending.',
  }

  return [demo, bfram]
}
