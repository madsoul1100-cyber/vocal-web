import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'
import type {
  TerritoryHierarchyNode,
  TerritoryLevelInfo,
  TerritorySelection,
} from '@/types/workers'

interface Props {
  selections: TerritorySelection[]
  primaryTerritoryId: string | null
  onChange: (selections: TerritorySelection[], primaryTerritoryId: string | null) => void
  getAccessToken: () => Promise<string | null>
}

type DropdownRow = {
  parentId: string | null
  selectedId: string
  options: TerritoryHierarchyNode[]
  levelLabel: string
}

export function TerritoryCascadeSelect({
  selections,
  primaryTerritoryId,
  onChange,
  getAccessToken,
}: Props) {
  const [levels, setLevels] = useState<TerritoryLevelInfo[]>([])
  const [rootState, setRootState] = useState<TerritoryHierarchyNode | null>(null)
  const [rows, setRows] = useState<DropdownRow[]>([])
  const [pending, setPending] = useState<TerritoryHierarchyNode | null>(null)
  const [descendantCount, setDescendantCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchChildren = useCallback(
    async (parentId: string | null) => {
      const q = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : ''
      const res = await apiFetch<{ children: TerritoryHierarchyNode[] }>(
        `/workers/territories/children${q}`,
        { getToken: getAccessToken },
      )
      return res.children
    },
    [getAccessToken],
  )

  const applyBootstrap = useCallback(
    (bootstrap: {
      levels: TerritoryLevelInfo[]
      state: TerritoryHierarchyNode
      districts: TerritoryHierarchyNode[]
    }) => {
      setLevels(bootstrap.levels)
      setRootState(bootstrap.state)
      const districtLabel =
        bootstrap.levels.find((l) => l.level_order === 2)?.label ?? 'District'
      setRows([
        {
          parentId: bootstrap.state.id,
          selectedId: '',
          options: bootstrap.districts,
          levelLabel: districtLabel,
        },
      ])
      setPending(null)
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const bootstrap = await apiFetch<{
          levels: TerritoryLevelInfo[]
          state: TerritoryHierarchyNode
          districts: TerritoryHierarchyNode[]
        }>('/workers/territories/bootstrap', { getToken: getAccessToken })
        if (cancelled) return
        applyBootstrap(bootstrap)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load territories')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAccessToken, applyBootstrap])

  useEffect(() => {
    if (!pending?.has_children) {
      setDescendantCount(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiFetch<{ descendant_count: number }>(
          `/workers/territories/${pending.id}/descendants`,
          { getToken: getAccessToken },
        )
        if (!cancelled) setDescendantCount(res.descendant_count)
      } catch {
        if (!cancelled) setDescendantCount(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pending?.id, pending?.has_children, getAccessToken])

  const addSelection = (node: TerritoryHierarchyNode, includeDescendants: boolean) => {
    const exists = selections.some(
      (s) => s.territory_id === node.id && s.include_descendants === includeDescendants,
    )
    if (exists) return

    const next: TerritorySelection[] = [
      ...selections,
      { territory_id: node.id, name: node.name, include_descendants: includeDescendants },
    ]
    const nextPrimary =
      primaryTerritoryId && next.some((s) => s.territory_id === primaryTerritoryId)
        ? primaryTerritoryId
        : node.id
    onChange(next, nextPrimary)
    setPending(null)
    setDescendantCount(null)
    // Reset cascade to root for another pick
    void resetCascade()
  }

  const resetCascade = async () => {
    try {
      const bootstrap = await apiFetch<{
        levels: TerritoryLevelInfo[]
        state: TerritoryHierarchyNode
        districts: TerritoryHierarchyNode[]
      }>('/workers/territories/bootstrap', { getToken: getAccessToken })
      applyBootstrap(bootstrap)
    } catch {
      /* keep current rows */
    }
  }

  const removeSelection = (index: number) => {
    const next = selections.filter((_, i) => i !== index)
    const removed = selections[index]
    let nextPrimary = primaryTerritoryId
    if (removed && primaryTerritoryId === removed.territory_id) {
      nextPrimary = next[0]?.territory_id ?? null
    }
    onChange(next, nextPrimary)
  }

  const onDropdownChange = async (rowIndex: number, territoryId: string) => {
    const row = rows[rowIndex]
    if (!row) return

    const node = row.options.find((o) => o.id === territoryId)
    if (!node) return

    const nextRows = rows.slice(0, rowIndex + 1).map((r, i) =>
      i === rowIndex ? { ...r, selectedId: territoryId } : r,
    )
    setRows(nextRows)
    setPending(node)

    if (node.has_children) {
      try {
        const children = await fetchChildren(node.id)
        const childLevel =
          levels.find((l) => l.level_order === node.level_order + 1)?.label ??
          'Sub-territory'
        setRows((prev) => [
          ...prev.slice(0, rowIndex + 1),
          {
            parentId: node.id,
            selectedId: '',
            options: children,
            levelLabel: childLevel,
          },
        ])
      } catch {
        /* pending actions still work */
      }
    }
  }

  const inputStyle = {
    background: 'var(--canvas-surface)',
    borderColor: 'var(--canvas-border)',
    color: 'var(--canvas-text)',
  } as const

  if (loading) {
    return (
      <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
        Loading territory hierarchy…
      </p>
    )
  }

  if (loadError) {
    return (
      <p className="text-xs" style={{ color: 'var(--alert-danger-text)' }}>
        {loadError}. Run <code className="text-[10px]">npm run seed:territories</code> in
        vocal-api if the list is empty.
      </p>
    )
  }

  if (rows[0]?.options.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
        No territories in hierarchy. Import Telangana data with{' '}
        <code className="text-[10px]">npm run seed:territories</code>.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {rootState && (
        <div>
          <span
            className="block text-[10px] font-medium uppercase tracking-wider mb-1"
            style={{ color: 'var(--canvas-muted)' }}
          >
            State
          </span>
          <div
            className="text-sm px-3 py-2 rounded-md border font-medium"
            style={{
              ...inputStyle,
              background: 'var(--canvas-surface-alt)',
            }}
          >
            {rootState.name}
          </div>
          {rows[0]?.options.length != null && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--canvas-muted)' }}>
              {rows[0].options.length} districts available
            </p>
          )}
        </div>
      )}

      {rows.map((row, i) => (
        <div key={`${row.parentId ?? 'root'}-${i}`}>
          <label
            className="block text-[10px] font-medium uppercase tracking-wider mb-1"
            style={{ color: 'var(--canvas-muted)' }}
          >
            {row.levelLabel}
          </label>
          <select
            value={row.selectedId}
            onChange={(e) => void onDropdownChange(i, e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
            style={inputStyle}
          >
            <option value="">— Select —</option>
            {row.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.code ? ` (${o.code})` : ''}
              </option>
            ))}
          </select>
        </div>
      ))}

      {pending && (
        <div
          className="p-3 rounded-md border space-y-2"
          style={{ borderColor: 'var(--canvas-border)', background: 'var(--canvas-surface-alt)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--canvas-text)' }}>
            {pending.name}
            <span className="font-normal" style={{ color: 'var(--canvas-muted)' }}>
              {' '}
              · {pending.level_label}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addSelection(pending, false)}
              className="text-xs font-medium px-3 py-1.5 rounded-md border disabled:opacity-50"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              Assign {pending.name} only
            </button>
            {pending.has_children && (
              <button
                type="button"
                onClick={() => addSelection(pending, true)}
                className="text-xs font-medium px-3 py-1.5 rounded-md disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
              >
                Assign all under {pending.name}
                {descendantCount != null ? ` (${descendantCount})` : ''}
              </button>
            )}
          </div>
          <p className="text-[10px]" style={{ color: 'var(--canvas-muted)' }}>
            Or pick a sub-area in the dropdown below to narrow further (e.g. a specific mandal
            or ward).
          </p>
        </div>
      )}

      {selections.length > 0 && (
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-wider mb-1"
            style={{ color: 'var(--canvas-muted)' }}
          >
            Assigned areas ({selections.length})
          </p>
          <ul className="space-y-1">
            {selections.map((s, i) => {
              const isPrimary = primaryTerritoryId === s.territory_id
              const display = s.include_descendants ? `All under ${s.name}` : s.name
              return (
                <li
                  key={`${s.territory_id}-${s.include_descendants}`}
                  className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md border"
                  style={{
                    borderColor: 'var(--canvas-border)',
                    color: 'var(--canvas-text)',
                  }}
                >
                  <span className="flex-1">{display}</span>
                  {selections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onChange(selections, s.territory_id)}
                      className="text-[10px] px-1.5 py-0.5 rounded border shrink-0"
                      style={{
                        borderColor: isPrimary ? 'var(--primary)' : 'var(--canvas-border)',
                        color: isPrimary ? 'var(--primary)' : 'var(--canvas-muted)',
                      }}
                    >
                      {isPrimary ? 'Primary' : 'Set primary'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSelection(i)}
                    className="shrink-0"
                    style={{ color: 'var(--alert-danger-text)' }}
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Expand selections to concrete territory UUIDs for forms that still send territory_ids. */
export async function expandTerritorySelections(
  selections: TerritorySelection[],
  getAccessToken: () => Promise<string | null>,
): Promise<string[]> {
  const ids = new Set<string>()
  for (const s of selections) {
    if (s.include_descendants) {
      const res = await apiFetch<{ territory_ids: string[] }>(
        `/workers/territories/${s.territory_id}/descendants`,
        { getToken: getAccessToken },
      )
      for (const id of res.territory_ids) ids.add(id)
    } else {
      ids.add(s.territory_id)
    }
  }
  return [...ids]
}
