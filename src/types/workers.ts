export type StaffStatus = 'pending' | 'active' | 'inactive'

export interface StaffCategoryCounts {
  pending: number
  active: number
  inactive: number
  total: number
}

export interface WorkerRow {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  active: boolean
  approved_at?: string | null
  staff_status: StaffStatus
  last_login_at: string | null
  created_at: string
  roles: { name: string; display_name: string | null } | null
}

export interface PendingActivationRow {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  status: string
  staff_status: 'pending'
  created_at: string
  territories: { name: string } | null
  roles: { name: string; display_name: string | null } | null
  requested_by_user: { full_name: string } | null
}

export interface TerritoryOption {
  id: string
  name: string
}

export interface RoleOption {
  id: string
  name: string
  display_name: string
  hierarchy_level: number
}

export interface WorkersPageResponse {
  workers: WorkerRow[]
  active_workers: WorkerRow[]
  inactive_workers: WorkerRow[]
  awaiting_approval_workers: WorkerRow[]
  pending: PendingActivationRow[]
  categories: StaffCategoryCounts
  territories: TerritoryOption[]
  roles: RoleOption[]
  can_approve_staff: boolean
  activeCount: number
  inactiveCount: number
  pendingCount: number
}
