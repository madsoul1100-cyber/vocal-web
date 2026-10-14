import type { Lang } from '@/api/bharosa'
import { BharosaError } from '@/api/bharosa'

export function errText(err: unknown): string {
  if (err instanceof BharosaError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}

export function Btn({
  children,
  onClick,
  kind = 'primary',
  disabled,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  kind?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const style: React.CSSProperties =
    kind === 'primary'
      ? { background: 'var(--primary)', color: '#fff', border: '1px solid transparent' }
      : kind === 'danger'
        ? { background: 'var(--red-50)', color: 'var(--red-700)', border: '1px solid transparent' }
        : { background: 'transparent', color: 'var(--canvas-text)', border: '1px solid var(--canvas-border)' }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
      style={style}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

export const inputClass = 'w-full rounded-md px-3 py-2 text-sm outline-none'
export const inputStyle: React.CSSProperties = {
  background: 'var(--canvas-bg)',
  color: 'var(--canvas-text)',
  border: '1px solid var(--canvas-border)',
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{ background: 'var(--canvas-surface)', border: '1px solid var(--canvas-border)' }}
    >
      {children}
    </div>
  )
}

export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'error' }) {
  return (
    <p
      className="text-sm rounded-md px-3 py-2"
      style={
        tone === 'error'
          ? { background: 'var(--red-50)', color: 'var(--red-700)' }
          : { background: 'var(--primary-soft-bg)', color: 'var(--primary-soft-text)' }
      }
    >
      {children}
    </p>
  )
}

export interface StatusStep {
  code: string
  label: string
  state: 'done' | 'current' | 'upcoming' | 'skipped'
}

export function Stepper({ steps, onHold }: { steps: StatusStep[]; onHold?: boolean }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((s) => (
        <li
          key={s.code}
          className="text-xs rounded-full px-2.5 py-1"
          style={{
            background: s.state === 'current' ? 'var(--primary)' : s.state === 'done' ? 'var(--green-50)' : 'transparent',
            color: s.state === 'current' ? '#fff' : s.state === 'done' ? 'var(--green-700)' : 'var(--canvas-muted)',
            border: '1px solid var(--canvas-border)',
            textDecoration: s.state === 'skipped' ? 'line-through' : undefined,
          }}
        >
          {s.label}
          {s.state === 'current' && onHold ? ' · on hold' : ''}
        </li>
      ))}
    </ol>
  )
}

export function useLangLabel(lang: Lang) {
  return lang === 'te' ? 'తెలుగు' : 'English'
}
