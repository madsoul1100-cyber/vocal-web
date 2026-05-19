export interface WorkerRow {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  active: boolean
  last_login_at: string | null
  created_at: string
  roles: { name: string; display_name: string | null } | null
}

export interface PendingActivationRow {
  id: string
  full_name: string
  phone: string
  email: string | null
  status: string
  created_at: string
  territories: { name: string } | null
}

export interface TerritoryOption {
  id: string
  name: string
}

export interface RoleOption {
  id: string
  name: string
  display_name: string
}

export interface WorkersPageResponse {
  workers: WorkerRow[]
  pending: PendingActivationRow[]
  territories: TerritoryOption[]
  roles: RoleOption[]
  activeCount: number
  inactiveCount: number
}
