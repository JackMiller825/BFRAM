import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { TokenSection } from './components/TokenSection'
import { tokenConfig, type TokenConfig } from './config/token'

const ADDRESS = `0x${'ab'.repeat(20)}`

function readyConfig(): TokenConfig {
  return {
    ...tokenConfig,
    contractAddress: ADDRESS,
    contractConfirmed: true,
    tradingConfirmed: true,
    tradeUrl: 'https://trade.example/bfram',
    chartUrl: 'https://charts.example/bfram',
    explorerUrl: 'https://etherscan.io/token/bfram',
    telegramUrl: 'https://t.me/bfram',
    xUrl: 'https://x.com/bfram',
  }
}

describe('BuffaRumble page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the pending homepage without fake external links', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: /Big horns/ })).toBeInTheDocument()
    expect(screen.queryByText('Pre-launch. Official launch details pending confirmation.')).not.toBeInTheDocument()
    expect(screen.queryByText('Independent characters. No team or league affiliation.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tokenomics' })).toBeInTheDocument()
    expect(screen.getByText('1,000,000,000')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('Burn')).toBeInTheDocument()
    expect(screen.getByText('Renounce')).toBeInTheDocument()
    expect(screen.getByText('Coming Soon..')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy address' })).toBeEnabled()
    expect(screen.queryByText('Details pending confirmation. Verify official information before trading.')).not.toBeInTheDocument()
    expect(screen.queryByText('Start with the basics. Verify every link.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Contract address:/)).not.toBeInTheDocument()
    expect(screen.queryByText('Your choice stays on this device. This is not a live vote.')).not.toBeInTheDocument()
    expect(screen.queryByText('Official links will appear here once confirmed.')).not.toBeInTheDocument()
    expect(screen.queryByText('Memes')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Common questions.' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Explore' })).not.toBeInTheDocument()
    expect(screen.queryByText('Independent meme project. No team or league affiliation.')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Back to top' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Trading link pending' }).every((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getAllByRole('button', { name: 'Telegram — link pending' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /Trade \$BFRAM/ })).not.toBeInTheDocument()

    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).not.toBe('#')
      expect(link.getAttribute('href')).not.toBe('')
    }

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('copies Coming Soon when the contract address is not published', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Copy address' }))
    expect(writeText).toHaveBeenCalledWith('Coming Soon..')
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()

    render(<TokenSection config={{ ...tokenConfig, contractAddress: ADDRESS, contractConfirmed: false }} />)
    await user.click(screen.getAllByRole('button', { name: 'Copy address' })[0]!)
    expect(writeText).toHaveBeenCalledWith(ADDRESS)
  })

  it('opens the menu, moves with the keyboard, and restores focus on Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    const opener = screen.getByRole('button', { name: 'Open menu' })
    await user.click(opener)
    const closer = screen.getByRole('button', { name: 'Close menu' })
    expect(closer).toHaveAttribute('aria-expanded', 'true')

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    await user.click(within(nav).getByRole('link', { name: 'Tokenomics' }))
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus()
  })

  it('stores a local team choice and still works when storage is blocked', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('radio', { name: /Team Ram/ }))
    expect(screen.getByText('You picked Team Ram.')).toBeInTheDocument()
    expect(localStorage.getItem('bfram-team')).toBe('ram')
    unmount()

    render(<App />)
    expect(screen.getByRole('radio', { name: /Team Ram/ })).toBeChecked()
    expect(screen.getByText('You picked Team Ram.')).toBeInTheDocument()

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<App />)
    await user.click(screen.getAllByRole('radio', { name: /Team Buffalo/ })[0]!)
    expect(screen.getAllByText('You picked Team Buffalo.').length).toBeGreaterThan(0)
  })

  it('enables confirmed links and reports clipboard success and failure', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<App config={readyConfig()} />)
    const trade = screen.getAllByRole('link', { name: 'Trade $BFRAM' })
    expect(trade[0]).toHaveAttribute('href', 'https://trade.example/bfram')
    expect(trade[0]).toHaveAttribute('target', '_blank')
    expect(trade[0]?.getAttribute('rel')).toContain('noopener')
    expect(screen.getByRole('link', { name: 'View chart' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View contract' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Trading link pending' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Copy address' }))
    expect(writeText).toHaveBeenCalledWith(ADDRESS)
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    expect(screen.getAllByText('Copied!').length).toBeGreaterThan(0)
    expect(screen.getByText(ADDRESS)).toBeInTheDocument()

    writeText.mockRejectedValueOnce(new Error('denied'))
    Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false })
    render(<TokenSection config={readyConfig()} />)
    await user.click(screen.getAllByRole('button', { name: 'Copy address' })[0]!)
    expect(screen.getByText('Could not copy. Select and copy the address manually.')).toBeInTheDocument()
    expect(screen.getAllByText(ADDRESS).length).toBeGreaterThan(0)
  })

  it('resets the copied label and stays up when configuration is invalid', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    render(<TokenSection config={readyConfig()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy address' }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(screen.getByRole('button', { name: 'Copy address' })).toBeInTheDocument()
    vi.useRealTimers()

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<App config={{ ...tokenConfig, contractAddress: 'not-an-address', tradeUrl: 'notaurl', tradingConfirmed: true }} />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Copy address' }).every((button) => !button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getAllByRole('button', { name: 'Trading link pending' })[0]).toBeDisabled()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })
})
