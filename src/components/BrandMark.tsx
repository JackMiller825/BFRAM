import { assetDimensions, assets } from '../config/assets'
import { displayTicker, type TokenConfig } from '../config/token'

export function BrandMark({ config, large = false }: { config: TokenConfig; large?: boolean }) {
  return (
    <span className={large ? 'brand-mark is-large' : 'brand-mark'}>
      <img
        src={assets.logo}
        alt=""
        width={assetDimensions.logo.width}
        height={assetDimensions.logo.height}
      />
      <span className="brand-text">
        <span className="brand-name">{config.name}</span>
        <span className="brand-ticker">{displayTicker(config)}</span>
      </span>
    </span>
  )
}
