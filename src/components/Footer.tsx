import { sectionHref } from '../config/paths'
import { telegramLink, xLink, type TokenConfig } from '../config/token'
import { BrandMark } from './BrandMark'
import { ExternalLink } from './ExternalLink'
import { TelegramIcon, XIcon } from './Icons'

export function Footer({ config }: { config: TokenConfig }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <a className="brand-link" href={sectionHref('top')}>
            <BrandMark config={config} large />
          </a>
          <p className="footer-tagline">
            <span className="tone-cream">Big horns.</span>{' '}
            <span className="tone-orange">Tiny helmets.</span>{' '}
            <span className="tone-teal">Maximum rumble.</span>
          </p>
        </div>
        <div className="footer-social">
          <ExternalLink link={telegramLink(config)} icon={<TelegramIcon />} />
          <ExternalLink link={xLink(config)} icon={<XIcon />} />
        </div>
      </div>
    </footer>
  )
}
