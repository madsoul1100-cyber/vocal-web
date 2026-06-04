/**
 * Field intake form — file a ticket when a citizen reports an issue in person.
 * Required: name, number, address, description.
 * Optional: geo location, photos.
 */

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost, apiPostForm } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'

const INTAKE_ROLES = new Set([
  'super_admin',
  'central_support',
  'state_leader',
  'district_leader',
  'ground_worker',
])

const MAX_PHOTOS = 5

export function canShowWorkerCreateTicket(role: string | null | undefined): boolean {
  return !!role && INTAKE_ROLES.has(role)
}

interface WorkerIntakeResponse {
  ok: boolean
  ticket_id: string
  ticket_number: string
}

interface Props {
  onCreated?: () => void
  navigateOnSuccess?: boolean
}

function validateForm(fields: {
  name: string
  number: string
  address: string
  description: string
}): string | null {
  if (!fields.name.trim()) return 'Citizen name is required.'
  if (!fields.number.trim()) return 'Citizen number is required.'
  if (!fields.address.trim()) return 'Address is required.'
  if (!fields.description.trim()) return 'Description is required.'
  return null
}

async function uploadTicketPhotos(
  ticketId: string,
  files: File[],
  getAccessToken: () => Promise<string | null>,
): Promise<void> {
  for (const file of files) {
    const form = new FormData()
    form.append('file', file)
    await apiPostForm(`/tickets/${ticketId}/attachments`, form, getAccessToken)
  }
}

export function WorkerCreateTicketForm({ onCreated, navigateOnSuccess = true }: Props) {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [citizenName, setCitizenName] = useState('')
  const [citizenPhone, setCitizenPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setCitizenName('')
    setCitizenPhone('')
    setAddress('')
    setDescription('')
    setLatitude(null)
    setLongitude(null)
    setPhotos([])
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length === 0) return
    setPhotos((prev) => {
      const merged = [...prev, ...picked].slice(0, MAX_PHOTOS)
      return merged
    })
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function captureGeo() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.')
      return
    }
    setGeoLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setGeoLoading(false)
      },
      () => {
        setError('Could not get your location. Check permissions and try again.')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  function clearGeo() {
    setLatitude(null)
    setLongitude(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fields = {
      name: citizenName,
      number: citizenPhone,
      address,
      description,
    }
    const validationError = validateForm(fields)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        citizen_name: fields.name.trim(),
        citizen_phone: fields.number.trim(),
        address: fields.address.trim(),
        description: fields.description.trim(),
      }
      if (latitude != null && longitude != null) {
        body.latitude = latitude
        body.longitude = longitude
      }

      const res = await apiPost<WorkerIntakeResponse>(
        '/tickets/worker-intake',
        body,
        getAccessToken,
      )

      if (photos.length > 0 && res.ticket_id) {
        try {
          await uploadTicketPhotos(res.ticket_id, photos, getAccessToken)
        } catch (uploadErr) {
          const msg =
            uploadErr instanceof Error ? uploadErr.message : 'Photo upload failed'
          setError(`Ticket ${res.ticket_number} created, but photos failed: ${msg}`)
          onCreated?.()
          if (navigateOnSuccess) navigate(`/tickets/${res.ticket_id}`)
          return
        }
      }

      resetForm()
      setOpen(false)
      onCreated?.()
      if (navigateOnSuccess && res.ticket_id) {
        navigate(`/tickets/${res.ticket_id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-sm font-medium px-4 py-3 rounded-lg border"
        style={{
          borderColor: 'var(--primary)',
          color: 'var(--primary)',
          background: 'var(--canvas-surface)',
        }}
      >
        + Report citizen issue (create ticket)
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: 'var(--canvas-border)', background: 'var(--canvas-surface)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--canvas-text)' }}>
            New field report
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--canvas-muted)' }}>
            Name, number, address, and description are required. Assigned to you automatically.
          </p>
        </div>
        <button
          type="button"
          className="text-xs shrink-0"
          style={{ color: 'var(--canvas-muted)' }}
          onClick={() => {
            if (!submitting) {
              resetForm()
              setOpen(false)
              setError(null)
            }
          }}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
            Name *
          </span>
          <input
            value={citizenName}
            onChange={(e) => setCitizenName(e.target.value)}
            required
            autoComplete="name"
            className="mt-1 w-full text-sm px-3 py-2 rounded-md border"
            style={{ borderColor: 'var(--canvas-border)' }}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
            Number *
          </span>
          <input
            value={citizenPhone}
            onChange={(e) => setCitizenPhone(e.target.value)}
            type="tel"
            required
            autoComplete="tel"
            className="mt-1 w-full text-sm px-3 py-2 rounded-md border"
            style={{ borderColor: 'var(--canvas-border)' }}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
          Address *
        </span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          placeholder="House no., street, village, mandal…"
          className="mt-1 w-full text-sm px-3 py-2 rounded-md border"
          style={{ borderColor: 'var(--canvas-border)' }}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
          Description *
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          placeholder="What is the citizen asking for help with?"
          className="mt-1 w-full text-sm px-3 py-2 rounded-md border resize-y"
          style={{ borderColor: 'var(--canvas-border)' }}
        />
      </label>

      <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--canvas-border)' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
          Geo location (optional)
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting || geoLoading}
            onClick={() => void captureGeo()}
            className="text-xs px-3 py-1.5 rounded-md border font-medium"
            style={{ borderColor: 'var(--canvas-border)' }}
          >
            {geoLoading ? 'Getting location…' : 'Use my current location'}
          </button>
          {latitude != null && longitude != null && (
            <button
              type="button"
              disabled={submitting}
              onClick={clearGeo}
              className="text-xs px-3 py-1.5 rounded-md"
              style={{ color: 'var(--canvas-muted)' }}
            >
              Clear location
            </button>
          )}
        </div>
        {latitude != null && longitude != null && (
          <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
        )}
      </div>

      <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--canvas-border)' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
          Photos (optional, up to {MAX_PHOTOS})
        </span>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={submitting || photos.length >= MAX_PHOTOS}
          onChange={handlePhotoChange}
          className="block w-full text-xs"
        />
        {photos.length > 0 && (
          <ul className="space-y-1">
            {photos.map((file, i) => (
              <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate" style={{ color: 'var(--canvas-text)' }}>
                  {file.name}
                </span>
                <button
                  type="button"
                  className="shrink-0"
                  style={{ color: 'var(--alert-danger-text)' }}
                  onClick={() => removePhoto(i)}
                  disabled={submitting}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--alert-danger-text)' }}>
          {error}
        </p>
      )}

      <div
        className="flex flex-col sm:flex-row gap-2 pt-2 border-t sticky bottom-0 -mx-4 px-4 pb-1 -mb-1"
        style={{
          borderColor: 'var(--canvas-border)',
          background: 'var(--canvas-surface)',
        }}
      >
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60 order-1 sm:order-2"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-text)',
          }}
        >
          {submitting ? 'Creating…' : 'Create ticket'}
        </button>
        <button
          type="button"
          disabled={submitting}
          className="text-sm font-medium px-4 py-2.5 rounded-lg border order-2 sm:order-1 sm:flex-none"
          style={{
            borderColor: 'var(--canvas-border)',
            color: 'var(--canvas-text-dim)',
            background: 'var(--canvas-surface-alt)',
          }}
          onClick={() => {
            resetForm()
            setOpen(false)
            setError(null)
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
