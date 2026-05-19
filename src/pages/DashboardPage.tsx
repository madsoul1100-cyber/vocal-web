import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, StageBadge, SeverityBadge } from '@/components/ui/Badge'
import type { TicketStage } from '@/types/database'

interface TicketRow {
  id: string
  ticket_number: string
  title: string | null
  original_issue_text: string | null
  stage: string
  severity: string | null
  critical_flag: boolean
  created_at: string
  needs_triage?: boolean
}

export function DashboardPage() {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()

  const { data: me } = useCurrentUser()
  const role = me?.role

  useEffect(() => {
    if (role === 'ground_worker') navigate('/my-assignments', { replace: true })
    if (role === 'district_leader') navigate('/tickets', { replace: true })
  }, [role, navigate])

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', 'dashboard'],
    queryFn: () => apiFetch<{ tickets: TicketRow[] }>('/tickets?limit=200', { getToken: getAccessToken }),
    enabled: role !== 'ground_worker' && role !== 'district_leader',
  })

  const tickets = data?.tickets ?? []
  const stageCounts: Record<TicketStage, number> = { to_do: 0, in_progress: 0, on_hold: 0, closed: 0 }
  for (const t of tickets) {
    const s = t.stage as TicketStage
    if (s in stageCounts) stageCounts[s]++
  }
  const triage = tickets.filter(t => t.needs_triage).length
  const critical = tickets.filter(t => t.critical_flag && t.stage !== 'closed').length
  const recent = [...tickets].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const userName = me?.full_name?.split(' ')[0] ?? 'there'

  if (isLoading) {
    return <div className="p-8"><p style={{ color: 'var(--canvas-muted)' }}>Loading dashboard…</p></div>
  }

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${userName}`}
        subtitle={now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />
      <div className="p-4 sm:p-8 space-y-8 max-w-[1400px] mx-auto">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--canvas-muted)' }}>Action Required</h2>
            <Link to="/triage" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>Open triage →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard label="Awaiting Triage" value={triage} href="/triage" variant="warning" />
            <ActionCard label="Critical Open" value={critical} href="/tickets" variant="danger" />
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--canvas-muted)' }}>Pipeline</h2>
            <Link to="/tickets" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>View all tickets →</Link>
          </div>
          <div className="card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total" value={tickets.length} dot="var(--slate-400)" />
            <Stat label="In Progress" value={stageCounts.in_progress} dot="var(--stage-in-progress-dot)" />
            <Stat label="On Hold" value={stageCounts.on_hold} dot="var(--stage-on-hold-dot)" />
            <Stat label="Closed" value={stageCounts.closed} dot="var(--stage-closed-dot)" />
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--canvas-muted)' }}>Recent Tickets</h2>
            <Link to="/tickets" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>View all →</Link>
          </div>
          <div className="card overflow-hidden">
            {recent.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm" style={{ color: 'var(--canvas-muted)' }}>No tickets yet</p>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--canvas-border)' }}>
                {recent.map(t => (
                  <li key={t.id}>
                    <Link to={`/tickets/${t.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                      <TicketRowContent t={t} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ActionCard({ label, value, href, variant }: { label: string; value: number; href: string; variant: 'warning' | 'danger' }) {
  const bg = variant === 'danger' ? 'var(--alert-danger-bg)' : 'var(--alert-warning-bg)'
  const border = variant === 'danger' ? 'var(--alert-danger-border)' : 'var(--alert-warning-border)'
  return (
    <Link to={href} className="card card-hover p-4 block" style={{ background: bg, borderLeft: `3px solid ${border}` }}>
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      <div className="text-3xl font-bold mt-1 tabular-nums">{value}</div>
    </Link>
  )
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-2 h-2 rounded-full mt-2" style={{ background: dot }} />
      <div>
        <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--canvas-text)' }}>{value}</div>
        <div className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

function TicketRowContent({ t }: { t: TicketRow }) {
  return (
    <>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <code className="text-[11px] font-mono" style={{ color: 'var(--canvas-muted)' }}>{t.ticket_number}</code>
          {t.critical_flag && <Badge variant="danger" size="xs">Critical</Badge>}
          <span className="text-[11px]" style={{ color: 'var(--canvas-muted)' }}>
            {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm font-medium truncate" style={{ color: 'var(--canvas-text)' }}>
          {t.title ?? t.original_issue_text?.substring(0, 80) ?? 'Untitled'}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <SeverityBadge severity={t.severity as any} />
        <StageBadge stage={t.stage as TicketStage} />
      </div>
    </>
  )
}
