import { useParams } from 'react-router-dom'
import { CaseWorkspace } from '@/pages/bharosa/OpsPages'

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return null
  return <CaseWorkspace ticketId={id} />
}
