import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  open: boolean
  onClose: () => void
  titleId: string
  children: React.ReactNode
}

/** Renders a centered modal on document.body so it is not clipped by overflow/stacking in the shell. */
export function ModalPortal({ open, onClose, titleId, children }: ModalPortalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
      style={{ zIndex: 100000, background: 'rgba(15, 23, 42, 0.5)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-xl max-h-[min(90vh,720px)] overflow-y-auto my-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
