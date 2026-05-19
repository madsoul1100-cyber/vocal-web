import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { apiPost } from '@/api/client'
import type { JobRunPayload, JobRunRow, RunExpireJobResponse } from '@/types/jobs'

interface Props {
  initialRuns: JobRunRow[]
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--canvas-muted)' }}>
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums" style={{ color: 'var(--canvas-text)' }}>
        {value}
      </div>
    </div>
  )
}

function RunLogRow({ row }: { row: JobRunRow }) {
  const p = row.payload ?? {}
  const ok = p.ok !== false
  const when = new Date(row.created_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
  const durationMs =
    p.started_at && p.finished_at
      ? new Date(p.finished_at).getTime() - new Date(p.started_at).getTime()
      : null

  return (
    <div className="px-5 py-3 flex items-start gap-4 flex-wrap">
      <div className="flex-shrink-0 mt-0.5">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: ok ? 'var(--green-600)' : 'var(--alert-danger-text)' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--canvas-text)' }}>
          Expire stale offers
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--canvas-muted)' }}>
            by {row.actor_name}
          </span>
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--canvas-muted)' }}>
          {when}
          {durationMs != null ? ` · ${durationMs}ms` : ''}
        </div>
        {ok ? (
          <div className="text-xs mt-1" style={{ color: 'var(--canvas-text-dim)' }}>
            Expired <b>{p.expired ?? 0}</b> · Re-offered <b>{p.reoffered ?? 0}</b> · Escalated{' '}
            <b>{p.escalated ?? 0}</b> · SLA breached <b>{p.sla_breached ?? 0}</b>
          </div>
        ) : (
          <div className="text-xs mt-1" style={{ color: 'var(--alert-danger-text)' }}>
            Failed: {p.error ?? 'unknown error'}
          </div>
        )}
      </div>
    </div>
  )
}

export function JobsRunner({ initialRuns }: Props) {
  const queryClient = useQueryClient()
  const { getAccessToken } = useAuth()
  const [runs, setRuns] = useState<JobRunRow[]>(initialRuns)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<JobRunPayload>(null)

  async function runExpire() {
    setBusy(true)
    setError(null)
    setLastResult(null)
    const started = new Date().toISOString()
    try {
      const body = await apiPost<RunExpireJobResponse>('/jobs/run-expire', {}, getAccessToken)
      const payload: JobRunPayload = {
        ok: true,
        started_at: started,
        finished_at: new Date().toISOString(),
        expired: body.expired,
        reoffered: body.reoffered,
        escalated: body.escalated,
        sla_breached: body.sla_breached,
      }
      setLastResult(payload)
      setRuns((prev) => [
        {
          id: `local-${Date.now()}`,
          created_at: started,
          actor_name: 'You (just now)',
          payload,
        },
        ...prev,
      ])
      void queryClient.invalidateQueries({ queryKey: ['jobs'] })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to run'
      setError(msg)
      setLastResult({
        ok: false,
        error: msg,
        started_at: started,
        finished_at: new Date().toISOString(),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--canvas-muted)' }}
            >
              Assignment State Machine
            </div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--canvas-text)' }}>
              Expire stale offers
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--canvas-text-dim)' }}>
              Sweeps offered assignments past their expiry, re-offers to the next candidate worker, or
              escalates to triage after the retry budget is exhausted.
            </p>
          </div>
          <button
            type="button"
            onClick={runExpire}
            disabled={busy}
            className="py-2.5 px-4 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
          >
            {busy ? 'Running…' : '▶ Run now'}
          </button>
        </div>

        {error && (
          <div
            className="text-xs mt-3 px-3 py-2 rounded-md"
            style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
          >
            {error}
          </div>
        )}

        {lastResult?.ok && (
          <div
            className="text-xs mt-3 px-3 py-2 rounded-md grid grid-cols-2 sm:grid-cols-4 gap-2"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--green-600)' }}
          >
            <Stat label="Expired" value={lastResult.expired ?? 0} />
            <Stat label="Re-offered" value={lastResult.reoffered ?? 0} />
            <Stat label="Escalated" value={lastResult.escalated ?? 0} />
            <Stat label="SLA breached" value={lastResult.sla_breached ?? 0} />
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--canvas-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--canvas-text)' }}>
            Recent runs
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--canvas-muted)' }}>
            Last 50 runs across the organisation.
          </p>
        </div>

        {runs.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--canvas-muted)' }}>
            No runs yet. Hit <span className="font-mono">Run now</span> to fire the first one.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--canvas-border)' }}>
            {runs.map((r) => (
              <RunLogRow key={r.id} row={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
