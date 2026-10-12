import { assetDimensions, assets } from '../config/assets'
import { sectionHref } from '../config/paths'
import { displayTicker, type TokenConfig } from '../config/token'
import { ArrowIcon } from './Icons'
import { ButtonLink } from './ButtonLink'

export function Hero({ config }: { config: TokenConfig }) {
  return (
    <section id="top" className="hero section section-dark" aria-labelledby="hero-title" tabIndex={-1}>
      <div className="hero-sun" aria-hidden="true" />
      <div className="hero-rays" aria-hidden="true" />
      <div className="hero-yard" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">
            {config.name.toUpperCase()} / {displayTicker(config)}
          </p>
          <h1 id="hero-title">
            <span className="tone-cream">Big horns.</span>
            <span className="tone-orange">Tiny helmets.</span>
            <span className="tone-teal">Maximum rumble.</span>
          </h1>
          <p className="hero-support">A buffalo. A ram. One very small football.</p>
          <p className="hero-support">An independent Ethereum community meme.</p>
          <div className="hero-actions">
            <ButtonLink href={sectionHref('community')}>
              <span>Meet the herd</span>
              <ArrowIcon />
            </ButtonLink>
            <ButtonLink href={sectionHref('how-to-buy')} variant="secondary">
              How to buy
            </ButtonLink>
          </div>
        </div>
        <div className="hero-frame">
          <img
            src={assets.bannerHero}
            alt="Buffalo and ram in tiny helmets facing off over a football."
            width={assetDimensions.bannerHero.width}
            height={assetDimensions.bannerHero.height}
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </div>
      <p className="ticker">
        <span className="ticker-rule" aria-hidden="true" />
        <span>BUFFALO ENERGY • RAM ATTITUDE • {displayTicker(config)}</span>
        <span className="ticker-rule" aria-hidden="true" />
      </p>
    </section>
  )
}
