import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/api/client'
import { ModalPortal } from '@/components/ui/ModalPortal'
import { StaffStatusBadge } from '@/components/workers/StaffStatusBadge'
import {
  useStaffMediaUrl,
  workerKycMediaPath,
  workerProfileMediaPath,
} from '@/hooks/useStaffMediaUrl'
import type { PendingActivationRow, StaffKycDocument, WorkerDetail, WorkerRow } from '@/types/workers'

interface Props {
  worker: WorkerRow
  open: boolean
  onClose: () => void
  onEdit: (worker: WorkerRow) => void
}

function WorkerProfilePhoto({
  workerId,
  signedUrl,
  hasFile,
}: {
  workerId: string
  signedUrl: string | null | undefined
  hasFile: boolean
}) {
  const { getAccessToken } = useAuth()
  const proxySrc = useStaffMediaUrl(
    hasFile && !signedUrl ? workerProfileMediaPath(workerId) : null,
    getAccessToken,
    hasFile && !signedUrl,
  )
  const src = signedUrl ?? proxySrc
  if (!hasFile || !src) {
    return <span style={{ color: 'var(--canvas-muted)' }}>None</span>
  }
  return (
    <img
      src={src}
      alt="Profile"
      className="h-28 w-28 rounded-lg object-cover border"
      style={{ borderColor: 'var(--canvas-border)' }}
    />
  )
}

function KycDocumentItem({
  workerId,
  doc,
  index,
}: {
  workerId: string
  doc: StaffKycDocument
  index: number
}) {
  const { getAccessToken } = useAuth()
  const isImage = doc.mime_type?.startsWith('image/') ?? false
  const proxyPath = workerKycMediaPath(workerId, index)
  const proxySrc = useStaffMediaUrl(
    !doc.download_url ? proxyPath : null,
    getAccessToken,
    !doc.download_url,
  )
  const href = doc.download_url ?? proxySrc

  return (
    <li
      className="rounded-lg border p-2 space-y-2"
      style={{ borderColor: 'var(--canvas-border)', background: 'var(--canvas-surface-alt)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium truncate" style={{ color: 'var(--canvas-text)' }}>
          {doc.file_name}
        </span>
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--canvas-muted)' }}>
          {doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} KB` : ''}
        </span>
      </div>
      {isImage && href && (
        <a href={href} target="_blank" rel="noopener noreferrer">
          <img
            src={href}
            alt={doc.file_name}
            className="max-h-40 rounded object-contain border w-full"
            style={{ borderColor: 'var(--canvas-border)' }}
          />
        </a>
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium"
          style={{ color: 'var(--primary)' }}
        >
          {isImage ? 'Open full size' : 'View / download'}
        </a>
      )}
      {!href && (
        <span className="text-[10px]" style={{ color: 'var(--canvas-muted)' }}>
          Preview unavailable
        </span>
      )}
    </li>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,120px)_1fr] gap-x-3 gap-y-1 py-2 border-b border-[var(--canvas-border)] last:border-0">
      <dt className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--canvas-muted)' }}>
        {label}
      </dt>
      <dd className="text-sm break-words" style={{ color: 'var(--canvas-text)' }}>
        {value ?? '—'}
      </dd>
    </div>
  )
}

export function WorkerDetailDialog({ worker, open, onClose, onEdit }: Props) {
  const { getAccessToken } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['worker', worker.id],
    queryFn: () =>
      apiFetch<{ worker: WorkerDetail }>(`/workers/${worker.id}`, { getToken: getAccessToken }),
    enabled: open,
  })

  const detail = data?.worker
  const display = detail
    ? {
        ...detail,
        email: detail.email ?? worker.email,
        phone: detail.phone ?? worker.phone,
        full_name: detail.full_name || worker.full_name,
        staff_status: detail.staff_status ?? worker.staff_status,
      }
    : null

  const roleLabel =
    display?.roles?.display_name ?? display?.roles?.name?.replace(/_/g, ' ') ?? '—'
  const primaryTerritory =
    display?.territories?.find((t) => t.is_primary)?.name ??
    display?.territories?.[0]?.name ??
    null

  return (
    <ModalPortal open={open} onClose={onClose} titleId="worker-detail-title">
      <div className="p-5 max-h-[min(85vh,720px)] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4 sticky top-0 bg-[var(--canvas-surface)] pb-2 z-10">
          <div>
            <h2 id="worker-detail-title" className="text-base font-semibold" style={{ color: 'var(--canvas-text)' }}>
              {display?.full_name ?? worker.full_name}
            </h2>
            {display && (
              <div className="mt-1.5">
                <StaffStatusBadge status={display.staff_status} size="sm" />
              </div>
            )}
          </div>
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

        {isLoading && (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--canvas-muted)' }}>
            Loading details…
          </p>
        )}

        {error && !isLoading && (
          <p className="text-sm py-4" style={{ color: 'var(--alert-danger-text)' }}>
            {error instanceof Error ? error.message : 'Failed to load worker'}
          </p>
        )}

        {display && !isLoading && (
          <dl>
            <DetailRow
              label="Profile photo"
              value={
                <WorkerProfilePhoto
                  workerId={display.id}
                  signedUrl={display.profile_image_url}
                  hasFile={!!display.image_url}
                />
              }
            />
            <DetailRow label="Role" value={<span className="capitalize">{roleLabel}</span>} />
            <DetailRow label="Email" value={display.email} />
            <DetailRow label="Phone" value={display.phone} />
            <DetailRow label="Territory" value={primaryTerritory} />
            <DetailRow
              label="Last sign-in"
              value={
                display.last_login_at
                  ? formatDistanceToNow(new Date(display.last_login_at), { addSuffix: true })
                  : 'Never'
              }
            />
            <DetailRow
              label="Created"
              value={format(new Date(display.created_at), 'MMM d, yyyy · h:mm a')}
            />
            {display.approved_at && (
              <DetailRow
                label="Approved"
                value={format(new Date(display.approved_at), 'MMM d, yyyy · h:mm a')}
              />
            )}
            <DetailRow
              label="Notes"
              value={
                display.notes ? (
                  <span className="whitespace-pre-wrap text-xs" style={{ color: 'var(--canvas-text-dim)' }}>
                    {display.notes}
                  </span>
                ) : null
              }
            />
            <DetailRow
              label="KYC documents"
              value={
                display.kyc_documents.length > 0 ? (
                  <ul className="space-y-2 w-full">
                    {display.kyc_documents.map((doc, index) => (
                      <KycDocumentItem
                        key={doc.storage_path}
                        workerId={display.id}
                        doc={doc}
                        index={index}
                      />
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: 'var(--canvas-muted)' }}>None</span>
                )
              }
            />
          </dl>
        )}

        <div
          className="flex items-center justify-end gap-2 pt-4 mt-2 border-t sticky bottom-0 bg-[var(--canvas-surface)]"
          style={{ borderColor: 'var(--canvas-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium px-3 py-1.5 rounded-md"
            style={{ color: 'var(--canvas-text-dim)' }}
          >
            Close
          </button>
          {display && (
            <button
              type="button"
              onClick={() => {
                onEdit({ ...worker, ...display })
                onClose()
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-md"
              style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
            >
              Edit worker
            </button>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

interface PendingProps {
  request: PendingActivationRow
  open: boolean
  onClose: () => void
}

export function PendingRequestDetailDialog({ request, open, onClose }: PendingProps) {
  const roleLabel =
    request.roles?.display_name ?? request.roles?.name?.replace(/_/g, ' ') ?? '—'

  return (
    <ModalPortal open={open} onClose={onClose} titleId="pending-detail-title">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="pending-detail-title" className="text-base font-semibold" style={{ color: 'var(--canvas-text)' }}>
              {request.full_name}
            </h2>
            <div className="mt-1.5">
              <StaffStatusBadge status="pending" size="sm" />
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-xs px-2 py-1" style={{ color: 'var(--canvas-muted)' }}>
            ✕
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--canvas-muted)' }}>
          Activation request awaiting Super Admin or Central Support approval.
        </p>

        <dl>
          <DetailRow label="Role" value={<span className="capitalize">{roleLabel}</span>} />
          <DetailRow label="Email" value={request.email} />
          <DetailRow label="Phone" value={request.phone} />
          <DetailRow label="Territory" value={request.territories?.name} />
          <DetailRow
            label="Requested by"
            value={request.requested_by_user?.full_name}
          />
          <DetailRow
            label="Submitted"
            value={formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          />
        </dl>

        <div className="flex justify-end pt-4 mt-2 border-t" style={{ borderColor: 'var(--canvas-border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium px-3 py-1.5 rounded-md"
            style={{ color: 'var(--canvas-text-dim)' }}
          >
            Close
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
