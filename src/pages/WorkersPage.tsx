import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch, apiPatch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { ActivationActions } from '@/components/workers/ActivationActions'
import { AddWorkerDialog } from '@/components/workers/AddWorkerDialog'
import { StaffStatusBadge } from '@/components/workers/StaffStatusBadge'
import { WorkersCategoryBar } from '@/components/workers/WorkersCategoryBar'
import type { WorkerRow, WorkersPageResponse } from '@/types/workers'

const ALLOWED_ROLES = ['super_admin', 'central_support', 'district_leader']

function roleLabel(w: WorkerRow) {
  return w.roles?.display_name ?? w.roles?.name?.replace(/_/g, ' ') ?? '—'
}

function WorkerTable({ workers, showStatus = true }: { workers: WorkerRow[]; showStatus?: boolean }) {
  if (workers.length === 0) return null

  return (
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
              {showStatus && (
                <th
                  className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider w-24"
                  style={{ color: 'var(--canvas-muted)' }}
                >
                  Status
                </th>
              )}
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
                <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--canvas-text-dim)' }}>
                  {roleLabel(w)}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--canvas-muted)' }}>
                  {[w.phone, w.email].filter(Boolean).join(' · ') || '—'}
                </td>
                {showStatus && (
                  <td className="px-4 py-3">
                    <StaffStatusBadge status={w.staff_status} />
                  </td>
                )}
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
              {showStatus && <StaffStatusBadge status={w.staff_status} />}
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
  )
}

function SectionHeader({
  title,
  count,
  accent,
}: {
  title: string
  count: number
  accent?: 'warning' | 'success' | 'neutral'
}) {
  const countStyle =
    accent === 'warning'
      ? { background: 'var(--alert-warning-bg)', color: 'var(--alert-warning-text)' }
      : accent === 'success'
        ? { background: 'var(--green-50)', color: 'var(--green-700)' }
        : { background: 'var(--slate-100)', color: 'var(--canvas-text-dim)' }

  return (
    <div className="flex items-center gap-2 mb-3">
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--canvas-muted)' }}
      >
        {title}
      </h2>
      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded tabular-nums" style={countStyle}>
        {count}
      </span>
    </div>
  )
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

  const approveExistingUser = async (workerId: string) => {
    await apiPatch(`/workers/${workerId}`, { active: true }, getAccessToken)
    refresh()
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

  const categories = data?.categories ?? {
    pending: data?.pendingCount ?? 0,
    active: data?.activeCount ?? 0,
    inactive: data?.inactiveCount ?? 0,
    total: 0,
  }
  const pending = data?.pending ?? []
  const activeWorkers = data?.active_workers ?? []
  const inactiveWorkers = data?.inactive_workers ?? []
  const awaitingApproval = data?.awaiting_approval_workers ?? []
  const canApprove = data?.can_approve_staff ?? false

  const pendingEmpty =
    pending.length === 0 && awaitingApproval.length === 0

  return (
    <div>
      <PageHeader
        title="Workers"
        subtitle="Staff below your hierarchy · pending until Super Admin or Central Support approves"
        actions={
          <AddWorkerDialog
            territories={data?.territories ?? []}
            roles={data?.roles ?? []}
            organizationName={user.organization_name}
            canApproveStaff={canApprove}
            actorRoleDisplayName={user.role_display_name}
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

        <WorkersCategoryBar categories={categories} />

        {/* Pending — activation requests + unapproved user rows */}
        <section>
          <SectionHeader title="Pending" count={categories.pending} accent="warning" />
          {pendingEmpty ? (
            <div
              className="card py-8 text-center text-xs"
              style={{ color: 'var(--canvas-muted)' }}
            >
              No workers awaiting approval.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <ul className="divide-y" style={{ borderColor: 'var(--canvas-border)' }}>
                {pending.map((p) => (
                  <li key={p.id} className="px-4 py-3 flex items-center gap-4 flex-wrap">
                    <StaffStatusBadge status="pending" />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--canvas-text)' }}
                      >
                        {p.full_name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--canvas-muted)' }}>
                        {[
                          p.roles?.display_name ?? p.roles?.name?.replace(/_/g, ' '),
                          p.phone,
                          p.email,
                          p.territories?.name,
                          p.requested_by_user?.full_name
                            ? `Requested by ${p.requested_by_user.full_name}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <span
                      className="text-[11px] flex-shrink-0"
                      style={{ color: 'var(--canvas-muted)' }}
                    >
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </span>
                    {canApprove && (
                      <ActivationActions id={p.id} name={p.full_name} onDone={refresh} />
                    )}
                  </li>
                ))}
                {awaitingApproval.map((w) => (
                  <li key={w.id} className="px-4 py-3 flex items-center gap-4 flex-wrap">
                    <StaffStatusBadge status="pending" />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--canvas-text)' }}
                      >
                        {w.full_name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--canvas-muted)' }}>
                        {[roleLabel(w), w.email, 'Needs approval'].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => approveExistingUser(w.id)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-md"
                        style={{ background: 'var(--green-600)', color: '#fff' }}
                      >
                        Approve
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!canApprove && pending.length > 0 && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--canvas-muted)' }}>
              Your requests are listed here until Super Admin or Central Support approves them.
            </p>
          )}
        </section>

        {/* Active */}
        <section>
          <SectionHeader title="Active" count={categories.active} accent="success" />
          {activeWorkers.length === 0 ? (
            <div
              className="card py-8 text-center text-xs"
              style={{ color: 'var(--canvas-muted)' }}
            >
              No active workers yet.
            </div>
          ) : (
            <WorkerTable workers={activeWorkers} />
          )}
        </section>

        {/* Inactive */}
        <section>
          <SectionHeader title="Inactive" count={categories.inactive} />
          {inactiveWorkers.length === 0 ? (
            <div
              className="card py-8 text-center text-xs"
              style={{ color: 'var(--canvas-muted)' }}
            >
              No inactive workers.
            </div>
          ) : (
            <WorkerTable workers={inactiveWorkers} />
          )}
        </section>
      </div>
    </div>
  )
}
