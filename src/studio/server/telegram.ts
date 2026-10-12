import { redactSecrets } from '../domain/redact'

export interface TelegramProfile {
  id: number
  username: string
}

export interface TelegramChat {
  id: number
  username?: string
  type: string
}

export interface TelegramMember {
  status: string
}

export interface TelegramMessage {
  message_id: number
  chat: { id: number; username?: string }
}

export interface TelegramApi {
  getMe(): Promise<TelegramProfile>
  getChat(chatId: string): Promise<TelegramChat>
  getChatMember(chatId: string, userId: number): Promise<TelegramMember>
  sendMessage(chatId: string, text: string): Promise<TelegramMessage>
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

interface TelegramEnvelope<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
  parameters?: { retry_after?: number }
}

export class TelegramError extends Error {
  code: 'timeout' | 'rate_limited' | 'server_error' | 'network' | 'unauthorized' | 'forbidden' | 'rejected'

  constructor(code: TelegramError['code'], message: string) {
    super(message)
    this.code = code
  }
}

export function liveTelegram(token: string, fetchImpl: FetchLike = fetch): TelegramApi {
  async function call<T>(method: string, params: Record<string, string>): Promise<T> {
    const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/${method}`
    let response: Response
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
        signal: AbortSignal.timeout(12_000),
      })
    } catch (error) {
      const message = redactSecrets(error instanceof Error ? error.message : 'Telegram request failed', [token])
      const timedOut = message.toLowerCase().includes('timeout') || message.toLowerCase().includes('abort')
      throw new TelegramError(timedOut ? 'timeout' : 'network', message)
    }
    let payload: TelegramEnvelope<T>
    try {
      payload = (await response.json()) as TelegramEnvelope<T>
    } catch {
      throw new TelegramError('server_error', 'Telegram returned a response that was not JSON.')
    }
    if (!payload.ok || !payload.result) {
      const description = redactSecrets(payload.description || 'Telegram rejected the request.', [token])
      if (response.status === 429 || payload.error_code === 429) throw new TelegramError('rate_limited', description)
      if (response.status === 401 || payload.error_code === 401) throw new TelegramError('unauthorized', description)
      if (response.status === 403 || payload.error_code === 403) throw new TelegramError('forbidden', description)
      if (response.status >= 500) throw new TelegramError('server_error', description)
      throw new TelegramError('rejected', description)
    }
    return payload.result
  }

  return {
    getMe: () => call<TelegramProfile>('getMe', {}),
    getChat: (chatId) => call<TelegramChat>('getChat', { chat_id: chatId }),
    getChatMember: (chatId, userId) => call<TelegramMember>('getChatMember', { chat_id: chatId, user_id: String(userId) }),
    sendMessage: (chatId, text) => call<TelegramMessage>('sendMessage', { chat_id: chatId, text }),
  }
}

export function isTelegramAdmin(status: string): boolean {
  return status === 'administrator' || status === 'creator'
}
