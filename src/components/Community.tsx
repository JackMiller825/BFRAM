import { assetDimensions, assets } from '../config/assets'
import { telegramLink, xLink, type TokenConfig } from '../config/token'
import { useTeamPreference, type Team } from '../hooks/useTeamPreference'
import { CheckIcon, TelegramIcon, XIcon } from './Icons'
import { ExternalLink } from './ExternalLink'
import { Section } from './Section'

const TEAMS: { id: Team; name: string; line: string }[] = [
  { id: 'buffalo', name: 'Team Buffalo', line: 'Big energy. Tiny helmet.' },
  { id: 'ram', name: 'Team Ram', line: 'Curly horns. Zero chill.' },
]

export function Community({ config }: { config: TokenConfig }) {
  const { team, choose } = useTeamPreference()
  const feedback = team === 'buffalo' ? 'You picked Team Buffalo.' : team === 'ram' ? 'You picked Team Ram.' : ''

  return (
    <Section id="community" className="community" labelledBy="community-title">
      <div className="community-rays" aria-hidden="true" />
      <div className={`community-accent team-${team ?? 'none'}`} aria-hidden="true" />
      <p className="eyebrow">COMMUNITY</p>
      <div className="section-heading">
        <h2 id="community-title">Pick a side. Join the herd.</h2>
        <p className="lede">Different animals. Same chaotic energy.</p>
      </div>
      <img
        className="framed-banner community-banner"
        src={assets.pickYourSide}
        alt="Shared rivalry artwork with Team Buffalo and Team Ram on either side of a football."
        width={assetDimensions.pickYourSide.width}
        height={assetDimensions.pickYourSide.height}
        loading="lazy"
        decoding="async"
      />
      <div className="community-layout">
        <fieldset className="team-fieldset">
          <legend className="visually-hidden">Pick your mascot</legend>
          <div className="team-grid">
            {TEAMS.map((item) => {
              const selected = team === item.id
              return (
                <label key={item.id} className={selected ? `team-card is-selected team-${item.id}` : `team-card team-${item.id}`}>
                  <input
                    type="radio"
                    name="bfram-team"
                    value={item.id}
                    checked={selected}
                    onChange={() => choose(item.id)}
                  />
                  <span className="team-card-body">
                    <span className="team-name">{item.name}</span>
                    <span className="team-line">{item.line}</span>
                    {selected ? (
                      <span className="selected-mark">
                        <CheckIcon />
                        Selected
                      </span>
                    ) : null}
                  </span>
                </label>
              )
            })}
          </div>
          <p className="team-feedback" role="status" aria-live="polite">
            {feedback}
          </p>
        </fieldset>
        <div className="social-callout">
          <h3>Bring your best banter.</h3>
          <p>Share a meme. Pick your mascot. Keep the rivalry friendly.</p>
          <div className="social-stack">
            <ExternalLink link={telegramLink(config)} icon={<TelegramIcon />} />
            <ExternalLink link={xLink(config)} icon={<XIcon />} />
          </div>
        </div>
      </div>
    </Section>
  )
}
