import { describe, expect, it } from 'vitest'
import { applyMetadata, canonicalTags, escapeAttr, pageDescription, pageTitle, socialImageUrl } from './metadata'
import { tokenConfig, type TokenConfig } from './token'

describe('page metadata', () => {
  it('uses the approved title and description with the GitHub Pages URL', () => {
    expect(pageTitle(tokenConfig)).toBe('BuffaRumble ($BFRAM) | Big horns. Tiny helmets.')
    expect(pageDescription(tokenConfig)).toBe(
      'Meet BuffaRumble ($BFRAM), an independent Ethereum meme community. Pick Team Buffalo or Team Ram. Big horns. Tiny helmets. Maximum rumble.',
    )
    expect(canonicalTags(tokenConfig)).toContain('href="https://jackmiller825.github.io/BFRAM/"')
    expect(socialImageUrl(tokenConfig)).toBe(
      'https://jackmiller825.github.io/BFRAM/assets/bfram/bfram-banner-1100x520.png',
    )
  })

  it('emits absolute canonical and social image URLs only for a confirmed https site URL', () => {
    const config: TokenConfig = { ...tokenConfig, siteUrl: 'https://buffarumble.example/play/' }
    expect(canonicalTags(config)).toContain('href="https://buffarumble.example/play/"')
    expect(canonicalTags(config)).toContain('property="og:url" content="https://buffarumble.example/play/"')
    expect(socialImageUrl(config)).toBe('https://buffarumble.example/play/assets/bfram/bfram-banner-1100x520.png')
    expect(canonicalTags({ ...tokenConfig, siteUrl: 'http://buffarumble.example' })).toBe('')
  })

  it('replaces index placeholders and escapes attribute values', () => {
    expect(escapeAttr('a&b"<')).toBe('a&amp;b&quot;&lt;')
    const html = applyMetadata(
      '<title>%BFRAM_TITLE%</title>%BFRAM_CANONICAL%<meta content="%BFRAM_IMAGE%" />',
      { ...tokenConfig, siteUrl: 'https://example.com/a?b=1&c=2' },
    )
    expect(html).toContain('BuffaRumble ($BFRAM)')
    expect(html).toContain('https://example.com/a/')
    expect(html).not.toContain('%BFRAM_')
  })
})
