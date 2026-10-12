import { displayTicker, siteOrigin, tokenConfig, type TokenConfig } from './token.ts'

export const THEME_COLOR = '#251008'
export const SOCIAL_IMAGE_PATH = '/assets/bfram/bfram-banner-1100x520.png'
export const SOCIAL_IMAGE_WIDTH = 1100
export const SOCIAL_IMAGE_HEIGHT = 520

export function pageTitle(config: TokenConfig = tokenConfig): string {
  return `${config.name} (${displayTicker(config)}) | Big horns. Tiny helmets.`
}

export function pageDescription(config: TokenConfig = tokenConfig): string {
  return `Meet ${config.name} (${displayTicker(config)}), an independent Ethereum meme community. Pick Team Buffalo or Team Ram. ${config.tagline}`
}

export function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

export function socialImageUrl(config: TokenConfig = tokenConfig): string {
  const origin = siteOrigin(config)
  return origin ? `${origin}${SOCIAL_IMAGE_PATH}` : SOCIAL_IMAGE_PATH
}

/** Canonical and og:url tags. Empty until siteUrl is a confirmed https URL. */
export function canonicalTags(config: TokenConfig = tokenConfig): string {
  const origin = siteOrigin(config)
  if (!origin) return ''
  const page = escapeAttr(`${origin}/`)
  return `<link rel="canonical" href="${page}" />\n    <meta property="og:url" content="${page}" />`
}

export function applyMetadata(html: string, config: TokenConfig = tokenConfig): string {
  return html
    .replaceAll('%BFRAM_TITLE%', escapeAttr(pageTitle(config)))
    .replaceAll('%BFRAM_DESCRIPTION%', escapeAttr(pageDescription(config)))
    .replaceAll('%BFRAM_IMAGE%', escapeAttr(socialImageUrl(config)))
    .replaceAll('%BFRAM_CANONICAL%', canonicalTags(config))
}
