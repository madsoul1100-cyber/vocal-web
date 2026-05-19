import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { ActivationActions } from '@/components/workers/ActivationActions'
import { AddWorkerDialog } from '@/components/workers/AddWorkerDialog'
import type { WorkerRow, WorkersPageResponse } from '@/types/workers'

const ALLOWED_ROLES = ['super_admin', 'central_support', 'district_leader']

function roleLabel(w: WorkerRow) {
  return w.roles?.display_name ?? w.roles?.name?.replace(/_/g, ' ') ?? '—'
}

export function WorkersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { getAccessToken } = useAuth()
  const { data: user, isLoading: userLoading } = useCurrentUser()

  useEffect(() => {
    if (!userLoading && user?.role && !ALLOWED_ROLES.includes(user.role)) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userLoading, navigate])

  const { data, isLoading, error } = useQuery({
    queryKey: ['workers'],
    queryFn: () =>
      apiFetch<WorkersPageResponse>('/workers', { getToken: getAccessToken }),
    enabled: !!user && ALLOWED_ROLES.includes(user.role ?? ''),
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['workers'] })
  }

  if (userLoading || (user?.role && ALLOWED_ROLES.includes(user.role) && isLoading)) {
    return (
      <div>
        <PageHeader title="Workers" subtitle="Loading…" />
      </div>
    )
  }

  if (!user?.role || !ALLOWED_ROLES.includes(user.role)) {
    return null
  }

  const workers = data?.workers ?? []
  const pending = data?.pending ?? []
  const activeCount = data?.activeCount ?? 0
  const inactiveCount = data?.inactiveCount ?? 0

  return (
    <div>
      <PageHeader
        title="Workers"
        subtitle={`${workers.length} team member${workers.length !== 1 ? 's' : ''} · ${activeCount} active`}
        actions={
          <AddWorkerDialog
            territories={data?.territories ?? []}
            roles={data?.roles ?? []}
            organizationName={user.organization_name}
            onSaved={refresh}
          />
        }
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-[1400px] mx-auto">
        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg"
            style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
          >
            {error instanceof Error ? error.message : 'Failed to load workers'}
          </div>
        )}

        {pending.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--canvas-muted)' }}
              >
                Pending Activation
              </h2>
              <span
                className="text-[11px] font-medium px-1.5 py-0.5 rounded tabular-nums"
                style={{
                  background: 'var(--alert-warning-bg)',
                  color: 'var(--alert-warning-text)',
                }}
              >
                {pending.length}
              </span>
            </div>
            <div className="card overflow-hidden">
              <ul className="divide-y" style={{ borderColor: 'var(--canvas-border)' }}>
                {pending.map((p) => (
                  <li key={p.id} className="px-4 py-3 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--canvas-text)' }}
                      >
                        {p.full_name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--canvas-muted)' }}>
                        {[p.phone, p.email, p.territories?.name].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span
                      className="text-[11px] flex-shrink-0"
                      style={{ color: 'var(--canvas-muted)' }}
                    >
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </span>
                    <ActivationActions id={p.id} name={p.full_name} onDone={refresh} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--canvas-muted)' }}
            >
              All Workers
            </h2>
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded tabular-nums"
              style={{ background: 'var(--slate-100)', color: 'var(--canvas-text-dim)' }}
            >
              {workers.length}
            </span>
            {inactiveCount > 0 && (
              <span className="text-[11px]" style={{ color: 'var(--canvas-muted)' }}>
                · {inactiveCount} inactive
              </span>
            )}
          </div>

          {workers.length === 0 ? (
            <div className="card py-16 text-center">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-sm font-medium" style={{ color: 'var(--canvas-text)' }}>
                No workers yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--canvas-muted)' }}>
                Users with org access will appear here after activation.
              </p>
            </div>
          ) : (
            <>
              <div className="card overflow-hidden hidden md:block">
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
                        Name
                      </th>
                      <th
                        className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider w-40"
                        style={{ color: 'var(--canvas-muted)' }}
                      >
                        Role
                      </th>
                      <th
                        className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider w-48"
                        style={{ color: 'var(--canvas-muted)' }}
                      >
                        Contact
                      </th>
                      <th
                        className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider w-24"
                        style={{ color: 'var(--canvas-muted)' }}
                      >
                        Status
                      </th>
                      <th
                        className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider w-32"
                        style={{ color: 'var(--canvas-muted)' }}
                      >
                        Last Seen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--canvas-border)' }}>
                    {workers.map((w) => (
                      <tr key={w.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--canvas-text)' }}>
                          {w.full_name}
                        </td>
                        <td
                          className="px-4 py-3 text-xs capitalize"
                          style={{ color: 'var(--canvas-text-dim)' }}
                        >
                          {roleLabel(w)}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--canvas-muted)' }}>
                          {[w.phone, w.email].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {w.active ? (
                            <Badge variant="success" size="xs" dot>
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="xs">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--canvas-muted)' }}>
                          {w.last_login_at
                            ? formatDistanceToNow(new Date(w.last_login_at), { addSuffix: true })
                            : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 md:hidden">
                {workers.map((w) => (
                  <div key={w.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-sm" style={{ color: 'var(--canvas-text)' }}>
                        {w.full_name}
                      </span>
                      {w.active ? (
                        <Badge variant="success" size="xs" dot>
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs capitalize" style={{ color: 'var(--canvas-text-dim)' }}>
                      {roleLabel(w)}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--canvas-muted)' }}>
                      {[w.phone, w.email].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="card p-4 text-xs" style={{ color: 'var(--canvas-muted)' }}>
          <strong style={{ color: 'var(--canvas-text-dim)' }}>Coming in V1:</strong> reassign
          territories, view per-worker ticket counts and accept/reject rates, deactivate users.
        </div>
      </div>
    </div>
  )
}
