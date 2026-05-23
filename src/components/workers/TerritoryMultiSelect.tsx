import { useEffect, useState } from 'react'
import { apiPost } from '@/api/client'
import type { TerritoryOption } from '@/types/workers'

interface Props {
  territories: TerritoryOption[]
  selectedIds: string[]
  primaryId: string | null
  onChange: (selectedIds: string[], primaryId: string | null) => void
  getAccessToken: () => Promise<string | null>
  onTerritoryCreated?: () => void
}

function mergeTerritoryLists(
  a: TerritoryOption[],
  b: TerritoryOption[],
): TerritoryOption[] {
  const byId = new Map<string, TerritoryOption>()
  for (const t of [...a, ...b]) byId.set(t.id, t)
  return [...byId.values()].sort((x, y) => x.name.localeCompare(y.name))
}

export function TerritoryMultiSelect({
  territories,
  selectedIds,
  primaryId,
  onChange,
  getAccessToken,
  onTerritoryCreated,
}: Props) {
  const [options, setOptions] = useState<TerritoryOption[]>(territories)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setOptions((prev) => mergeTerritoryLists(prev, territories))
  }, [territories])

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]

    let nextPrimary = primaryId
    if (!next.includes(id)) {
      if (primaryId === id) nextPrimary = next[0] ?? null
    } else if (!primaryId || !next.includes(primaryId)) {
      nextPrimary = id
    }

    onChange(next, nextPrimary)
  }

  const setPrimary = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds, id)
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) {
      setCreateError('Enter a territory name')
      return
    }
    setCreateError(null)
    setCreating(true)
    try {
      const res = await apiPost<{ ok: boolean; territory: TerritoryOption }>(
        '/workers/territories',
        { name },
        getAccessToken,
      )
      const created = res.territory
      setOptions((prev) => mergeTerritoryLists(prev, [created]))
      const nextIds = selectedIds.includes(created.id)
        ? selectedIds
        : [...selectedIds, created.id]
      onChange(nextIds, primaryId ?? created.id)
      setNewName('')
      setShowAdd(false)
      onTerritoryCreated?.()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create territory')
    } finally {
      setCreating(false)
    }
  }

  const inputStyle = {
    background: 'var(--canvas-surface)',
    borderColor: 'var(--canvas-border)',
    color: 'var(--canvas-text)',
  } as const

  return (
    <div className="space-y-2">
      {options.length === 0 && !showAdd && (
        <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
          No territories yet. Add one below.
        </p>
      )}

      {options.length > 0 && (
        <ul
          className="max-h-40 overflow-y-auto rounded-md border divide-y"
          style={{ borderColor: 'var(--canvas-border)' }}
        >
          {options.map((t) => {
            const checked = selectedIds.includes(t.id)
            const isPrimary = primaryId === t.id
            return (
              <li
                key={t.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
                style={{ color: 'var(--canvas-text)' }}
              >
                <input
                  type="checkbox"
                  id={`territory-${t.id}`}
                  checked={checked}
                  onChange={() => toggle(t.id)}
                  className="rounded"
                />
                <label htmlFor={`territory-${t.id}`} className="flex-1 cursor-pointer">
                  {t.name}
                </label>
                {checked && selectedIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPrimary(t.id)}
                    className="text-[10px] px-1.5 py-0.5 rounded border shrink-0"
                    style={{
                      borderColor: isPrimary ? 'var(--primary)' : 'var(--canvas-border)',
                      color: isPrimary ? 'var(--primary)' : 'var(--canvas-muted)',
                    }}
                  >
                    {isPrimary ? 'Primary' : 'Set primary'}
                  </button>
                )}
                {checked && selectedIds.length === 1 && isPrimary && (
                  <span className="text-[10px]" style={{ color: 'var(--canvas-muted)' }}>
                    Primary
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {selectedIds.length > 0 && (
        <p className="text-[10px]" style={{ color: 'var(--canvas-muted)' }}>
          {selectedIds.length} selected
          {primaryId && options.find((o) => o.id === primaryId)
            ? ` · primary: ${options.find((o) => o.id === primaryId)!.name}`
            : ''}
        </p>
      )}

      {!showAdd ? (
        <button
          type="button"
          onClick={() => {
            setShowAdd(true)
            setCreateError(null)
          }}
          className="text-xs font-medium"
          style={{ color: 'var(--primary)' }}
        >
          + Add new territory
        </button>
      ) : (
        <div className="flex flex-col gap-2 p-3 rounded-md border" style={inputStyle}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Territory name"
            maxLength={200}
            className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
            style={inputStyle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleCreate()
              }
            }}
          />
          {createError && (
            <p className="text-xs" style={{ color: 'var(--alert-danger-text)' }}>
              {createError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreate()}
              className="text-xs font-medium px-3 py-1.5 rounded-md disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
            >
              {creating ? 'Creating…' : 'Create & select'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false)
                setNewName('')
                setCreateError(null)
              }}
              className="text-xs px-3 py-1.5"
              style={{ color: 'var(--canvas-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
