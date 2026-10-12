import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assetDimensions, assets } from './assets'

const publicDir = join(process.cwd(), 'public')

function pngInfo(publicPath: string) {
  const relative = publicPath.replace(import.meta.env.BASE_URL, '')
  const buf = readFileSync(join(publicDir, relative))
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25],
  }
}

describe('production assets', () => {
  it('keeps brand files at their verified dimensions', () => {
    expect(pngInfo(assets.logo)).toMatchObject({ ...assetDimensions.logo, colorType: 6 })
    expect(pngInfo(assets.bannerHero)).toMatchObject({ ...assetDimensions.bannerHero, colorType: 2 })
    expect(pngInfo(assets.bannerWide)).toMatchObject({ ...assetDimensions.bannerWide, colorType: 2 })
    expect(pngInfo(assets.pickYourSide)).toMatchObject(assetDimensions.pickYourSide)
    expect(pngInfo(assets.trainingDay)).toMatchObject(assetDimensions.trainingDay)
  })

  it('ships every community image at 1100 by 520', () => {
    const files = readdirSync(join(publicDir, 'assets', 'bfram', 'community'))
      .filter((name) => name.endsWith('.png'))
      .sort()
    expect(files).toEqual([
      '01-bfram-tg-welcome.png',
      '02-bfram-tg-pick-your-side.png',
      '03-bfram-tg-tiny-helmets.png',
      '04-bfram-tg-caption-this.png',
      '05-bfram-tg-football-interview.png',
      '06-bfram-tg-training-day.png',
      '07-bfram-tg-snack-truce.png',
      '08-bfram-tg-gm-herd.png',
      '09-bfram-tg-meme-workshop.png',
      '10-bfram-tg-bring-a-friend.png',
    ])
    for (const name of files) {
      expect(pngInfo(`/assets/bfram/community/${name}`)).toMatchObject({ width: 1100, height: 520 })
    }
  })
})
