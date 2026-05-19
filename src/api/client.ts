const baseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/v1'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface VocalUser {
  id: string
  full_name: string
  email: string | null
  organization_id: string
  organization_name: string | null
  role: string | null
  role_display_name: string | null
}

export interface TicketListItem {
  id: string
  ticket_number: string
  title: string | null
  stage: string
  sub_status: string
  severity: string
  created_at: string
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { getToken?: () => Promise<string | null> } = {},
): Promise<T> {
  const { getToken, ...init } = options
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken ? await getToken() : null
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  })

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
    const msg =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: string }).error)
        : res.statusText
    throw new ApiError(msg, res.status)
  }

  return data as T
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  getToken: () => Promise<string | null>,
): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    getToken,
  })
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  getToken: () => Promise<string | null>,
): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    getToken,
  })
}

export async function apiDelete<T>(
  path: string,
  getToken: () => Promise<string | null>,
): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE', getToken })
}
