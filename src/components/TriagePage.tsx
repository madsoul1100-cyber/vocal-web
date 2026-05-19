import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { TicketTable } from '@/components/tickets/TicketTable'

export function TriagePage() {
  const { getAccessToken } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', 'triage'],
    queryFn: () => apiFetch<{ tickets: unknown[]; count: number }>('/tickets?needs_triage=true&limit=100', { getToken: getAccessToken }),
  })

  const count = data?.count ?? 0

  return (
    <div>
      <PageHeader title="Triage Queue" subtitle={count + ' awaiting triage'} />
      <div className="p-6 sm:p-8 max-w-[1400px] mx-auto space-y-4">
        {isLoading && <p style={{ color: 'var(--canvas-muted)' }}>Loading…</p>}
        {error && <p style={{ color: 'var(--alert-danger-text)' }}>{(error as Error).message}</p>}
        {data && <TicketTable tickets={data.tickets as any} showTriageFlag emptyMessage="No tickets awaiting triage." />}
      </div>
    </div>
  )
}
