import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/api/client'
import { AmplifyEditor } from '@/components/amplify/AmplifyEditor'
import type { AmplifySessionDetail } from '@/types/amplify'

const ALLOWED_ROLES = ['super_admin', 'central_support']

export function AmplifySessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const { data: user, isLoading: userLoading } = useCurrentUser()

  useEffect(() => {
    if (!userLoading && user?.role && !ALLOWED_ROLES.includes(user.role)) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userLoading, navigate])

  const { data, isLoading, error } = useQuery({
    queryKey: ['amplify', 'session', id],
    queryFn: () =>
      apiFetch<AmplifySessionDetail>(`/amplify/sessions/${id}`, { getToken: getAccessToken }),
    enabled: !!id && !!user?.role && ALLOWED_ROLES.includes(user.role),
  })

  const latestByPlatform = useMemo(() => {
    const map = new Map<string, AmplifySessionDetail['outputs'][0]>()
    for (const o of data?.outputs ?? []) {
      if (!map.has(o.output_format)) map.set(o.output_format, o)
    }
    return Array.from(map.values())
  }, [data?.outputs])

  if (!user?.role || !ALLOWED_ROLES.includes(user.role)) {
    return null
  }

  if (userLoading || isLoading) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--canvas-muted)' }}>
        Loading session…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Link to="/amplify" className="text-sm hover:underline" style={{ color: 'var(--primary)' }}>
          ← Amplify
        </Link>
        <p className="mt-4 text-sm" style={{ color: 'var(--alert-danger-text)' }}>
          {error instanceof Error ? error.message : 'Session not found'}
        </p>
      </div>
    )
  }

  const ticket = Array.isArray(data.tickets) ? data.tickets[0] : data.tickets

  return (
    <div className="min-h-full" style={{ background: 'var(--canvas-bg)' }}>
      <header
        className="px-6 sm:px-8 py-4"
        style={{ background: 'var(--canvas-surface)', borderBottom: '1px solid var(--canvas-border)' }}
      >
        <div className="flex items-center gap-2 mb-1 text-xs" style={{ color: 'var(--canvas-muted)' }}>
          <Link to="/amplify" className="hover:underline">
            Amplify
          </Link>
          <span>/</span>
          <span className="font-mono">{ticket?.ticket_number ?? id?.slice(0, 8)}</span>
        </div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--canvas-text)' }}>
          Amplify editor
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--canvas-muted)' }}>
          Generate shareable content from the ticket record. Drafts only — review before publishing.
        </p>
      </header>

      <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
        <AmplifyEditor
          sessionId={data.id}
          ticket={
            ticket
              ? {
                  id: ticket.id,
                  ticket_number: ticket.ticket_number,
                  title: ticket.title,
                  location_text: ticket.location_text,
                }
              : null
          }
          initialSources={data.sources}
          initialOutputs={latestByPlatform}
          platforms={data.platforms}
        />
      </div>
    </div>
  )
}
