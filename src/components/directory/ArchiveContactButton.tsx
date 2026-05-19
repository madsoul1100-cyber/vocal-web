import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiDelete } from '@/api/client'

export function ArchiveContactButton({
  id,
  name,
  onArchived,
}: {
  id: string
  name: string
  onArchived?: () => void
}) {
  const { getAccessToken } = useAuth()
  const [pending, setPending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const archive = async () => {
    setPending(true)
    try {
      await apiDelete(`/directory/${id}`, getAccessToken)
      setConfirmOpen(false)
      onArchived?.()
    } catch {
      setConfirmOpen(false)
    } finally {
      setPending(false)
    }
  }

  if (!confirmOpen) {
    return (
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="text-[11px] font-medium"
        style={{ color: 'var(--canvas-muted)' }}
      >
        Archive
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px]" style={{ color: 'var(--canvas-text-dim)' }}>
        Archive {name}?
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={archive}
        className="text-[11px] font-medium px-2 py-0.5 rounded disabled:opacity-60"
        style={{ background: 'var(--alert-danger-border)', color: '#fff' }}
      >
        {pending ? '…' : 'Confirm'}
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(false)}
        className="text-[11px]"
        style={{ color: 'var(--canvas-muted)' }}
      >
        Cancel
      </button>
    </div>
  )
}
