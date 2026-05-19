import { FormEvent, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import type { AuditActorFilter, AuditListResponse, AuditLogRow } from '@/types/audit'

const ALLOWED_ROLES = ['super_admin', 'central_support']

const ACTOR_FILTERS: { label: string; value: AuditActorFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'User', value: 'user' },
  { label: 'System', value: 'system' },
  { label: 'Webhook', value: 'webhook' },
]

function actorOf(e: AuditLogRow) {
  return Array.isArray(e.users) ? e.users[0] : e.users
}

function actorVariant(t: string) {
  if (t === 'user') return 'primary' as const
  if (t === 'webhook') return 'warning' as const
  return 'neutral' as const
}

export function AuditPage() {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()

  const actor = (searchParams.get('actor') as AuditActorFilter | null) ?? 'all'
  const event = searchParams.get('event') ?? ''
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1)

  useEffect(() => {
    if (!userLoading && user?.role && !ALLOWED_ROLES.includes(user.role)) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userLoading, navigate])

  const queryString = useMemo(() => {
    const qp = new URLSearchParams()
    if (actor && actor !== 'all') qp.set('actor', actor)
    if (event.trim()) qp.set('event', event.trim())
    if (page > 1) qp.set('page', String(page))
    const s = qp.toString()
    return s ? `?${s}` : ''
  }, [actor, event, page])

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', actor, event, page],
    queryFn: () => apiFetch<AuditListResponse>(`/audit${queryString}`, { getToken: getAccessToken }),
    enabled: !!user?.role && ALLOWED_ROLES.includes(user.role),
  })

  const buildLink = (changes: { actor?: AuditActorFilter; event?: string; page?: number }) => {
    const qp = new URLSearchParams()
    const nextActor = changes.actor !== undefined ? changes.actor : actor
    const nextEvent = changes.event !== undefined ? changes.event : event
    if (nextActor && nextActor !== 'all') qp.set('actor', nextActor)
    if (nextEvent.trim()) qp.set('event', nextEvent.trim())
    if (changes.page && changes.page > 1) qp.set('page', String(changes.page))
    const s = qp.toString()
    return s ? `/audit?${s}` : '/audit'
  }

  const onSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const q = String(fd.get('event') ?? '')
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (q.trim()) next.set('event', q.trim())
      else next.delete('event')
      next.delete('page')
      return next
    })
  }

  if (userLoading || (user?.role && ALLOWED_ROLES.includes(user.role) && isLoading)) {
    return (
      <div>
        <PageHeader title="Audit Log" subtitle="Loading…" />
      </div>
    )
  }

  if (!user?.role || !ALLOWED_ROLES.includes(user.role)) {
    return null
  }

  const events = data?.events ?? []
  const count = data?.count ?? 0
  const limit = data?.limit ?? 50
  const offset = (page - 1) * limit

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle={`${count} event${count !== 1 ? 's' : ''}`}
      />

      <div className="p-6 sm:p-8 space-y-4 max-w-[1400px] mx-auto">
        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg"
            style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
          >
            {error instanceof Error ? error.message : 'Failed to load audit log'}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-1 p-1 rounded-lg"
            style={{ background: 'var(--slate-100)' }}
          >
            {ACTOR_FILTERS.map((f) => {
              const isActive = f.value === 'all' ? actor === 'all' || !actor : actor === f.value
              return (
                <Link
                  key={f.value}
                  to={buildLink({ actor: f.value === 'all' ? 'all' : f.value, page: 1 })}
                  className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
                  style={{
                    background: isActive ? 'var(--canvas-surface)' : 'transparent',
                    color: isActive ? 'var(--canvas-text)' : 'var(--canvas-muted)',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {f.label}
                </Link>
              )
            })}
          </div>

          <form onSubmit={onSearchSubmit} className="ml-auto relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ color: 'var(--canvas-muted)' }}
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              name="event"
              defaultValue={event}
              key={event}
              placeholder="Filter by event type…"
              className="text-sm pl-9 pr-3 py-1.5 rounded-md border outline-none transition-shadow focus:ring-2 w-56"
              style={{
                background: 'var(--canvas-surface)',
                borderColor: 'var(--canvas-border)',
                color: 'var(--canvas-text)',
              }}
            />
          </form>
        </div>

        {events.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="text-4xl mb-2">🗒️</div>
            <p className="text-sm font-medium" style={{ color: 'var(--canvas-text)' }}>
              No audit events match
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--canvas-muted)' }}>
              All privileged actions are logged here.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--canvas-border)',
                    background: 'var(--canvas-surface-alt)',
                  }}
                >
                  <th
                    className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider"
                    style={{ color: 'var(--canvas-muted)' }}
                  >
                    Event
                  </th>
                  <th
                    className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider w-44"
                    style={{ color: 'var(--canvas-muted)' }}
                  >
                    Entity
                  </th>
                  <th
                    className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider w-40"
                    style={{ color: 'var(--canvas-muted)' }}
                  >
                    Actor
                  </th>
                  <th
                    className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider w-32"
                    style={{ color: 'var(--canvas-muted)' }}
                  >
                    When
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--canvas-border)' }}>
                {events.map((e) => {
                  const actorUser = actorOf(e)
                  return (
                    <tr key={e.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-medium" style={{ color: 'var(--canvas-text)' }}>
                          {e.event_type}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--canvas-text-dim)' }}>
                        {e.entity_type ? (
                          <>
                            <span className="font-medium">{e.entity_type}</span>
                            {e.entity_id && (
                              <span className="font-mono" style={{ color: 'var(--canvas-muted)' }}>
                                {' '}
                                · {String(e.entity_id).slice(0, 8)}
                              </span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={actorVariant(e.actor_type)} size="xs">
                            {e.actor_type}
                          </Badge>
                          {actorUser?.full_name && (
                            <span
                              className="text-xs truncate"
                              style={{ color: 'var(--canvas-text-dim)' }}
                            >
                              {actorUser.full_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'var(--canvas-muted)' }}
                        title={new Date(e.created_at).toLocaleString()}
                      >
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {count > limit && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
              Showing {offset + 1}–{Math.min(offset + limit, count)} of {count}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  to={buildLink({ page: page - 1 })}
                  className="text-xs px-3 py-1.5 rounded-md border transition-colors hover:bg-slate-50"
                  style={{ borderColor: 'var(--canvas-border)', color: 'var(--canvas-text-dim)' }}
                >
                  ← Prev
                </Link>
              )}
              {offset + limit < count && (
                <Link
                  to={buildLink({ page: page + 1 })}
                  className="text-xs px-3 py-1.5 rounded-md border transition-colors hover:bg-slate-50"
                  style={{ borderColor: 'var(--canvas-border)', color: 'var(--canvas-text-dim)' }}
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="card p-4 text-xs" style={{ color: 'var(--canvas-muted)' }}>
          <strong style={{ color: 'var(--canvas-text-dim)' }}>Coming in V1:</strong> expandable rows
          with before/after diffs, CSV export, and a date-range filter.
        </div>
      </div>
    </div>
  )
}
