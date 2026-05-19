import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import type { AmplifyListResponse, AmplifySessionListItem } from '@/types/amplify'

const ALLOWED_ROLES = ['super_admin', 'central_support']

function statusVariant(s: string) {
  if (s === 'completed') return 'success' as const
  if (s === 'archived') return 'neutral' as const
  return 'info' as const
}

function ticketOf(s: AmplifySessionListItem) {
  return Array.isArray(s.tickets) ? s.tickets[0] : s.tickets
}

function authorOf(s: AmplifySessionListItem) {
  return Array.isArray(s.users) ? s.users[0] : s.users
}

export function AmplifyPage() {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const { data: user, isLoading: userLoading } = useCurrentUser()

  useEffect(() => {
    if (!userLoading && user?.role && !ALLOWED_ROLES.includes(user.role)) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userLoading, navigate])

  const { data, isLoading, error } = useQuery({
    queryKey: ['amplify', 'sessions'],
    queryFn: () => apiFetch<AmplifyListResponse>('/amplify', { getToken: getAccessToken }),
    enabled: !!user?.role && ALLOWED_ROLES.includes(user.role),
  })

  if (userLoading || (user?.role && ALLOWED_ROLES.includes(user.role) && isLoading)) {
    return (
      <div>
        <PageHeader title="Amplify" subtitle="Loading…" />
      </div>
    )
  }

  if (!user?.role || !ALLOWED_ROLES.includes(user.role)) {
    return null
  }

  const sessions = data?.sessions ?? []
  const count = data?.count ?? 0

  return (
    <div>
      <PageHeader
        title="Amplify"
        subtitle="Turn resolved cases into public-facing communications"
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-[1400px] mx-auto">
        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg"
            style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
          >
            {error instanceof Error ? error.message : 'Failed to load sessions'}
          </div>
        )}

        <div
          className="card p-6 flex items-start gap-4"
          style={{
            background: 'linear-gradient(135deg, var(--brand-50) 0%, var(--canvas-surface) 100%)',
            borderLeft: '3px solid var(--primary)',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--primary)', flexShrink: 0 }}
          >
            <path d="M3 11h3l4-8v18l-4-8H3v-2z" />
            <path d="M15 8a5 5 0 010 8" />
            <path d="M18 5a9 9 0 010 14" />
          </svg>
          <div>
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--canvas-text)' }}>
              Start a new Amplify session
            </h2>
            <p className="text-sm" style={{ color: 'var(--canvas-text-dim)' }}>
              Open any resolved ticket and use the <em>Amplify</em> action to draft social copy,
              press blurbs, and internal updates from the case record. Sessions you save will appear
              below.
            </p>
          </div>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--canvas-muted)' }}
            >
              Recent Sessions
            </h2>
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded tabular-nums"
              style={{ background: 'var(--slate-100)', color: 'var(--canvas-text-dim)' }}
            >
              {count}
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="card py-16 text-center">
              <div className="text-4xl mb-2">📣</div>
              <p className="text-sm font-medium" style={{ color: 'var(--canvas-text)' }}>
                No Amplify sessions yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--canvas-muted)' }}>
                Resolve a ticket, then launch Amplify from the ticket detail page.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <ul className="divide-y" style={{ borderColor: 'var(--canvas-border)' }}>
                {sessions.map((s) => {
                  const ticket = ticketOf(s)
                  const author = authorOf(s)
                  return (
                    <li key={s.id}>
                      <Link
                        to={`/amplify/${s.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <code className="text-[11px] font-mono" style={{ color: 'var(--canvas-muted)' }}>
                              {ticket?.ticket_number ?? '—'}
                            </code>
                            <span className="text-[11px]" style={{ color: 'var(--canvas-muted)' }}>
                              ·
                            </span>
                            <span className="text-[11px]" style={{ color: 'var(--canvas-muted)' }}>
                              {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                            </span>
                            {author?.full_name && (
                              <>
                                <span className="text-[11px]" style={{ color: 'var(--canvas-muted)' }}>
                                  ·
                                </span>
                                <span className="text-[11px]" style={{ color: 'var(--canvas-muted)' }}>
                                  by {author.full_name}
                                </span>
                              </>
                            )}
                          </div>
                          <div
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--canvas-text)' }}
                          >
                            {ticket?.title ?? 'Untitled session'}
                          </div>
                        </div>
                        <Badge variant={statusVariant(s.status)} size="xs">
                          {s.status}
                        </Badge>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>

        <div className="card p-4 text-xs" style={{ color: 'var(--canvas-muted)' }}>
          <strong style={{ color: 'var(--canvas-text-dim)' }}>Coming in V1:</strong> create sessions
          from this page, multi-ticket digests, tone presets, and one-click export to X / LinkedIn /
          WhatsApp Business.
        </div>
      </div>
    </div>
  )
}
