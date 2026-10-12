/** Public file path, prefixed with the Vite base so GitHub Pages project URLs resolve. */
function publicAsset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

/** Verified production asset URLs. Filenames are case-sensitive. */
export const assets = {
  logo: publicAsset('assets/bfram/bfram-logo-transparent.png'),
  bannerWide: publicAsset('assets/bfram/bfram-banner-3to1.png'),
  bannerHero: publicAsset('assets/bfram/bfram-banner-1100x520.png'),
  pickYourSide: publicAsset('assets/bfram/community/02-bfram-tg-pick-your-side.png'),
  trainingDay: publicAsset('assets/bfram/community/06-bfram-tg-training-day.png'),
} as const

export const assetDimensions = {
  logo: { width: 1024, height: 1024 },
  bannerWide: { width: 1500, height: 500 },
  bannerHero: { width: 1100, height: 520 },
  pickYourSide: { width: 1100, height: 520 },
  trainingDay: { width: 1100, height: 520 },
} as const
