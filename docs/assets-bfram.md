# BuffaRumble asset record

Verified from the files present in this workspace. Preview and caption files are reference material and are not part of the production bundle.

## Inputs

| Source | Used for |
|---|---|
| `bfram-brand-assets/bfram-logo-transparent.png` | Header, footer, FAQ decoration, favicon |
| `bfram-brand-assets/bfram-banner-3to1.png` | Kept for brand use; not placed as a page section |
| `bfram-brand-assets/bfram-banner-1100x520.png` | Hero artwork and social-image fallback |
| `bfram-brand-assets/brand-info.txt` | Name, ticker, meaning, independence note |
| `bfram-website-previews/` | Design reference, copied to `docs/design/bfram/` |
| `bfram-telegram-post-pack/*.png` | Community artwork in `public/assets/bfram/community/` |
| `bfram-telegram-post-pack/*.txt`, `manifest.json` | Captions copied to `docs/content/bfram/` |

`bfram-12-stickers/` is present locally and is not part of the approved page.

## Deployed files

Runtime URLs are `/assets/bfram/...`. They are not `/public/assets/...`.

| Destination | Dimensions | Notes |
|---|---|---|
| `public/assets/bfram/bfram-logo-transparent.png` | 1024 × 1024 RGBA | Unchanged copy |
| `public/assets/bfram/bfram-banner-3to1.png` | 1500 × 500 RGB | Unchanged copy |
| `public/assets/bfram/bfram-banner-1100x520.png` | 1100 × 520 RGB | Unchanged copy |
| `public/assets/bfram/community/01`–`10` `*-bfram-tg-*.png` | 1100 × 520 | Unchanged copies |

The page displays the hero banner, `02-bfram-tg-pick-your-side.png` (story and community), and `06-bfram-tg-training-day.png` (below the buy steps). The other community images stay available and are not given extra sections. Promotional captions are not website copy.

## Missing proposed art and substitutions

These files were not in the supplied packs and are not referenced as if they exist.

| Missing file | Substitution |
|---|---|
| `bfram-wordmark-transparent.png` | HTML “BuffaRumble” and “$BFRAM” beside the logo |
| `bfram-hero-duo-transparent.png` | Intact 1100 × 520 banner in the hero frame, not cropped or animated |
| `bfram-buffalo-portrait.png` and `bfram-ram-portrait.png` | HTML character cards beside one shared pick-your-side image |
| `bfram-faq-ram-transparent.png` | Existing logo with CSS question marks |
| `bfram-peeking-duo-transparent.png` | Training-day banner below the buy steps |
| `bfram-stadium-background.webp` | CSS sunset rays and faint yard lines |
| `bfram-field-divider-transparent.png` | CSS teal ticker and field lines |
| `bfram-og-image.png` | Existing 1100 × 520 banner, with those metadata dimensions |

## Social URL configuration

`siteUrl` in `src/config/token.ts` is `https://jackmiller825.github.io/BFRAM`. The production build emits absolute canonical, `og:url`, and social-image URLs. The social image is the 1100 × 520 banner.
