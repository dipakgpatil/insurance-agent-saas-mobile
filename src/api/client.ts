import Constants from 'expo-constants'

const fallbackBaseUrl = 'https://insurance-agent-saas-production.up.railway.app/api/v1'

const fromEnv =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl

export const API_BASE_URL = (fromEnv && fromEnv.trim().length > 0 ? fromEnv : fallbackBaseUrl).replace(
  /\/+$/,
  '',
)

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type RequestOptions = RequestInit & {
  token?: string | null
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers as HeadersInit | undefined)
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  const hasBody = options.body !== undefined
  if (hasBody && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown; message?: unknown }
    if (typeof payload.detail === 'string') return payload.detail
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((item: unknown) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : String(item),
        )
        .join(', ')
    }
    if (typeof payload.message === 'string') return payload.message
  } catch {
    return `${response.status} ${response.statusText}`
  }
  return `${response.status} ${response.statusText}`
}
