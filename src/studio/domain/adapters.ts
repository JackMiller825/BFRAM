import type { PlatformId } from './types'

export interface AdapterCapability {
  platform: PlatformId
  name: string
  publish: boolean
  textLimit: number
  captionLimit: number | null
  appDailyCap: number
  envKeys: string[]
  summary: string
  docsUrl: string
}

export const ADAPTERS: AdapterCapability[] = [
  {
    platform: 'telegram',
    name: 'Telegram',
    publish: true,
    textLimit: 4096,
    captionLimit: 1024,
    appDailyCap: 4,
    envKeys: ['TELEGRAM_BOT_TOKEN'],
    summary: 'Bot API only, and only to chats where that bot is an administrator with permission to post.',
    docsUrl: 'https://core.telegram.org/bots/api',
  },
  {
    platform: 'x',
    name: 'X',
    publish: false,
    textLimit: 280,
    captionLimit: null,
    appDailyCap: 3,
    envKeys: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
    summary: 'Create Post needs user-context OAuth with tweet.write. A profile URL is not a connection.',
    docsUrl: 'https://docs.x.com/x-api/posts/create-post',
  },
  {
    platform: 'youtube',
    name: 'YouTube',
    publish: false,
    textLimit: 5000,
    captionLimit: 100,
    appDailyCap: 1,
    envKeys: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    summary: 'videos.insert needs youtube.upload on a channel the owner controls. Unaudited projects stay private.',
    docsUrl: 'https://developers.google.com/youtube/v3/docs/videos/insert',
  },
  {
    platform: 'tiktok',
    name: 'TikTok',
    publish: false,
    textLimit: 2200,
    captionLimit: null,
    appDailyCap: 2,
    envKeys: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    summary: 'Content Posting API needs an audited client for public posts. Init is not confirmation.',
    docsUrl: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
  },
  {
    platform: 'instagram',
    name: 'Instagram',
    publish: false,
    textLimit: 2200,
    captionLimit: null,
    appDailyCap: 2,
    envKeys: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
    summary: 'Publishing is for professional accounts through the official content publishing flow.',
    docsUrl: 'https://developers.facebook.com/docs/instagram-platform/content-publishing',
  },
  {
    platform: 'reddit',
    name: 'Reddit',
    publish: false,
    textLimit: 40000,
    captionLimit: 300,
    appDailyCap: 1,
    envKeys: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
    summary: 'OAuth submit only, and commercial use needs Reddit’s approval. A subreddit URL is not permission.',
    docsUrl: 'https://www.reddit.com/dev/api/',
  },
  {
    platform: 'discord',
    name: 'Discord',
    publish: false,
    textLimit: 2000,
    captionLimit: null,
    appDailyCap: 4,
    envKeys: ['DISCORD_BOT_TOKEN'],
    summary: 'A bot or webhook can post only in a channel where it was explicitly given permission.',
    docsUrl: 'https://docs.discord.com/developers/topics/rate-limits',
  },
  {
    platform: 'website',
    name: 'Website notes',
    publish: false,
    textLimit: 8000,
    captionLimit: null,
    appDailyCap: 0,
    envKeys: [],
    summary: 'Exportable copy only. This app does not publish to websites or listing directories.',
    docsUrl: '',
  },
]

export function adapterFor(platform: PlatformId): AdapterCapability {
  return ADAPTERS.find((adapter) => adapter.platform === platform) ?? ADAPTERS[ADAPTERS.length - 1]
}

export function validateDraftText(platform: PlatformId, title: string, body: string, sponsored: boolean, disclosure: string): string[] {
  const adapter = adapterFor(platform)
  const errors: string[] = []
  const limit = adapter.textLimit
  if (body.trim().length === 0) errors.push('The draft is empty.')
  if (body.length > limit) errors.push(`${adapter.name} text is limited to ${limit} characters.`)
  if (adapter.captionLimit && title.length > adapter.captionLimit) {
    errors.push(`${adapter.name} title is limited to ${adapter.captionLimit} characters.`)
  }
  if (sponsored && disclosure.trim().length < 8) errors.push('Add a sponsorship disclosure.')
  if (platform === 'x' && body.length > 280 && !body.includes('\n\n')) {
    errors.push('X posts are kept to 280 characters unless split into a thread.')
  }
  return errors
}

export function credentialsPresent(platform: PlatformId, env: NodeJS.ProcessEnv = process.env): boolean {
  const adapter = adapterFor(platform)
  if (!adapter.publish) return false
  return adapter.envKeys.every((key) => Boolean(env[key]?.trim()))
}

export function missingCredentials(platform: PlatformId, env: NodeJS.ProcessEnv = process.env): string[] {
  return adapterFor(platform).envKeys.filter((key) => !env[key]?.trim())
}
