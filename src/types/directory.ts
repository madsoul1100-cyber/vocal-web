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

export interface CatalogDepartment {
  name: string
  total: number
  mail: number
  number_only: number
}

export interface DirectoryCatalog {
  id: string
  name: string
  fetched_at: string | null
  total: number
  mail: number
  number_only: number
  departments: CatalogDepartment[]
}

export interface CatalogContact {
  id: string
  name: string
  office: string
  designation: string
  department: string
  email: string
  phone: string
  channel: 'mail' | 'number' | 'both'
  categories: string
  escalation_level: number
  source_url: string
}

export interface CatalogListResponse {
  catalogs: DirectoryCatalog[]
}

export interface CatalogQueryResponse {
  catalog: DirectoryCatalog
  contacts: CatalogContact[]
  total: number
  limit: number
  offset: number
}
