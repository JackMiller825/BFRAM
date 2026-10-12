import { describe, expect, it } from 'vitest'
import {
  canCopyContract,
  canTrade,
  chartLink,
  confirmedAddress,
  contractCopyText,
  contractStatusLine,
  displayTax,
  displayTicker,
  explorerLink,
  faqItems,
  getConfigDiagnostics,
  socialHelper,
  telegramLink,
  tokenConfig,
  tokenDetailsNote,
  tradeLink,
  xLink,
  type TokenConfig,
} from './token'

const ADDRESS = `0x${'ab'.repeat(20)}`

function withConfig(overrides: Partial<TokenConfig>): TokenConfig {
  return { ...tokenConfig, ...overrides }
}

describe('token configuration', () => {
  it('formats the raw ticker with a single dollar prefix', () => {
    expect(tokenConfig.ticker).toBe('BFRAM')
    expect(displayTicker(tokenConfig)).toBe('$BFRAM')
    expect(displayTicker(withConfig({ ticker: '$BFRAM' }))).toBe('$BFRAM')
  })

  it('keeps copy and trading unavailable in the default pending state', () => {
    expect(canCopyContract(tokenConfig)).toBe(false)
    expect(canTrade(tokenConfig)).toBe(false)
    expect(tradeLink(tokenConfig)).toMatchObject({ available: false, pendingLabel: 'Trading link pending', href: '' })
    expect(chartLink(tokenConfig).pendingLabel).toBe('Chart link pending')
    expect(explorerLink(tokenConfig).pendingLabel).toBe('Explorer link pending')
    expect(telegramLink(tokenConfig).pendingLabel).toBe('Telegram — link pending')
    expect(xLink(tokenConfig).pendingLabel).toBe('X — link pending')
    expect(contractCopyText(tokenConfig)).toBe('Coming Soon..')
    expect(contractStatusLine(tokenConfig)).toBe('Contract address: Coming Soon..')
    expect(getConfigDiagnostics(tokenConfig)).toEqual([])
  })

  it('copies a valid address even when it is not confirmed', () => {
    const config = withConfig({ contractAddress: ADDRESS, contractConfirmed: false })
    expect(confirmedAddress(config)).toBeNull()
    expect(canCopyContract(config)).toBe(false)
    expect(contractCopyText(config)).toBe(ADDRESS)
    expect(getConfigDiagnostics(config).some((issue) => issue.field === 'contractConfirmed')).toBe(true)
  })

  it('does not enable copy when confirmation is set on an invalid address', () => {
    const config = withConfig({ contractAddress: '0x123', contractConfirmed: true })
    expect(canCopyContract(config)).toBe(false)
    expect(getConfigDiagnostics(config).map((issue) => issue.field)).toContain('contractAddress')
  })

  it('enables copy only for a confirmed valid address', () => {
    const config = withConfig({ contractAddress: `  ${ADDRESS}  `, contractConfirmed: true })
    expect(canCopyContract(config)).toBe(true)
    expect(confirmedAddress(config)).toBe(ADDRESS)
    expect(contractStatusLine(config)).toBe(`Contract address: ${ADDRESS}`)
  })

  it('requires an explicit trading flag, confirmed address, and https trade URL', () => {
    const addressOnly = withConfig({
      contractAddress: ADDRESS,
      contractConfirmed: true,
      tradeUrl: 'https://trade.example/bfram',
      tradingConfirmed: false,
    })
    expect(canTrade(addressOnly)).toBe(false)

    const httpTrade = withConfig({
      contractAddress: ADDRESS,
      contractConfirmed: true,
      tradeUrl: 'http://trade.example/bfram',
      tradingConfirmed: true,
    })
    expect(canTrade(httpTrade)).toBe(false)

    const ready = withConfig({
      contractAddress: ADDRESS,
      contractConfirmed: true,
      tradeUrl: 'https://trade.example/bfram',
      tradingConfirmed: true,
    })
    expect(tradeLink(ready)).toMatchObject({
      available: true,
      href: 'https://trade.example/bfram',
      label: 'Trade $BFRAM',
    })
  })

  it('enables social, chart, and explorer links only for valid https URLs', () => {
    const config = withConfig({
      telegramUrl: 'https://t.me/example',
      xUrl: 'javascript:alert(1)',
      chartUrl: 'https://charts.example/bfram',
      explorerUrl: 'https://user:pass@etherscan.io/token',
    })
    expect(telegramLink(config).available).toBe(true)
    expect(xLink(config).available).toBe(false)
    expect(chartLink(config)).toMatchObject({ available: true, label: 'View chart' })
    expect(explorerLink(config).available).toBe(false)
    expect(socialHelper(config)).toBe('Some official links are still pending confirmation.')
    expect(socialHelper(withConfig({ telegramUrl: 'https://t.me/a', xUrl: 'https://x.com/a' }))).toBeNull()
  })

  it('derives FAQ answers from confirmed contract and trading facts', () => {
    const pending = faqItems(tokenConfig)
    expect(pending[0]?.question).toBe('What is BuffaRumble?')
    expect(pending[2]?.answer).toMatch(/pending confirmation/)
    expect(pending[3]?.answer).toMatch(/pending confirmation/)

    const ready = faqItems(
      withConfig({
        contractAddress: ADDRESS,
        contractConfirmed: true,
        tradingConfirmed: true,
        tradeUrl: 'https://trade.example/bfram',
      }),
    )
    expect(ready[2]?.answer).toContain(ADDRESS)
    expect(ready[2]?.answer).not.toMatch(/pending confirmation/)
    expect(ready[3]?.answer).toMatch(/Trading is available/)
  })

  it('shows pending tax text until a rate is configured', () => {
    expect(displayTax(tokenConfig)).toBe('0%')
    expect(displayTax(withConfig({ buyTax: null, sellTax: null }))).toBe('Pending confirmation')
    expect(displayTax(withConfig({ buyTax: '1%', sellTax: null }))).toBe('1% / Pending confirmation')
    expect(tokenDetailsNote(withConfig({ totalSupply: null, buyTax: null, sellTax: null }))).toMatch(
      /Details pending confirmation/,
    )
  })
})
