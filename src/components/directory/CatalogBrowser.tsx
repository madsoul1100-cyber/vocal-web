import { FormEvent, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/api/client'
import { Badge } from '@/components/ui/Badge'
import type { CatalogContact, CatalogListResponse, CatalogQueryResponse } from '@/types/directory'

const selectClass = 'text-sm px-3 py-1.5 rounded-md border outline-none max-w-full'
const selectStyle = {
  background: 'var(--canvas-surface)',
  borderColor: 'var(--canvas-border)',
  color: 'var(--canvas-text)',
}

function channelLabel(channel: CatalogContact['channel']) {
  if (channel === 'number') return 'Number only'
  if (channel === 'both') return 'Mail and number'
  return 'Mail'
}

export function CatalogBrowser() {
  const { getAccessToken } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const catalogId = searchParams.get('catalog') ?? ''
  const department = searchParams.get('department') ?? ''
  const channel = searchParams.get('channel') ?? 'all'
  const search = searchParams.get('q') ?? ''
  const offset = Math.max(0, Number(searchParams.get('offset') ?? '0') || 0)

  const catalogsQuery = useQuery({
    queryKey: ['directory-catalogs'],
    queryFn: () => apiFetch<CatalogListResponse>('/directory/catalogs', { getToken: getAccessToken }),
  })

  const catalogs = catalogsQuery.data?.catalogs ?? []
  const selectedId = catalogId || catalogs[0]?.id || ''

  const queryString = useMemo(() => {
    if (!selectedId) return ''
    const qp = new URLSearchParams()
    if (department) qp.set('department', department)
    if (channel && channel !== 'all') qp.set('channel', channel)
    if (search.trim()) qp.set('search', search.trim())
    qp.set('limit', '40')
    qp.set('offset', String(offset))
    return qp.toString()
  }, [selectedId, department, channel, search, offset])

  const detailQuery = useQuery({
    queryKey: ['directory-catalog', selectedId, queryString],
    enabled: !!selectedId,
    queryFn: () =>
      apiFetch<CatalogQueryResponse>(`/directory/catalogs/${selectedId}?${queryString}`, {
        getToken: getAccessToken,
      }),
  })

  const setParam = (key: string, value: string, resetOffset = true) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('view', 'catalog')
      if (value) next.set(key, value)
      else next.delete(key)
      if (resetOffset) next.delete('offset')
      return next
    })
  }

  const catalog = detailQuery.data?.catalog
  const contacts = detailQuery.data?.contacts ?? []
  const total = detailQuery.data?.total ?? 0
  const limit = detailQuery.data?.limit ?? 40
  const selectedDepartment = catalog?.departments.find((dept) => dept.name === department)
  const scope = selectedDepartment ?? (catalog
    ? { total: catalog.total, mail: catalog.mail, number_only: catalog.number_only }
    : null)

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '')
    setParam('q', q.trim())
  }

  if (catalogsQuery.isLoading) {
    return <div className="card py-16 text-center text-sm" style={{ color: 'var(--canvas-muted)' }}>Loading directories…</div>
  }

  if (catalogsQuery.error) {
    return (
      <div className="text-sm px-4 py-3 rounded-lg" style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}>
        {catalogsQuery.error instanceof Error ? catalogsQuery.error.message : 'Failed to load directories'}
      </div>
    )
  }

  if (catalogs.length === 0) {
    return <div className="card py-16 text-center text-sm" style={{ color: 'var(--canvas-muted)' }}>No published directory files yet.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs flex flex-col gap-1" style={{ color: 'var(--canvas-muted)' }}>
          Directory
          <select
            className={selectClass}
            style={selectStyle}
            value={selectedId}
            onChange={(e) => setParam('catalog', e.target.value)}
          >
            {catalogs.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs flex flex-col gap-1 min-w-[16rem]" style={{ color: 'var(--canvas-muted)' }}>
          Department
          <select
            className={selectClass}
            style={selectStyle}
            value={department}
            onChange={(e) => setParam('department', e.target.value)}
          >
            <option value="">All departments</option>
            {(catalog?.departments ?? []).map((dept) => (
              <option key={dept.name} value={dept.name}>
                {dept.name} · {dept.mail} mail · {dept.number_only} number
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={onSearch} className="ml-auto">
          <input
            name="q"
            key={search}
            defaultValue={search}
            placeholder="Search name, office, email, phone…"
            className="text-sm px-3 py-1.5 rounded-md border outline-none w-64"
            style={selectStyle}
          />
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: `All${scope ? ` · ${scope.total}` : ''}` },
          { id: 'mail', label: `Mail${scope ? ` · ${scope.mail}` : ''}` },
          { id: 'number', label: `Number only${scope ? ` · ${scope.number_only}` : ''}` },
        ].map((item) => {
          const active = channel === item.id || (item.id === 'all' && !channel)
          return (
            <button
              key={item.id}
              type="button"
              className="text-xs px-3 py-1.5 rounded-md font-medium"
              style={{
                background: active ? 'var(--canvas-surface)' : 'var(--slate-100)',
                color: active ? 'var(--canvas-text)' : 'var(--canvas-muted)',
                boxShadow: active ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => setParam('channel', item.id === 'all' ? '' : item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {scope && (
        <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
          {scope.mail} can be emailed. {scope.number_only} have a phone number and no email, so they have to be reached by phone.
          {catalog?.fetched_at ? ` Published ${catalog.fetched_at}.` : ''}
        </p>
      )}

      {detailQuery.isLoading ? (
        <div className="card py-16 text-center text-sm" style={{ color: 'var(--canvas-muted)' }}>Loading contacts…</div>
      ) : detailQuery.error ? (
        <div className="text-sm px-4 py-3 rounded-lg" style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}>
          {detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load this directory'}
        </div>
      ) : contacts.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: 'var(--canvas-muted)' }}>No contacts match these filters.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: 'var(--canvas-muted)' }}>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Department</th>
                <th className="px-4 py-2 font-medium">Reach</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} style={{ borderTop: '1px solid var(--canvas-border)' }}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium" style={{ color: 'var(--canvas-text)' }}>{contact.name}</div>
                    <div className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
                      {[contact.designation, contact.office].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs" style={{ color: 'var(--canvas-text-dim)' }}>{contact.department}</td>
                  <td className="px-4 py-3 align-top">
                    <Badge variant={contact.channel === 'number' ? 'warning' : 'success'} size="xs">
                      {channelLabel(contact.channel)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-top text-xs" style={{ color: 'var(--canvas-text-dim)' }}>{contact.email || '—'}</td>
                  <td className="px-4 py-3 align-top text-xs" style={{ color: 'var(--canvas-text-dim)' }}>{contact.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--canvas-muted)' }}>
          <span>{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button type="button" disabled={offset === 0} className="px-3 py-1.5 rounded-md border disabled:opacity-40" style={selectStyle} onClick={() => setParam('offset', String(Math.max(0, offset - limit)), false)}>Previous</button>
            <button type="button" disabled={offset + limit >= total} className="px-3 py-1.5 rounded-md border disabled:opacity-40" style={selectStyle} onClick={() => setParam('offset', String(offset + limit), false)}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
