import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiPostForm } from '@/api/client'
import { ModalPortal } from '@/components/ui/ModalPortal'
import type { RoleOption, TerritoryOption } from '@/types/workers'

interface Props {
  territories: TerritoryOption[]
  roles: RoleOption[]
  organizationName?: string | null
  canApproveStaff?: boolean
  actorRoleDisplayName?: string | null
  onSaved?: () => void
}

const GROUND_WORKER_ROLE_ID = '00000000-0000-0000-0000-000000000005'
const MAX_KYC_FILES = 10

export function AddWorkerDialog({
  territories,
  roles,
  organizationName,
  canApproveStaff = false,
  actorRoleDisplayName,
  onSaved,
}: Props) {
  const { getAccessToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [kycFiles, setKycFiles] = useState<File[]>([])
  const firstInputRef = useRef<HTMLInputElement>(null)
  const profileInputRef = useRef<HTMLInputElement>(null)
  const kycInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setSuccess(null)
      setTimeout(() => firstInputRef.current?.focus(), 40)
    } else {
      setProfileFile(null)
      setProfilePreview(null)
      setKycFiles([])
    }
  }, [open])

  useEffect(() => {
    if (!profileFile) {
      setProfilePreview(null)
      return
    }
    const url = URL.createObjectURL(profileFile)
    setProfilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [profileFile])

  const handleProfilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Profile photo must be an image')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be under 5 MB')
      return
    }
    setError(null)
    setProfileFile(file)
  }

  const handleKycPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length === 0) return
    const combined = [...kycFiles, ...picked].slice(0, MAX_KYC_FILES)
    if (combined.length > MAX_KYC_FILES) {
      setError(`At most ${MAX_KYC_FILES} KYC documents`)
      return
    }
    for (const f of picked) {
      if (f.size > 10 * 1024 * 1024) {
        setError('Each KYC document must be under 10 MB')
        return
      }
    }
    setError(null)
    setKycFiles(combined)
    e.target.value = ''
  }

  const removeKyc = (index: number) => {
    setKycFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setPending(true)
    const form = new FormData(e.currentTarget)

    form.set('full_name', String(form.get('full_name') ?? '').trim())
    form.set('email', String(form.get('email') ?? '').trim().toLowerCase())
    form.set('role_id', String(form.get('role_id') ?? '').trim())
    form.set('active', form.get('active') === 'on' ? 'true' : 'false')

    const phone = String(form.get('phone') ?? '').trim()
    if (phone) form.set('phone', phone)

    const notes = String(form.get('notes') ?? '').trim()
    if (notes) form.set('notes', notes)

    if (profileFile) {
      form.delete('profile_image')
      form.append('profile_image', profileFile, profileFile.name)
    }

    form.delete('kyc_documents')
    for (const file of kycFiles) {
      form.append('kyc_documents', file, file.name)
    }

    try {
      const res = await apiPostForm<{
        ok: boolean
        pending_approval?: boolean
      }>('/workers', form, getAccessToken)

      if (res.pending_approval) {
        setSuccess(
          'Request submitted. Super Admin or Central Support will review and activate this worker.',
        )
        setTimeout(() => {
          setOpen(false)
          onSaved?.()
        }, 1800)
      } else {
        setOpen(false)
        onSaved?.()
      }
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

  const submitLabel = pending
    ? canApproveStaff
      ? 'Creating…'
      : 'Submitting…'
    : canApproveStaff
      ? 'Create worker'
      : 'Submit for approval'

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
            {canApproveStaff ? (
              <>
                Creates staff with sign-in credentials. Profile photo and KYC files are stored in
                S3 (or org storage). Roles must be below your level
                {actorRoleDisplayName ? ` (${actorRoleDisplayName})` : ''}.
              </>
            ) : (
              <>
                Submits for <strong>Super Admin</strong> or <strong>Central Support</strong>{' '}
                approval. Only roles below your level
                {actorRoleDisplayName ? ` (${actorRoleDisplayName})` : ''}.
              </>
            )}
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

          <Field label="Role" required hint="Only roles below your hierarchy level">
            <select
              name="role_id"
              required
              defaultValue={defaultRoleId}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            >
              {roles.length === 0 ? (
                <option value="">No assignable roles</option>
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

          <Field label="Notes" hint="Optional — internal notes about this worker">
            <textarea
              name="notes"
              rows={3}
              maxLength={5000}
              placeholder="Background, assignment context, etc."
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2 resize-none"
              style={inputStyle}
            />
          </Field>

          <Field
            label="Profile photo"
            hint="Optional — tap to use camera or gallery (max 5 MB)"
          >
            <input
              ref={profileInputRef}
              type="file"
              name="profile_image"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleProfilePick}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                className="text-xs font-medium px-3 py-2 rounded-md border"
                style={{ borderColor: 'var(--canvas-border)', color: 'var(--canvas-text)' }}
              >
                {profileFile ? 'Change photo' : 'Take / upload photo'}
              </button>
              {profileFile && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileFile(null)
                    if (profileInputRef.current) profileInputRef.current.value = ''
                  }}
                  className="text-xs"
                  style={{ color: 'var(--canvas-muted)' }}
                >
                  Remove
                </button>
              )}
            </div>
            {profilePreview && (
              <img
                src={profilePreview}
                alt="Profile preview"
                className="mt-2 h-20 w-20 rounded-lg object-cover border"
                style={{ borderColor: 'var(--canvas-border)' }}
              />
            )}
          </Field>

          <Field
            label="KYC documents"
            hint={`Optional — PDF or images, up to ${MAX_KYC_FILES} files (10 MB each)`}
          >
            <input
              ref={kycInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx"
              multiple
              className="hidden"
              onChange={handleKycPick}
            />
            <button
              type="button"
              onClick={() => kycInputRef.current?.click()}
              disabled={kycFiles.length >= MAX_KYC_FILES}
              className="text-xs font-medium px-3 py-2 rounded-md border disabled:opacity-50"
              style={{ borderColor: 'var(--canvas-border)', color: 'var(--canvas-text)' }}
            >
              Add documents ({kycFiles.length}/{MAX_KYC_FILES})
            </button>
            {kycFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {kycFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded"
                    style={{
                      background: 'var(--canvas-surface-alt)',
                      color: 'var(--canvas-text-dim)',
                    }}
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeKyc(i)}
                      className="flex-shrink-0"
                      style={{ color: 'var(--alert-danger-text)' }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              className="rounded border"
              style={{ borderColor: 'var(--canvas-border)' }}
            />
            <span className="text-sm" style={{ color: 'var(--canvas-text)' }}>
              Active after approval (can sign in and work tickets)
            </span>
          </label>

          {success && (
            <div
              className="text-xs px-3 py-2 rounded-md"
              style={{
                background: 'var(--alert-success-bg, var(--green-50))',
                color: 'var(--alert-success-text, var(--green-800))',
                borderLeft: '3px solid var(--green-600)',
              }}
            >
              {success}
            </div>
          )}

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
              {submitLabel}
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
