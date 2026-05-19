export interface WorkerAssignmentsPayload {
  offered: {
    id: string
    expires_at: string
    ticket: {
      id: string
      ticket_number: string
      title: string | null
      original_issue_text: string | null
      location_text: string | null
      latitude: number | null
      longitude: number | null
      severity: string | null
      stage: string
      sub_status: string
    } | null
  } | null
  activeTickets: Array<{
    id: string
    ticket_number: string
    title: string | null
    original_issue_text: string | null
    location_text: string | null
    severity: string | null
    stage: string
    sub_status: string
    accepted_at: string | null
    sla_first_contact_due_at: string | null
    sla_resolution_due_at: string | null
    citizen_phone: string | null
  }>
  telegramLinked: boolean
}
