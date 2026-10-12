import { useId, useState } from 'react'
import { assetDimensions, assets } from '../config/assets'
import { faqItems, type TokenConfig } from '../config/token'
import { Section } from './Section'

export function Faq({ config }: { config: TokenConfig }) {
  const items = faqItems(config)
  const baseId = useId()
  const [openIds, setOpenIds] = useState<string[]>([items[0]?.id ?? 'what'])

  function toggle(id: string) {
    setOpenIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <Section id="faq" className="faq section-cream" labelledBy="faq-title">
      <div className="faq-layout">
        <div className="faq-intro">
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title">Common questions.</h2>
          <p className="lede">Less guesswork. More clarity.</p>
          <div className="faq-art" aria-hidden="true">
            <span className="qmark">?</span>
            <img src={assets.logo} alt="" width={assetDimensions.logo.width} height={assetDimensions.logo.height} />
            <span className="qmark qmark-teal">?</span>
          </div>
        </div>
        <div className="faq-list">
          {items.map((item) => {
            const open = openIds.includes(item.id)
            const panelId = `${baseId}-${item.id}`
            const buttonId = `${panelId}-button`
            return (
              <div key={item.id} className={open ? 'faq-item is-open' : 'faq-item'}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggle(item.id)}
                  >
                    <span>{item.question}</span>
                    <span className="faq-symbol" aria-hidden="true">
                      {open ? '–' : '+'}
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
                  <p>{item.answer}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
