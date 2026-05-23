import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch, apiPatchForm } from '@/api/client'
import { ModalPortal } from '@/components/ui/ModalPortal'
import {
  useStaffMediaUrl,
  workerProfileMediaPath,
} from '@/hooks/useStaffMediaUrl'
import type { RoleOption, StaffStatus, TerritoryOption, WorkerDetail, WorkerRow } from '@/types/workers'

interface Props {
  worker: WorkerRow
  open: boolean
  onClose: () => void
  territories: TerritoryOption[]
  roles: RoleOption[]
  organizationName?: string | null
  actorRoleDisplayName?: string | null
  canApproveStaff?: boolean
  onSaved?: () => void
}

const MAX_KYC_FILES = 10

export function EditWorkerDialog({
  worker,
  open,
  onClose,
  territories,
  roles,
  organizationName,
  actorRoleDisplayName,
  canApproveStaff = false,
  onSaved,
}: Props) {
  const { getAccessToken } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [removeProfile, setRemoveProfile] = useState(false)
  const [kycFiles, setKycFiles] = useState<File[]>([])
  const profileInputRef = useRef<HTMLInputElement>(null)
  const kycInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['worker', worker.id],
    queryFn: () =>
      apiFetch<{ worker: WorkerDetail }>(`/workers/${worker.id}`, { getToken: getAccessToken }),
    enabled: open,
  })

  const detail = data?.worker
  const formWorker: WorkerDetail | null = detail
    ? {
        ...detail,
        email: detail.email ?? worker.email,
        phone: detail.phone ?? worker.phone,
        full_name: detail.full_name || worker.full_name,
      }
    : null

  useEffect(() => {
    if (!open) {
      setError(null)
      setProfileFile(null)
      setProfilePreview(null)
      setRemoveProfile(false)
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
    setRemoveProfile(false)
    setProfileFile(file)
  }

  const handleKycPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length === 0) return
    const existingCount = formWorker?.kyc_documents?.length ?? 0
    const combined = [...kycFiles, ...picked].slice(0, MAX_KYC_FILES - existingCount)
    if (combined.length < kycFiles.length + picked.length) {
      setError(`At most ${MAX_KYC_FILES} KYC documents total`)
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!formWorker) return
    setError(null)
    setPending(true)
    const form = new FormData(e.currentTarget)

    form.set('full_name', String(form.get('full_name') ?? '').trim())
    form.set('email', String(form.get('email') ?? '').trim().toLowerCase())
    form.set('role_id', String(form.get('role_id') ?? '').trim())
    form.set('staff_status', String(form.get('staff_status') ?? '').trim())
    form.delete('active')

    const phone = String(form.get('phone') ?? '').trim()
    if (phone) form.set('phone', phone)

    const notes = String(form.get('notes') ?? '').trim()
    form.set('notes', notes)

    const territoryId = String(form.get('territory_id') ?? '').trim()
    form.set('territory_id', territoryId)

    if (removeProfile) form.set('remove_profile_image', 'true')

    if (profileFile) {
      form.delete('profile_image')
      form.append('profile_image', profileFile, profileFile.name)
    }

    form.delete('kyc_documents')
    for (const file of kycFiles) {
      form.append('kyc_documents', file, file.name)
    }

    try {
      await apiPatchForm<{ ok: boolean }>(`/workers/${formWorker.id}`, form, getAccessToken)
      onClose()
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update worker')
    } finally {
      setPending(false)
    }
  }

  const inputStyle = {
    background: 'var(--canvas-surface)',
    borderColor: 'var(--canvas-border)',
    color: 'var(--canvas-text)',
  } as const

  const primaryTerritoryId =
    formWorker?.territories?.find((t) => t.is_primary)?.id ??
    formWorker?.territories?.[0]?.id ??
    ''

  const existingKyc = formWorker?.kyc_documents ?? []
  const kycSlotsLeft = MAX_KYC_FILES - existingKyc.length - kycFiles.length

  const existingProfileProxy = useStaffMediaUrl(
    formWorker && formWorker.image_url && !formWorker.profile_image_url
      ? workerProfileMediaPath(formWorker.id)
      : null,
    getAccessToken,
    open && !!formWorker?.image_url,
  )
  const existingProfileSrc =
    formWorker?.profile_image_url ?? existingProfileProxy ?? null

  return (
    <ModalPortal open={open} onClose={onClose} titleId="edit-worker-title">
      {isLoading && (
        <div className="p-8 text-center text-sm" style={{ color: 'var(--canvas-muted)' }}>
          Loading worker…
        </div>
      )}

      {loadError && !isLoading && (
        <div className="p-5 text-sm" style={{ color: 'var(--alert-danger-text)' }}>
          {loadError instanceof Error ? loadError.message : 'Failed to load worker'}
        </div>
      )}

      {formWorker && !isLoading && (
        <form
          key={`${formWorker.id}-${formWorker.email ?? ''}-${formWorker.phone ?? ''}`}
          onSubmit={handleSubmit}
          className="p-5 space-y-3"
        >
          <div className="flex items-center justify-between mb-1 sticky top-0 bg-[var(--canvas-surface)] pb-2 z-10">
            <h2
              id="edit-worker-title"
              className="text-base font-semibold"
              style={{ color: 'var(--canvas-text)' }}
            >
              Edit worker
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-2 py-1"
              style={{ color: 'var(--canvas-muted)' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
            Update profile, contact, role, or territory. Email and phone must match what they use
            for OTP sign-in
            {actorRoleDisplayName ? ` · your role: ${actorRoleDisplayName}` : ''}.
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
              name="full_name"
              required
              maxLength={200}
              defaultValue={formWorker.full_name}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            />
          </Field>

          <Field label="Sign-in email" required>
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              maxLength={200}
              defaultValue={formWorker.email ?? ''}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            />
          </Field>

          <Field label="Mobile number" required hint="Used for OTP sign-in">
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              required
              maxLength={40}
              defaultValue={formWorker.phone ?? ''}
              placeholder="+91 …"
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            />
          </Field>

          <Field label="Role" required hint="Only roles below your hierarchy level">
            <select
              name="role_id"
              required
              defaultValue={formWorker.role_id}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name} ({r.name})
                </option>
              ))}
            </select>
          </Field>

          {territories.length > 0 && (
            <Field label="Primary territory" hint="Optional">
              <select
                name="territory_id"
                defaultValue={primaryTerritoryId}
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

          <Field label="Notes" hint="Optional">
            <textarea
              name="notes"
              rows={3}
              maxLength={5000}
              defaultValue={formWorker.notes ?? ''}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2 resize-none"
              style={inputStyle}
            />
          </Field>

          <Field label="Profile photo" hint="Optional — replace or remove existing">
            <input
              ref={profileInputRef}
              type="file"
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
                {profileFile ? 'Change photo' : 'Upload new photo'}
              </button>
              {formWorker.image_url && (
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeProfile}
                    onChange={(e) => {
                      setRemoveProfile(e.target.checked)
                      if (e.target.checked) {
                        setProfileFile(null)
                        if (profileInputRef.current) profileInputRef.current.value = ''
                      }
                    }}
                  />
                  <span style={{ color: 'var(--canvas-text-dim)' }}>Remove photo</span>
                </label>
              )}
            </div>
            {(profilePreview || (existingProfileSrc && !removeProfile)) && (
              <img
                src={profilePreview ?? existingProfileSrc!}
                alt="Profile"
                className="mt-2 h-24 w-24 rounded-lg object-cover border"
                style={{ borderColor: 'var(--canvas-border)' }}
              />
            )}
          </Field>

          <Field
            label="KYC documents"
            hint={`Add more PDF/images (${existingKyc.length} on file, max ${MAX_KYC_FILES} total)`}
          >
            {existingKyc.length > 0 && (
              <ul className="mb-2 space-y-1">
                {existingKyc.map((doc) => (
                  <li
                    key={doc.storage_path}
                    className="text-xs px-2 py-1 rounded flex items-center justify-between gap-2"
                    style={{
                      background: 'var(--canvas-surface-alt)',
                      color: 'var(--canvas-text-dim)',
                    }}
                  >
                    <span className="truncate">{doc.file_name}</span>
                    {doc.download_url && (
                      <a
                        href={doc.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                        style={{ color: 'var(--primary)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={kycInputRef}
              type="file"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx"
              multiple
              className="hidden"
              onChange={handleKycPick}
            />
            <button
              type="button"
              onClick={() => kycInputRef.current?.click()}
              disabled={kycSlotsLeft <= 0}
              className="text-xs font-medium px-3 py-2 rounded-md border disabled:opacity-50"
              style={{ borderColor: 'var(--canvas-border)', color: 'var(--canvas-text)' }}
            >
              Add documents ({kycFiles.length} new)
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
                      onClick={() => setKycFiles((prev) => prev.filter((_, j) => j !== i))}
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

          <Field
            label="Status"
            required
            hint={
              canApproveStaff
                ? 'Active = approved and can sign in · Pending = awaiting approval · Inactive = deactivated'
                : 'You can set Inactive. Active/Pending changes need Super Admin or Central Support.'
            }
          >
            <select
              name="staff_status"
              required
              defaultValue={formWorker.staff_status as StaffStatus}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            >
              <option
                value="active"
                disabled={!canApproveStaff && !formWorker.approved_at}
              >
                Active
              </option>
              <option value="pending" disabled={!canApproveStaff}>
                Pending
              </option>
              <option value="inactive">Inactive</option>
            </select>
            {!canApproveStaff && formWorker.staff_status === 'pending' && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--canvas-muted)' }}>
                This worker is pending approval — contact Super Admin or Central Support to activate.
              </p>
            )}
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
              onClick={onClose}
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
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </ModalPortal>
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
