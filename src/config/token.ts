/**
 * Single source of truth for BuffaRumble token facts and official links.
 *
 * Unconfirmed values stay null. Do not invent supply, tax, liquidity,
 * ownership, dates, member counts, or URLs.
 *
 * contractConfirmed — set true only after the address is officially confirmed.
 * A syntactically valid address alone does not enable copy.
 *
 * tradingConfirmed — set true only when trading is officially available.
 * Trading also requires a confirmed valid address and an https tradeUrl.
 *
 * Telegram, X, chart, explorer, and site URLs enable their own controls when
 * they are valid https links. siteUrl also emits absolute canonical and
 * social-image URLs at build time. It is the GitHub Pages project URL.
 */

export const PENDING = 'Pending confirmation'

export type LaunchStatus = 'prelaunch' | 'live'

export type TokenConfig = {
  name: string
  ticker: string
  network: string
  chainId: number
  tagline: string
  launchStatus: LaunchStatus
  contractAddress: string | null
  totalSupply: string | null
  buyTax: string | null
  sellTax: string | null
  liquidityStatus: string | null
  ownershipStatus: string | null
  launchAt: string | null
  telegramUrl: string | null
  xUrl: string | null
  tradeUrl: string | null
  chartUrl: string | null
  explorerUrl: string | null
  siteUrl: string | null
  contractConfirmed: boolean
  tradingConfirmed: boolean
}

export const tokenConfig: TokenConfig = {
  name: 'BuffaRumble',
  ticker: 'BFRAM',
  network: 'Ethereum mainnet',
  chainId: 1,
  tagline: 'Big horns. Tiny helmets. Maximum rumble.',
  launchStatus: 'prelaunch',
  contractAddress: null,
  totalSupply: null,
  buyTax: null,
  sellTax: null,
  liquidityStatus: null,
  ownershipStatus: null,
  launchAt: null,
  telegramUrl: null,
  xUrl: null,
  tradeUrl: null,
  chartUrl: null,
  explorerUrl: null,
  siteUrl: 'https://jackmiller825.github.io/BFRAM',
  contractConfirmed: false,
  tradingConfirmed: false,
}

export type LinkState = {
  href: string
  label: string
  pendingLabel: string
  available: boolean
}

export type ConfigDiagnostic = {
  field: string
  message: string
}

export type FaqItem = {
  id: string
  question: string
  answer: string
}

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export function displayTicker(config: TokenConfig = tokenConfig): string {
  const raw = config.ticker.trim().replace(/^\$+/, '')
  return `$${raw}`
}

export function isEthereumAddress(value: string | null | undefined): value is string {
  return typeof value === 'string' && ADDRESS_PATTERN.test(value.trim())
}

export function isHttpsUrl(value: string | null | undefined): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:') return false
    if (url.username || url.password) return false
    if (!url.hostname) return false
    return true
  } catch {
    return false
  }
}

export function confirmedAddress(config: TokenConfig): string | null {
  if (!config.contractConfirmed) return null
  const raw = config.contractAddress?.trim() ?? ''
  return isEthereumAddress(raw) ? raw : null
}

export function canCopyContract(config: TokenConfig): boolean {
  return confirmedAddress(config) !== null
}

export function canTrade(config: TokenConfig): boolean {
  return canCopyContract(config) && config.tradingConfirmed === true && isHttpsUrl(config.tradeUrl)
}

function link(available: boolean, href: string | null, label: string, pendingLabel: string): LinkState {
  return {
    href: available && href ? href.trim() : '',
    label,
    pendingLabel,
    available,
  }
}

export function tradeLink(config: TokenConfig): LinkState {
  return link(canTrade(config), config.tradeUrl, `Trade ${displayTicker(config)}`, 'Trading link pending')
}

export function chartLink(config: TokenConfig): LinkState {
  return link(isHttpsUrl(config.chartUrl), config.chartUrl, 'View chart', 'Chart link pending')
}

export function explorerLink(config: TokenConfig): LinkState {
  return link(isHttpsUrl(config.explorerUrl), config.explorerUrl, 'View contract', 'Explorer link pending')
}

export function telegramLink(config: TokenConfig): LinkState {
  return link(isHttpsUrl(config.telegramUrl), config.telegramUrl, 'Telegram', 'Telegram — link pending')
}

export function xLink(config: TokenConfig): LinkState {
  return link(isHttpsUrl(config.xUrl), config.xUrl, 'X', 'X — link pending')
}

export function displayFact(value: string | null | undefined): string {
  if (typeof value !== 'string') return PENDING
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : PENDING
}

export function displayTax(config: TokenConfig): string {
  const buy = typeof config.buyTax === 'string' ? config.buyTax.trim() : ''
  const sell = typeof config.sellTax === 'string' ? config.sellTax.trim() : ''
  if (!buy && !sell) return PENDING
  return `${buy || PENDING} / ${sell || PENDING}`
}

export function contractStatusLine(config: TokenConfig): string {
  const address = confirmedAddress(config)
  return address ? `Contract address: ${address}` : 'Contract address: Pending confirmation'
}

export function tokenDetailsNote(config: TokenConfig): string {
  const factsPending =
    displayFact(config.totalSupply) === PENDING ||
    displayTax(config) === PENDING ||
    displayFact(config.liquidityStatus) === PENDING ||
    displayFact(config.ownershipStatus) === PENDING ||
    !canCopyContract(config) ||
    !canTrade(config)
  if (factsPending) return 'Details pending confirmation. Verify official information before trading.'
  return 'Verify official information before trading.'
}

export function socialHelper(config: TokenConfig): string | null {
  const telegramReady = isHttpsUrl(config.telegramUrl)
  const xReady = isHttpsUrl(config.xUrl)
  if (telegramReady && xReady) return null
  if (telegramReady || xReady) return 'Some official links are still pending confirmation.'
  return 'Official links will appear here once confirmed.'
}

export function faqItems(config: TokenConfig): FaqItem[] {
  const address = confirmedAddress(config)
  const contractAnswer = address
    ? `The confirmed contract address is ${address}. Only use this verified address.`
    : 'The contract address is pending confirmation. Only use the verified address published here once available.'
  const tradeAnswer = canTrade(config)
    ? `Trading is available through the official Trade ${displayTicker(config)} link on this page. Verify the contract address and transaction details before you swap.`
    : 'Trading availability and the official trading link are pending confirmation.'

  return [
    {
      id: 'what',
      question: 'What is BuffaRumble?',
      answer:
        'BuffaRumble is an independent Ethereum meme project built around a fictional buffalo-and-ram rivalry. The mascots, jokes and community are the story.',
    },
    {
      id: 'sports',
      question: 'Is this an official sports project?',
      answer: 'No. It is an independent project with no team or league affiliation.',
    },
    {
      id: 'contract',
      question: 'Where is the contract address?',
      answer: contractAnswer,
    },
    {
      id: 'trade',
      question: `When can I trade ${displayTicker(config)}?`,
      answer: tradeAnswer,
    },
  ]
}

/** Public site root when siteUrl is a confirmed https URL. No trailing slash. */
export function siteOrigin(config: TokenConfig): string | null {
  if (!isHttpsUrl(config.siteUrl)) return null
  const url = new URL(config.siteUrl.trim())
  const path = url.pathname.replace(/\/+$/, '')
  return `${url.origin}${path}`
}

export function getConfigDiagnostics(config: TokenConfig): ConfigDiagnostic[] {
  const issues: ConfigDiagnostic[] = []

  if (config.contractAddress && !isEthereumAddress(config.contractAddress)) {
    issues.push({
      field: 'contractAddress',
      message:
        'Contract address is not a valid Ethereum address (0x and 40 hex characters). Copy stays unavailable.',
    })
  }

  if (isEthereumAddress(config.contractAddress) && !config.contractConfirmed) {
    issues.push({
      field: 'contractConfirmed',
      message:
        'A contract address is present but contractConfirmed is false. Copy stays unavailable until the address is officially confirmed.',
    })
  }

  if (config.contractConfirmed && !isEthereumAddress(config.contractAddress)) {
    issues.push({
      field: 'contractConfirmed',
      message: 'contractConfirmed is true but contractAddress is missing or invalid. Copy stays unavailable.',
    })
  }

  const urlFields = ['telegramUrl', 'xUrl', 'tradeUrl', 'chartUrl', 'explorerUrl', 'siteUrl'] as const
  for (const field of urlFields) {
    const value = config[field]
    if (value && !isHttpsUrl(value)) {
      issues.push({
        field,
        message: `${field} must be a valid https URL without embedded credentials. The control stays unavailable.`,
      })
    }
  }

  if (config.tradingConfirmed && !canCopyContract(config)) {
    issues.push({
      field: 'tradingConfirmed',
      message: 'Trading is marked available but the contract address is not confirmed. Trading stays unavailable.',
    })
  }

  if (config.tradingConfirmed && !isHttpsUrl(config.tradeUrl)) {
    issues.push({
      field: 'tradeUrl',
      message: 'Trading is marked available but tradeUrl is missing or not a valid https URL. Trading stays unavailable.',
    })
  }

  if (isHttpsUrl(config.tradeUrl) && !config.tradingConfirmed) {
    issues.push({
      field: 'tradingConfirmed',
      message:
        'A trade URL is present but tradingConfirmed is false. Trading stays unavailable until availability is explicitly confirmed.',
    })
  }

  if (config.launchAt && Number.isNaN(Date.parse(config.launchAt))) {
    issues.push({
      field: 'launchAt',
      message: 'launchAt is not a valid date and is not shown on the page.',
    })
  }

  return issues
}
