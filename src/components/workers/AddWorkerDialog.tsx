import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiPost } from '@/api/client'
import { ModalPortal } from '@/components/ui/ModalPortal'
import type { RoleOption, TerritoryOption } from '@/types/workers'

interface Props {
  territories: TerritoryOption[]
  roles: RoleOption[]
  organizationName?: string | null
  onSaved?: () => void
}

const GROUND_WORKER_ROLE_ID = '00000000-0000-0000-0000-000000000005'

export function AddWorkerDialog({ territories, roles, organizationName, onSaved }: Props) {
  const { getAccessToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => firstInputRef.current?.focus(), 40)
  }, [open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(e.currentTarget)

    const payload: Record<string, string | boolean> = {
      full_name: String(form.get('full_name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim().toLowerCase(),
      password: String(form.get('password') ?? ''),
      role_id: String(form.get('role_id') ?? '').trim(),
      active: form.get('active') === 'on',
    }

    const phone = String(form.get('phone') ?? '').trim()
    const metadata = String(form.get('metadata_json') ?? '').trim()
    const territory = String(form.get('territory_id') ?? '').trim()

    if (phone) payload.phone = phone
    if (metadata) payload.metadata_json = metadata
    if (territory) payload.territory_id = territory

    try {
      await apiPost('/workers', payload, getAccessToken)
      setOpen(false)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add worker')
    } finally {
      setPending(false)
    }
  }

  const inputStyle = {
    background: 'var(--canvas-surface)',
    borderColor: 'var(--canvas-border)',
    color: 'var(--canvas-text)',
  } as const

  const defaultRoleId =
    roles.find((r) => r.id === GROUND_WORKER_ROLE_ID)?.id ??
    roles.find((r) => r.name === 'ground_worker')?.id ??
    roles[0]?.id ??
    ''

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium px-3 py-1.5 rounded-md"
        style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
      >
        + Add worker
      </button>

      <ModalPortal open={open} onClose={() => setOpen(false)} titleId="add-worker-title">
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="flex items-center justify-between mb-1 sticky top-0 bg-[var(--canvas-surface)] pb-2 z-10">
            <h2
              id="add-worker-title"
              className="text-base font-semibold"
              style={{ color: 'var(--canvas-text)' }}
            >
              Add worker
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-2 py-1"
              style={{ color: 'var(--canvas-muted)' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
            Creates a staff login (email + password) and a matching{' '}
            <strong>users</strong> row. They can sign in at /sign-in with those credentials.
          </p>

          {organizationName && (
            <Field label="Organization">
              <input
                readOnly
                value={organizationName}
                className="w-full text-sm px-3 py-2 rounded-md border opacity-80 cursor-not-allowed"
                style={inputStyle}
              />
            </Field>
          )}

          <Field label="Full name" required>
            <input
              ref={firstInputRef}
              name="full_name"
              required
              maxLength={200}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            />
          </Field>

          <Field label="Sign-in email" required hint="Used for sign-in at /sign-in">
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              maxLength={200}
              placeholder="name@example.com"
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            />
          </Field>

          <Field label="Password" required hint="Min 8 characters — for staff sign-in">
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            />
          </Field>

          <Field label="Phone">
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              maxLength={40}
              placeholder="+91 …"
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            />
          </Field>

          <Field label="Role" required>
            <select
              name="role_id"
              required
              defaultValue={defaultRoleId}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            >
              {roles.length === 0 ? (
                <option value="">No roles loaded</option>
              ) : (
                roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name} ({r.name})
                  </option>
                ))
              )}
            </select>
          </Field>

          {territories.length > 0 && (
            <Field label="Primary territory" hint="Optional">
              <select
                name="territory_id"
                defaultValue=""
                className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
                style={inputStyle}
              >
                <option value="">— None —</option>
                {territories.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              className="rounded border"
              style={{ borderColor: 'var(--canvas-border)' }}
            />
            <span className="text-sm" style={{ color: 'var(--canvas-text)' }}>
              Active (can sign in and work tickets)
            </span>
          </label>

          <Field label="Metadata (JSON)" hint="Optional">
            <textarea
              name="metadata_json"
              rows={2}
              placeholder='{"notes": "…"}'
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2 resize-none font-mono text-xs"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div
              className="text-xs px-3 py-2 rounded-md"
              style={{
                background: 'var(--alert-danger-bg)',
                color: 'var(--alert-danger-text)',
                borderLeft: '3px solid var(--alert-danger-border)',
              }}
            >
              {error}
            </div>
          )}

          <div
            className="flex items-center justify-end gap-2 pt-2 border-t"
            style={{ borderColor: 'var(--canvas-border)' }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium px-3 py-1.5 rounded-md"
              style={{ color: 'var(--canvas-text-dim)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || roles.length === 0}
              className="text-xs font-medium px-3 py-1.5 rounded-md disabled:opacity-60"
              style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
            >
              {pending ? 'Creating…' : 'Create worker'}
            </button>
          </div>
        </form>
      </ModalPortal>
    </>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span
        className="block text-[11px] font-medium uppercase tracking-wider mb-1"
        style={{ color: 'var(--canvas-muted)' }}
      >
        {label}
        {required && <span style={{ color: 'var(--sev-critical)' }}> *</span>}
      </span>
      {hint && (
        <span className="block text-[10px] mb-1" style={{ color: 'var(--canvas-muted)' }}>
          {hint}
        </span>
      )}
      {children}
    </label>
  )
}
