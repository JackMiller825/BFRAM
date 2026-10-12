import { assetDimensions, assets } from '../config/assets'
import { sectionHref } from '../config/paths'
import { ArrowIcon } from './Icons'
import { ButtonLink } from './ButtonLink'
import { Section } from './Section'

export function Story() {
  return (
    <Section id="story" className="story section-cream" labelledBy="story-title">
      <p className="eyebrow">THE ORIGIN STORY</p>
      <h2 id="story-title">Two horns. One ridiculous rivalry.</h2>
      <div className="story-layout">
        <div className="story-characters">
          <img
            className="framed-banner"
            src={assets.pickYourSide}
            alt="Buffalo and ram mascots face off over a football, labeled Team Buffalo and Team Ram."
            width={assetDimensions.pickYourSide.width}
            height={assetDimensions.pickYourSide.height}
            loading="lazy"
            decoding="async"
          />
          <div className="character-grid">
            <article className="character-card character-buffalo">
              <h3>THE BUFFALO</h3>
              <p>Big energy. Tiny helmet.</p>
            </article>
            <article className="character-card character-ram">
              <h3>THE RAM</h3>
              <p>Curly horns. Zero chill.</p>
            </article>
          </div>
        </div>
        <div className="story-copy">
          <h3>A friendly face-off on Ethereum.</h3>
          <p>
            BuffaRumble turns a buffalo-and-ram rivalry into an original community meme. Two oversized personalities.
            One undersized football.
          </p>
          <p className="story-label">FICTIONAL MASCOT STORY</p>
          <p>The buffalo brought the noise. The ram brought the attitude. Neither brought a helmet that fits.</p>
          <ButtonLink href={sectionHref('token')} variant="secondary">
            <span>Explore the playbook</span>
            <ArrowIcon />
          </ButtonLink>
        </div>
      </div>
    </Section>
  )
}
