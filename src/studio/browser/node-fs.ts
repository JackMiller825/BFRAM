// In-browser files for the GitHub Pages preview. The local server uses Node fs.

type Entry = { kind: 'file'; text: string | null; base64: string | null } | { kind: 'dir' }

const STORAGE_KEY = 'tcs.browser.files'
const files = new Map<string, Entry>()

function norm(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/')
}

function load(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, Entry>
    for (const [path, entry] of Object.entries(parsed)) files.set(path, entry)
  } catch {
    files.clear()
  }
}

function persist(): void {
  const payload: Record<string, Entry> = {}
  for (const [path, entry] of files) payload[path] = entry
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // The tab still works until it is closed when the browser storage limit is hit.
  }
}

function encode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decode(value: string): Uint8Array {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index)
  return out
}

load()

export function mkdirSync(path: string): void {
  files.set(norm(path), { kind: 'dir' })
  persist()
}

export function existsSync(path: string): boolean {
  const key = norm(path)
  if (files.has(key)) return true
  const prefix = key.endsWith('/') ? key : `${key}/`
  for (const item of files.keys()) {
    if (item.startsWith(prefix)) return true
  }
  return false
}

export function readFileSync(path: string, encoding?: 'utf8'): string | Uint8Array {
  const entry = files.get(norm(path))
  if (!entry || entry.kind !== 'file') throw new Error(`ENOENT: ${path}`)
  if (encoding === 'utf8') return entry.text ?? ''
  return entry.base64 ? decode(entry.base64) : new Uint8Array()
}

export function writeFileSync(path: string, data: string | Uint8Array, encoding?: 'utf8'): void {
  if (typeof data === 'string' || encoding === 'utf8') {
    files.set(norm(path), { kind: 'file', text: String(data), base64: null })
  } else {
    files.set(norm(path), { kind: 'file', text: null, base64: encode(data) })
  }
  persist()
}

export function renameSync(from: string, to: string): void {
  const entry = files.get(norm(from))
  if (!entry) throw new Error(`ENOENT: ${from}`)
  files.set(norm(to), entry)
  files.delete(norm(from))
  persist()
}

export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void {
  const key = norm(path)
  const keys = [...files.keys()].filter((item) => item === key || (options?.recursive && item.startsWith(`${key}/`)))
  if (keys.length === 0 && !options?.force) throw new Error(`ENOENT: ${path}`)
  for (const item of keys) files.delete(item)
  persist()
}
