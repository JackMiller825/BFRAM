const TOKEN_PATTERN = /bot\d{6,}:[A-Za-z0-9_-]{20,}/gi
const BEARER_PATTERN = /bearer\s+[A-Za-z0-9._~+/-]+=*/gi

export function redactSecrets(text: string, secrets: string[] = []): string {
  let out = text
  const unique = [...new Set(secrets.filter((secret) => secret.length >= 6))]
  unique.sort((a, b) => b.length - a.length)
  for (const secret of unique) out = out.split(secret).join('[redacted]')
  out = out.replace(TOKEN_PATTERN, 'bot[redacted]')
  out = out.replace(BEARER_PATTERN, 'Bearer [redacted]')
  return out
}

export function containsSecret(text: string, secrets: string[]): boolean {
  return secrets.some((secret) => secret.length >= 6 && text.includes(secret))
}
