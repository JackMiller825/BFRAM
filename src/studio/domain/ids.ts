export function createId(prefix: string): string {
  const cryptoObj = globalThis.crypto
  const rand =
    typeof cryptoObj?.randomUUID === 'function'
      ? cryptoObj.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}_${rand}`
}
