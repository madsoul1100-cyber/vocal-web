import { FormEvent, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { ContactFormDialog } from '@/components/directory/ContactFormDialog'
import { ArchiveContactButton } from '@/components/directory/ArchiveContactButton'
import type { DirectoryContact, DirectoryListResponse } from '@/types/directory'

type StatusFilter = 'all' | 'verified' | 'unverified' | 'outdated'

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Verified', value: 'verified' },
  { label: 'Unverified', value: 'unverified' },
  { label: 'Outdated', value: 'outdated' },
]

function verificationVariant(status: string) {
  if (status === 'verified') return 'success' as const
  if (status === 'outdated') return 'danger' as const
  return 'neutral' as const
}

export function DirectoryPage() {
  const { getAccessToken } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const status = (searchParams.get('status') as StatusFilter | null) ?? undefined
  const search = searchParams.get('search') ?? ''

  const queryString = useMemo(() => {
    const qp = new URLSearchParams()
    if (status && status !== 'all') qp.set('status', status)
    if (search.trim()) qp.set('search', search.trim())
    const s = qp.toString()
    return s ? `?${s}` : ''
  }, [status, search])

  const { data, isLoading, error } = useQuery({
    queryKey: ['directory', status ?? 'all', search],
    queryFn: () =>
      apiFetch<DirectoryListResponse>(`/directory${queryString}`, { getToken: getAccessToken }),
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['directory'] })
  }

  const buildLink = (changes: { status?: StatusFilter; search?: string }) => {
    const qp = new URLSearchParams()
    const nextStatus = changes.status !== undefined ? changes.status : status
    const nextSearch = changes.search !== undefined ? changes.search : search
    if (nextStatus && nextStatus !== 'all') qp.set('status', nextStatus)
    if (nextSearch.trim()) qp.set('search', nextSearch.trim())
    const s = qp.toString()
    return s ? `/directory?${s}` : '/directory'
  }

  const onSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const q = String(fd.get('search') ?? '')
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (q.trim()) next.set('search', q.trim())
      else next.delete('search')
      return next
    })
  }

  const contacts = data?.contacts ?? []
  const count = data?.count ?? 0
  const canWrite = data?.canWrite ?? false

  return (
    <div>
      <PageHeader
        title="Directory"
        subtitle={`${count} contact${count !== 1 ? 's' : ''} · officials, vendors, partners`}
        actions={
          canWrite ? (
            <ContactFormDialog mode="create" triggerLabel="+ New contact" onSaved={refresh} />
          ) : undefined
        }
      />

      <div className="p-6 sm:p-8 space-y-4 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-1 p-1 rounded-lg"
            style={{ background: 'var(--slate-100)' }}
          >
            {STATUS_FILTERS.map((f) => {
              const isActive =
                f.value === 'all' ? !status || status === 'all' : status === f.value
              return (
                <Link
                  key={f.value}
                  to={buildLink({ status: f.value === 'all' ? undefined : f.value })}
                  className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
                  style={{
                    background: isActive ? 'var(--canvas-surface)' : 'transparent',
                    color: isActive ? 'var(--canvas-text)' : 'var(--canvas-muted)',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {f.label}
                </Link>
              )
            })}
          </div>

          <form method="get" onSubmit={onSearchSubmit} className="ml-auto relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ color: 'var(--canvas-muted)' }}
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search contacts…"
              className="text-sm pl-9 pr-3 py-1.5 rounded-md border outline-none transition-shadow focus:ring-2 w-56"
              style={{
                background: 'var(--canvas-surface)',
                borderColor: 'var(--canvas-border)',
                color: 'var(--canvas-text)',
              }}
            />
          </form>
        </div>

        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg"
            style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
          >
            {error instanceof Error ? error.message : 'Failed to load directory'}
          </div>
        )}

        {isLoading ? (
          <div className="card py-16 text-center text-sm" style={{ color: 'var(--canvas-muted)' }}>
            Loading contacts…
          </div>
        ) : contacts.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="text-4xl mb-2">📇</div>
            <p className="text-sm font-medium" style={{ color: 'var(--canvas-text)' }}>
              No contacts found
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--canvas-muted)' }}>
              Add officials, vendors, and partners here so workers can reach them from a ticket.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contacts.map((c: DirectoryContact) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-sm" style={{ color: 'var(--canvas-text)' }}>
                    {c.contact_name}
                  </span>
                  <Badge variant={verificationVariant(c.verification_status)} size="xs">
                    {c.verification_status}
                  </Badge>
                </div>
                {(c.organization_name || c.role_designation) && (
                  <div className="text-xs mb-2" style={{ color: 'var(--canvas-text-dim)' }}>
                    {[c.role_designation, c.organization_name].filter(Boolean).join(' · ')}
                  </div>
                )}
                <dl className="space-y-1 text-xs" style={{ color: 'var(--canvas-muted)' }}>
                  {c.phone && (
                    <div className="flex gap-2">
                      <dt className="w-12 flex-shrink-0">Phone</dt>
                      <dd style={{ color: 'var(--canvas-text-dim)' }}>{c.phone}</dd>
                    </div>
                  )}
                  {c.phone_alternate && (
                    <div className="flex gap-2">
                      <dt className="w-12 flex-shrink-0">Alt</dt>
                      <dd style={{ color: 'var(--canvas-text-dim)' }}>{c.phone_alternate}</dd>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex gap-2">
                      <dt className="w-12 flex-shrink-0">Email</dt>
                      <dd style={{ color: 'var(--canvas-text-dim)' }} className="truncate">
                        {c.email}
                      </dd>
                    </div>
                  )}
                  {c.availability_notes && (
                    <div className="flex gap-2 pt-1">
                      <dt className="w-12 flex-shrink-0">Avail</dt>
                      <dd style={{ color: 'var(--canvas-text-dim)' }}>{c.availability_notes}</dd>
                    </div>
                  )}
                </dl>

                {canWrite && (
                  <div
                    className="flex items-center justify-between gap-2 mt-3 pt-2"
                    style={{ borderTop: '1px solid var(--canvas-border)' }}
                  >
                    <ContactFormDialog
                      mode="edit"
                      initial={c}
                      triggerLabel="Edit"
                      triggerClassName="text-[11px] font-medium"
                      onSaved={refresh}
                    />
                    <ArchiveContactButton id={c.id} name={c.contact_name} onArchived={refresh} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!canWrite && !isLoading && (
          <div className="card p-4 text-xs" style={{ color: 'var(--canvas-muted)' }}>
            Only central support can add or edit contacts.
          </div>
        )}
      </div>
    </div>
  )
}
