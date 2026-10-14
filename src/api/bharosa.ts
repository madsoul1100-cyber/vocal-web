import { apiFetch } from '@/api/client'

const v1 = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/v1'

/** Bharosa lives on /v2. Derive it from the existing v1 base unless overridden. */
export const BHAROSA_BASE =
  import.meta.env.VITE_API_V2_BASE_URL?.replace(/\/$/, '') ??
  v1.replace(/\/v1$/, '/v2')

export const ORG_SLUG = import.meta.env.VITE_ORG_SLUG?.trim() || 'demo'

export type Lang = 'te' | 'en'

export class BharosaError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'BharosaError'
    this.status = status
    this.code = code
  }
}

const CITIZEN_TOKEN_KEY = 'bharosa_citizen_token'

export function getCitizenToken(): string | null {
  return localStorage.getItem(CITIZEN_TOKEN_KEY)
}

export function setCitizenToken(token: string | null) {
  if (token) localStorage.setItem(CITIZEN_TOKEN_KEY, token)
  else localStorage.removeItem(CITIZEN_TOKEN_KEY)
}

export async function bharosaFetch<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    token?: string | null
    /** Staff calls omit the org header; the staff JWT carries the organization. */
    staff?: boolean
    lang?: Lang
  } = {},
): Promise<T> {
  const headers = new Headers()
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (!options.staff) headers.set('X-Org-Slug', ORG_SLUG)
  if (options.lang) headers.set('Accept-Language', options.lang)
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

  let res: Response
  try {
    res = await fetch(`${BHAROSA_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new BharosaError(`Cannot reach the API at ${BHAROSA_BASE}`, 0, 'NETWORK')
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }
  if (!res.ok) {
    const rec = data as { error?: string; code?: string } | null
    throw new BharosaError(rec?.error || res.statusText || 'Request failed', res.status, rec?.code)
  }
  return data as T
}

export function staffBharosa<T>(
  path: string,
  getToken: () => Promise<string | null>,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  return getToken().then((token) =>
    bharosaFetch<T>(path, { ...options, token, staff: true }),
  )
}

export { apiFetch }
