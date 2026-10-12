const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', '0.0.0.0', '::1', 'metadata.google.internal'])

function ipv4Parts(host: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!match) return null
  const parts = match.slice(1).map((part) => Number(part))
  if (parts.some((part) => part > 255)) return null
  return parts
}

export function isPrivateAddress(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80')) return true
  const parts = ipv4Parts(normalized)
  if (!parts) return false
  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

export function inspectPublicUrl(input: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return { ok: false, reason: 'The URL could not be parsed.' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'Only http and https URLs can be stored as links.' }
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'URLs with embedded credentials are rejected.' }
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!host) return { ok: false, reason: 'The URL is missing a host.' }
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) {
    return { ok: false, reason: 'Local and internal hosts are rejected.' }
  }
  if (isPrivateAddress(host)) return { ok: false, reason: 'Private network addresses are rejected.' }
  return { ok: true, url }
}
