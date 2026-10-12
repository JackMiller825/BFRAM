import type { ClientWorkspace } from './domain/types'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (typeof init?.body === 'string' && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  const text = await response.text()
  let data: { error?: string } = {}
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string }
    } catch {
      if (!response.ok) throw new ApiError(response.status, 'The campaign server returned an unexpected response.')
    }
  }
  if (!response.ok) throw new ApiError(response.status, data.error || 'Request failed.')
  return data as T
}

export function workspaceRequest(path: string, init?: RequestInit) {
  return api<{ workspace: ClientWorkspace }>(path, init)
}

export async function downloadText(path: string, filename: string): Promise<void> {
  const response = await fetch(path, { credentials: 'same-origin' })
  if (!response.ok) throw new ApiError(response.status, 'Download failed.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
