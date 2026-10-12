export type PlatformId =
  | 'telegram'
  | 'x'
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'reddit'
  | 'discord'
  | 'website'
  | 'other'

export type LinkCategory = 'owned' | 'partner' | 'listing' | 'ad_network' | 'creator' | 'research' | 'prospect'

export type OpportunityGroup = 'listing' | 'advertising' | 'policy'

export type OpportunityStatus =
  | 'unreviewed'
  | 'owner_approved'
  | 'requirements_checked'
  | 'application_prepared'
  | 'owner_submitted'
  | 'provider_confirmed'
  | 'rejected'
  | 'expired'

export type AuthorizationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export type SourceType = 'primary' | 'reliable_report' | 'unverified'

export type PostStatus =
  | 'draft'
  | 'needs_review'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'canceled'

export type TaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'canceled'

export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'canceled'

export type LinkKind = 'post' | 'profile' | 'channel' | 'invite' | 'website' | 'video' | 'unknown'

export type CheckStatus = 'unchecked' | 'ok' | 'broken' | 'skipped' | 'unsupported'

export type FactBasis = 'confirmed' | 'owner_provided' | 'unverified' | 'pending'

export type TemplateId =
  | 'launch'
  | 'story'
  | 'community'
  | 'video_script'
  | 'telegram'
  | 'x_post'
  | 'x_thread'
  | 'youtube'
  | 'tiktok'
  | 'faq'
  | 'follow_up'

export interface TokenFacts {
  projectName: string
  ticker: string
  chain: string
  contractAddress: string | null
  contractConfirmed: boolean
  launchAt: string | null
  timezone: string
  websiteUrl: string | null
  officialUrls: LabeledUrl[]
  dexUrls: LabeledUrl[]
  shortDescription: string
  longDescription: string
  narrative: string
  utility: string
  tokenomics: string
  risks: string
  disclosures: string
}

export interface LabeledUrl {
  id: string
  label: string
  url: string
}

export interface Source {
  id: string
  url: string
  publisher: string
  publishedAt: string | null
  eventAt: string | null
  sourceType: SourceType
  verificationNotes: string
}

export interface Asset {
  id: string
  campaignId: string
  kind: 'image' | 'logo' | 'banner' | 'video' | 'sticker_pack' | 'emoji_pack' | 'other'
  fileName: string
  mimeType: string
  size: number
  storageName: string | null
  externalUrl: string | null
  altText: string
  createdAt: string
}

export interface Campaign {
  id: string
  name: string
  demo: boolean
  status: 'draft' | 'ready' | 'active' | 'paused' | 'completed'
  createdAt: string
  updatedAt: string
  token: TokenFacts
  sources: Source[]
  objective: string
  audience: string
  tone: string
  languages: string[]
  startDate: string | null
  endDate: string | null
  timezone: string
  postingFrequency: string
  platformLimits: Partial<Record<PlatformId, number>>
  assets: Asset[]
  briefNotes: string
}

export interface SourceHistoryEntry {
  order: number
  raw: string
  batch: string
}

export interface LinkRecord {
  id: string
  platform: PlatformId
  kind: LinkKind
  original: string
  normalized: string
  handle: string | null
  messageId: string | null
  displayName: string
  category: LinkCategory
  authorizationStatus: AuthorizationStatus
  authorizationEvidence: string
  verifiedChatId: string | null
  budgetApproved: boolean
  budgetNote: string
  contactNotes: string
  tags: string[]
  notes: string
  lastChecked: string | null
  checkStatus: CheckStatus
  checkDetail: string
  duplicateCount: number
  sourceHistory: SourceHistoryEntry[]
  relatedGroup: string | null
  likelyDuplicate: boolean
  archived: boolean
  privateInvite: boolean
  createdAt: string
  updatedAt: string
}

export interface PromotionOpportunity {
  id: string
  name: string
  group: OpportunityGroup
  url: string
  summary: string
  providerClaim: 'provider_reported' | 'policy_reference'
  status: OpportunityStatus
  redFlags: string[]
  blocked: boolean
  blockReason: string | null
  diligence: Record<'deliverables' | 'audience' | 'reach' | 'fraud' | 'fees' | 'approval' | 'disclosure' | 'identity' | 'tracking', boolean>
  quotedCost: string
  referenceNumber: string
  eligibilityNotes: string
  submittedAt: string | null
  followUpAt: string | null
  lastChecked: string | null
  sourceUrl: string
  ownerApproved: boolean
  spendApproved: boolean
  disclosureRequired: boolean
  createdAt: string
  updatedAt: string
}

export interface ConnectedAccount {
  id: string
  platform: PlatformId
  label: string
  externalId: string | null
  scopes: string[]
  status: 'authorized' | 'disconnected'
  authSource: 'env'
  connectedAt: string | null
  tokenStored: boolean
}

export interface FactualityItem {
  id: string
  text: string
  basis: FactBasis
  sourceId: string | null
}

export interface DraftVersion {
  id: string
  title: string
  body: string
  savedAt: string
}

export interface Draft {
  id: string
  campaignId: string
  platform: PlatformId
  template: TemplateId
  variant: string
  title: string
  body: string
  altText: string
  hashtags: string[]
  callToAction: string
  disclosure: string
  sponsored: boolean
  status: PostStatus
  factuality: FactualityItem[]
  withheld: string[]
  versions: DraftVersion[]
  linkId: string | null
  createdAt: string
  updatedAt: string
}

export interface Approval {
  id: string
  draftId: string
  decision: 'approved' | 'rejected'
  note: string
  at: string
}

export interface ScheduledPost {
  id: string
  draftId: string
  campaignId: string
  linkId: string
  accountId: string | null
  platform: PlatformId
  status: PostStatus
  scheduledFor: string
  timezone: string
  idempotencyKey: string
  contentHash: string
  disclosure: string
  sponsored: boolean
  providerPostId: string | null
  providerUrl: string | null
  errorSummary: string | null
  createdAt: string
  updatedAt: string
}

export interface ProviderResult {
  ok: boolean
  confirmed: boolean
  code: string
  providerPostId: string | null
  providerUrl: string | null
  message: string
}

export interface TaskLog {
  at: string
  message: string
}

export interface PublishTask {
  id: string
  idempotencyKey: string
  label: string
  platform: PlatformId | 'local'
  kind: 'validate' | 'claims' | 'links' | 'drafts' | 'brief' | 'publish'
  status: TaskStatus
  attempts: number
  maxAttempts: number
  errorClass: 'transient' | 'permanent' | null
  errorSummary: string | null
  waitingOnProvider: boolean
  scheduledPostId: string | null
  result: ProviderResult | null
  logs: TaskLog[]
  nextAttemptAt: string | null
}

export interface PublishJob {
  id: string
  campaignId: string | null
  kind: 'preparation' | 'publishing'
  status: JobStatus
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  tasks: PublishTask[]
  planRevision: number
  planTotal: number
}

export interface AuditEvent {
  id: string
  at: string
  action: string
  summary: string
}

export interface QuietHours {
  enabled: boolean
  start: string
  end: string
}

export interface StudioSettings {
  timezone: string
  quietHours: QuietHours
  globalPause: boolean
  platformPause: Partial<Record<PlatformId, boolean>>
}

export interface ClaimIssue {
  id: string
  ruleId: string
  excerpt: string
  concern: string
}

export interface IntegrationCard {
  platform: PlatformId
  name: string
  state: 'connected' | 'disconnected' | 'unavailable'
  detail: string
  missingEnv: string[]
  canPublish: boolean
}

export interface ClientWorkspace {
  settings: StudioSettings
  campaigns: Campaign[]
  links: LinkRecord[]
  opportunities: PromotionOpportunity[]
  accounts: ConnectedAccount[]
  drafts: Draft[]
  approvals: Approval[]
  posts: ScheduledPost[]
  jobs: PublishJob[]
  audit: AuditEvent[]
  integrations: IntegrationCard[]
}
