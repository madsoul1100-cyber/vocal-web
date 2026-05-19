export interface AuditLogRow {
  id: string
  event_type: string
  entity_type: string | null
  entity_id: string | null
  actor_type: string
  created_at: string
  source_ip: string | null
  metadata_json: Record<string, unknown> | null
  users: { full_name: string } | null
}

export interface AuditListResponse {
  events: AuditLogRow[]
  count: number
  page: number
  limit: number
}

export type AuditActorFilter = 'all' | 'user' | 'system' | 'webhook'
