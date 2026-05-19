import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { TicketTable } from '@/components/tickets/TicketTable'
import type { TicketStage } from '@/types/database'

const STAGE_FILTERS: { label: string; value: TicketStage | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'To Do', value: 'to_do' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Closed', value: 'closed' },
]

export function TicketsPage() {
  const { getAccessToken } = useAuth()
  const [params, setParams] = useSearchParams()
  const stage = params.get('stage') as TicketStage | null
  const search = params.get('search') ?? ''
  const qs = new URLSearchParams()
  if (stage) qs.set('stage', stage)
  if (search) qs.set('search', search)
  qs.set('limit', '50')

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', stage, search],
    queryFn: () => apiFetch<{ tickets: unknown[]; count: number }>(`/tickets?${qs}`, { getToken: getAccessToken }),
  })

  function setStage(next: TicketStage | 'all') {
    const p = new URLSearchParams(params)
    if (next === 'all') p.delete('stage')
    else p.set('stage', next)
    setParams(p)
  }

  return (
    <div>
      <PageHeader title="Tickets" subtitle={`${data?.count ?? 0} tickets${stage ? ` · ${stage.replace('_', ' ')}` : ''}`} />
      <div className="p-6 sm:p-8 space-y-4 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--slate-100)' }}>
            {STAGE_FILTERS.map(f => {
              const active = f.value === 'all' ? !stage : stage === f.value
              return (
                <button key={f.value} type="button" onClick={() => setStage(f.value)}
                  className="text-xs px-3 py-1.5 rounded-md font-medium"
                  style={{ background: active ? 'var(--canvas-surface)' : 'transparent', color: active ? 'var(--canvas-text)' : 'var(--canvas-muted)' }}>
                  {f.label}
                </button>
              )
            })}
          </div>
          <form className="ml-auto" onSubmit={e => {
            e.preventDefault()
            const q = String(new FormData(e.currentTarget).get('search') ?? '').trim()
            const p = new URLSearchParams(params)
            if (q) p.set('search', q); else p.delete('search')
            setParams(p)
          }}>
            <input name="search" defaultValue={search} placeholder="Search tickets…"
              className="text-sm px-3 py-1.5 rounded-md border w-56"
              style={{ borderColor: 'var(--canvas-border)', background: 'var(--canvas-surface)' }} />
          </form>
        </div>
        {isLoading && <p style={{ color: 'var(--canvas-muted)' }}>Loading…</p>}
        {error && <p style={{ color: 'var(--alert-danger-text)' }}>{(error as Error).message}</p>}
        {data && <TicketTable tickets={data.tickets as any} showTriageFlag />}
      </div>
    </div>
  )
}
