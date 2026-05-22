import { Badge } from '@/components/ui/Badge'
import type { StaffStatus } from '@/types/workers'

const LABELS: Record<StaffStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  inactive: 'Inactive',
}

const VARIANTS: Record<StaffStatus, 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  active: 'success',
  inactive: 'neutral',
}

export function StaffStatusBadge({
  status,
  size = 'xs',
  dot,
}: {
  status: StaffStatus
  size?: 'xs' | 'sm'
  dot?: boolean
}) {
  return (
    <Badge variant={VARIANTS[status]} size={size} dot={dot ?? status === 'active'}>
      {LABELS[status]}
    </Badge>
  )
}
