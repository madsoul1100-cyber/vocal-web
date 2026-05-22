import type { StaffCategoryCounts } from '@/types/workers'

const ITEMS = [
  { key: 'pending' as const, label: 'Pending', hint: 'Awaiting Super Admin / Central Support' },
  { key: 'active' as const, label: 'Active', hint: 'Approved and can sign in' },
  { key: 'inactive' as const, label: 'Inactive', hint: 'Deactivated' },
]

export function WorkersCategoryBar({ categories }: { categories: StaffCategoryCounts }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {ITEMS.map(({ key, label, hint }) => (
        <div
          key={key}
          className="card px-4 py-3 flex items-center justify-between gap-3"
          style={{ borderLeft: `3px solid var(--staff-${key}-accent, var(--canvas-border))` }}
        >
          <div className="min-w-0">
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--canvas-muted)' }}
            >
              {label}
            </div>
            <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--canvas-muted)' }}>
              {hint}
            </div>
          </div>
          <span
            className="text-xl font-semibold tabular-nums flex-shrink-0"
            style={{
              color:
                key === 'pending'
                  ? 'var(--alert-warning-text)'
                  : key === 'active'
                    ? 'var(--green-700)'
                    : 'var(--canvas-text-dim)',
            }}
          >
            {categories[key]}
          </span>
        </div>
      ))}
    </div>
  )
}
