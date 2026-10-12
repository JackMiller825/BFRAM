import { sectionHref } from '../config/paths'
import { telegramLink, xLink, type TokenConfig } from '../config/token'
import { BrandMark } from './BrandMark'
import { ExternalLink } from './ExternalLink'
import { TelegramIcon, UpIcon, XIcon } from './Icons'

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
        <nav aria-label="Explore">
          <p className="footer-heading">Explore</p>
          <ul>
            <li>
              <a href={sectionHref('story')}>Story</a>
            </li>
            <li>
              <a href={sectionHref('token')}>Token</a>
            </li>
            <li>
              <a href={sectionHref('how-to-buy')}>How to buy</a>
            </li>
          </ul>
        </nav>
        <nav aria-label="Community">
          <p className="footer-heading">Community</p>
          <ul>
            <li>
              <a href={sectionHref('community')}>Community</a>
            </li>
            <li>
              <a href={sectionHref('faq')}>FAQ</a>
            </li>
          </ul>
        </nav>
        <div className="footer-social">
          <ExternalLink link={telegramLink(config)} icon={<TelegramIcon />} />
          <ExternalLink link={xLink(config)} icon={<XIcon />} />
        </div>
      </div>
      <div className="container footer-base">
        <div>
          <p>Independent meme project. No team or league affiliation.</p>
          <p>Crypto assets carry risk. No returns are promised.</p>
        </div>
        <a className="back-to-top" href={sectionHref('top')}>
          <UpIcon />
          <span>Back to top</span>
        </a>
      </div>
    </footer>
  )
}
