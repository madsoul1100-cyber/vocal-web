import { useEffect, useState } from 'react'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/v1'

/**
 * Load staff media with JWT (for img src when signed S3 URL is unavailable).
 */
export function useStaffMediaUrl(
  path: string | null | undefined,
  getToken: () => Promise<string | null>,
  enabled = true,
): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !path) {
      setUrl(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    ;(async () => {
      try {
        const token = await getToken()
        const headers = new Headers()
        if (token) headers.set('Authorization', `Bearer ${token}`)
        const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
          headers,
        })
        if (!res.ok || cancelled) return
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch {
        if (!cancelled) setUrl(null)
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path, getToken, enabled])

  return url
}

export function workerProfileMediaPath(workerId: string): string {
  return `/workers/${workerId}/media/profile`
}

export function workerKycMediaPath(workerId: string, docIndex: number): string {
  return `/workers/${workerId}/media/kyc/${docIndex}`
}

export function pendingWorkerProfileMediaPath(requestId: string): string {
  return `/workers/activation/${requestId}/media/profile`
}

export function pendingWorkerKycMediaPath(requestId: string, docIndex: number): string {
  return `/workers/activation/${requestId}/media/kyc/${docIndex}`
}
