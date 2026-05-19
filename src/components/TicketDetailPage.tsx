import { useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiFetch } from '@/api/client'

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { getAccessToken } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    enabled: !!id,
    queryFn: () =>
      apiFetch<{ ticket: Record<string, unknown> }>(`/tickets/${id}`, {
        getToken: getAccessToken,
      }),
  })

  const ticket = data?.ticket

  return (
    <div className="p-6 sm:p-8">
      <Link to="/tickets" className="text-sm text-dim hover:underline mb-4 inline-block">
        ← All tickets
      </Link>

      {isLoading && <p className="text-dim">Loading…</p>}
      {error && <p style={{ color: 'var(--alert-danger-text)' }}>{(error as Error).message}</p>}

      {ticket && (
        <div className="card p-6">
          <p className="font-mono text-sm text-dim">{String(ticket.ticket_number)}</p>
          <h1 className="text-xl font-semibold mt-2">{String(ticket.title || 'Untitled')}</h1>
          <p className="mt-4 text-sm whitespace-pre-wrap">
            {String(ticket.original_issue_text || ticket.complaint_text || '')}
          </p>
          <p className="mt-4 text-xs text-dim">
            Stage: {String(ticket.stage)} · {String(ticket.sub_status)}
          </p>
        </div>
      )}
    </div>
  )
}
