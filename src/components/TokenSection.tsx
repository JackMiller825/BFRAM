import { useEffect, useRef, useState } from 'react'
import {
  chartLink,
  contractCopyText,
  displayFact,
  displayTax,
  explorerLink,
  tradeLink,
  type TokenConfig,
} from '../config/token'
import { ChartIcon, CopyIcon, DocumentIcon, ExplorerIcon, LockIcon, PeopleIcon, SupplyIcon, SwapIcon, TaxIcon } from './Icons'
import { ExternalLink } from './ExternalLink'
import { Section } from './Section'
import { TokenFactCard } from './TokenFactCard'

async function writeClipboard(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return
    }
  } catch {
    // The Clipboard API can reject when the page is not focused. Fall back below.
  }
  const area = document.createElement('textarea')
  area.value = value
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '0'
  area.style.left = '0'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.focus()
  area.select()
  const copied = document.execCommand('copy')
  area.remove()
  if (!copied) throw new Error('Clipboard API is unavailable.')
}

export function TokenSection({ config }: { config: TokenConfig }) {
  const copyText = contractCopyText(config)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const resetTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    }
  }, [])

  async function onCopy() {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    try {
      await writeClipboard(copyText)
      setCopyState('copied')
      resetTimer.current = window.setTimeout(() => setCopyState('idle'), 2500)
    } catch {
      setCopyState('failed')
    }
  }

  const copyLabel = copyState === 'copied' ? 'Copied!' : 'Copy address'
  const liveMessage =
    copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Could not copy. Select and copy the address manually.' : ''

  return (
    <Section id="token" className="token section-dark" labelledBy="token-title">
      <div className="token-yard" aria-hidden="true" />
      <p className="eyebrow">TOKENOMICS</p>
      <div className="section-heading">
        <h2 id="token-title">Know the playbook.</h2>
        <p className="lede">The essentials, without the guesswork.</p>
      </div>
      <div className="fact-grid">
        <TokenFactCard label="Total supply" value={displayFact(config.totalSupply)} icon={<SupplyIcon />} accent="orange" />
        <TokenFactCard label="Buy / sell tax" value={displayTax(config)} icon={<TaxIcon />} accent="teal" />
        <TokenFactCard label="Liquidity status" value={displayFact(config.liquidityStatus)} icon={<LockIcon />} accent="orange" />
        <TokenFactCard label="Ownership status" value={displayFact(config.ownershipStatus)} icon={<PeopleIcon />} accent="teal" />
      </div>
      <article className="contract-row">
        <div className="contract-copy">
          <div className="fact-icon" aria-hidden="true">
            <DocumentIcon />
          </div>
          <div>
            <h3>Contract address</h3>
            <p className="contract-address">{copyText}</p>
          </div>
        </div>
        <button type="button" className="btn btn-copy" onClick={onCopy}>
          <CopyIcon />
          <span>{copyLabel}</span>
        </button>
      </article>
      <p id="contract-copy-status" className="copy-status" role="status" aria-live="polite">
        {liveMessage}
      </p>
      <div className="link-row">
        <ExternalLink link={tradeLink(config)} icon={<SwapIcon />} />
        <ExternalLink link={chartLink(config)} icon={<ChartIcon />} />
        <ExternalLink link={explorerLink(config)} icon={<ExplorerIcon />} />
      </div>
    </Section>
  )
}
