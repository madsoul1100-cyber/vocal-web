export type JobRunPayload = {
  ok?: boolean
  started_at?: string
  finished_at?: string
  expired?: number
  reoffered?: number
  escalated?: number
  sla_breached?: number
  error?: string
} | null

export interface JobRunRow {
  id: string
  created_at: string
  actor_name: string
  payload: JobRunPayload
}

export interface JobsListResponse {
  runs: JobRunRow[]
}

export interface RunExpireJobResponse {
  ok: boolean
  ran_at?: string
  expired?: number
  reoffered?: number
  escalated?: number
  sla_breached?: number
  error?: string
}
