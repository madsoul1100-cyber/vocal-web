export interface DirectoryContact {
  id: string
  contact_name: string
  organization_name: string | null
  role_designation: string | null
  phone: string | null
  phone_alternate: string | null
  email: string | null
  availability_notes: string | null
  internal_notes: string | null
  verification_status: 'unverified' | 'verified' | 'outdated'
  active: boolean
}

export interface DirectoryListResponse {
  contacts: DirectoryContact[]
  count: number
  canWrite: boolean
}
