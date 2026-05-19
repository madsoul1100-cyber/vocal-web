import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import type { ReportsSummary } from '@/types/reports'

const BLOCKED_ROLES = ['ground_worker', 'media_volunteer', 'legal_support']

const STAGES = [
  { key: 'to_do', label: 'To Do', color: 'var(--stage-to-do-dot)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--stage-in-progress-dot)' },
  { key: 'on_hold', label: 'On Hold', color: 'var(--stage-on-hold-dot)' },
  { key: 'closed', label: 'Closed', color: 'var(--stage-closed-dot)' },
] as const

export function ReportsPage() {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const { data: user, isLoading: userLoading } = useCurrentUser()

  useEffect(() => {
    if (!userLoading && user?.role && BLOCKED_ROLES.includes(user.role)) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userLoading, navigate])

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => apiFetch<ReportsSummary>('/reports', { getToken: getAccessToken }),
    enabled: !!user?.role && !BLOCKED_ROLES.includes(user.role),
  })

  if (userLoading || (user?.role && !BLOCKED_ROLES.includes(user.role) && isLoading)) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Loading…" />
      </div>
    )
  }

  if (!user?.role || BLOCKED_ROLES.includes(user.role)) {
    return null
  }

  const total = data?.total ?? 0
  const closed = data?.closed ?? 0
  const resolutionRate = data?.resolutionRate ?? 0
  const stageCounts = data?.stageCounts ?? {}
  const sortedCats = data?.topCategories ?? []

  const kpis = [
    { label: 'Total', value: data?.total ?? 0, dot: 'var(--slate-400)' },
    { label: 'Open', value: data?.open ?? 0, dot: 'var(--stage-in-progress-dot)' },
    { label: 'Closed', value: closed, dot: 'var(--stage-closed-dot)' },
    { label: 'Critical Open', value: data?.criticalOpen ?? 0, dot: 'var(--sev-critical-dot)' },
  ]

  return (
    <div>
      <PageHeader title="Reports" subtitle="Aggregate metrics for your organization" />

      <div className="p-6 sm:p-8 space-y-8 max-w-[1400px] mx-auto">
        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg"
            style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
          >
            {error instanceof Error ? error.message : 'Failed to load reports'}
          </div>
        )}

        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: k.dot }} />
                  <span
                    className="text-xs uppercase tracking-wide"
                    style={{ color: 'var(--canvas-muted)' }}
                  >
                    {k.label}
                  </span>
                </div>
                <div
                  className="text-3xl font-semibold tabular-nums mt-1.5"
                  style={{ color: 'var(--canvas-text)' }}
                >
                  {k.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--canvas-muted)' }}
          >
            Resolution Rate
          </h2>
          <div className="card p-5">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm" style={{ color: 'var(--canvas-text-dim)' }}>
                {closed} of {total} tickets resolved
              </span>
              <span
                className="text-3xl font-semibold tabular-nums"
                style={{ color: 'var(--stage-closed-dot)' }}
              >
                {resolutionRate}%
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--slate-100)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${resolutionRate}%`, background: 'var(--stage-closed-dot)' }}
              />
            </div>
          </div>
        </section>

        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--canvas-muted)' }}
          >
            Stage Distribution
          </h2>
          <div className="card p-5">
            <div className="space-y-3">
              {STAGES.map((s) => {
                const count = stageCounts[s.key] ?? 0
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div
                      className="w-24 text-xs flex-shrink-0 flex items-center gap-2"
                      style={{ color: 'var(--canvas-text-dim)' }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </div>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--slate-100)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: s.color }}
                      />
                    </div>
                    <div
                      className="w-20 text-xs tabular-nums text-right flex-shrink-0"
                      style={{ color: 'var(--canvas-muted)' }}
                    >
                      {count} <span style={{ opacity: 0.6 }}>· {pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {sortedCats.length > 0 && (
          <section>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--canvas-muted)' }}
            >
              Top Issue Categories
            </h2>
            <div className="card p-5">
              <div className="space-y-3">
                {sortedCats.map(({ name, count }) => {
                  const max = sortedCats[0]?.count ?? 1
                  const pct = max > 0 ? Math.round((count / max) * 100) : 0
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <div className="flex-1 text-xs truncate" style={{ color: 'var(--canvas-text)' }}>
                        {name}
                      </div>
                      <div
                        className="w-32 h-2 rounded-full flex-shrink-0 overflow-hidden"
                        style={{ background: 'var(--slate-100)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: 'var(--primary)' }}
                        />
                      </div>
                      <div
                        className="w-10 text-xs tabular-nums text-right flex-shrink-0"
                        style={{ color: 'var(--canvas-muted)' }}
                      >
                        {count}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        <div
          className="card p-4 flex items-start gap-3"
          style={{
            background: 'var(--alert-warning-bg)',
            borderLeft: '3px solid var(--alert-warning-border)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--alert-warning-text)', flexShrink: 0, marginTop: 2 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="text-xs" style={{ color: 'var(--alert-warning-text)' }}>
            <strong>Prototype note:</strong> CSV/Excel/PDF exports, worker leaderboards, SLA metrics,
            and territory-level drilldowns are scoped to Pilot / V1.
          </div>
        </div>
      </div>
    </div>
  )
}
