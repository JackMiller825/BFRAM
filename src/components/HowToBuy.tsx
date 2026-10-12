import { assetDimensions, assets } from '../config/assets'
import { displayTicker, tradeLink, type TokenConfig } from '../config/token'
import { EthIcon, SearchIcon, SwapIcon, WalletIcon } from './Icons'
import { ExternalLink } from './ExternalLink'
import { Section } from './Section'

export function HowToBuy({ config }: { config: TokenConfig }) {
  const steps = [
    {
      title: 'Get a wallet',
      body: 'Use a compatible Ethereum wallet. Keep your recovery phrase private.',
      icon: <WalletIcon />,
    },
    {
      title: 'Add ETH',
      body: 'Use Ethereum mainnet. Leave enough ETH for network fees.',
      icon: <EthIcon />,
    },
    {
      title: `Verify ${displayTicker(config)}`,
      body: 'Match the contract address against the confirmed official links.',
      icon: <SearchIcon />,
    },
    {
      title: 'Review and swap',
      body: 'Check the token, fees and transaction details before confirming.',
      icon: <SwapIcon />,
    },
  ]
  return (
    <Section id="how-to-buy" className="buy section-cream" labelledBy="buy-title">
      <p className="eyebrow">HOW TO BUY</p>
      <div className="section-heading">
        <h2 id="buy-title">Four steps to the huddle.</h2>
      </div>
      <ol className="step-grid">
        {steps.map((step, index) => (
          <li key={step.title} className="step-card">
            <div className="step-top">
              <span className="step-number">{index + 1}</span>
              <span className="step-icon" aria-hidden="true">
                {step.icon}
              </span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="buy-status">
        <ExternalLink link={tradeLink(config)} icon={<SwapIcon />} />
      </div>
      <img
        className="framed-banner training-banner"
        src={assets.trainingDay}
        alt="Buffalo mascot runs into a tackling dummy while the ram studies a playbook, both wearing tiny helmets."
        width={assetDimensions.trainingDay.width}
        height={assetDimensions.trainingDay.height}
        loading="lazy"
        decoding="async"
      />
    </Section>
  )
}
