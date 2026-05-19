import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { IntakeSettingsClient } from '@/components/admin/IntakeSettingsClient'
import type { IntakeSettingsResponse, IntakeVersion } from '@/types/intakeSettings'

const ALLOWED_ROLE = 'super_admin'

export function IntakeSettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { getAccessToken } = useAuth()
  const { data: user, isLoading: userLoading } = useCurrentUser()

  useEffect(() => {
    if (!userLoading && user?.role && user.role !== ALLOWED_ROLE) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userLoading, navigate])

  const { data, isLoading, error } = useQuery({
    queryKey: ['intake-settings'],
    queryFn: () =>
      apiFetch<IntakeSettingsResponse>('/admin/intake-settings', { getToken: getAccessToken }),
    enabled: user?.role === ALLOWED_ROLE,
  })

  if (userLoading || (user?.role === ALLOWED_ROLE && isLoading)) {
    return (
      <div>
        <PageHeader title="Intake Settings" subtitle="Loading…" />
      </div>
    )
  }

  if (!user?.role || user.role !== ALLOWED_ROLE) {
    return null
  }

  const version: IntakeVersion = data?.version === 'v2' ? 'v2' : 'v1'

  return (
    <div>
      <PageHeader
        title="Intake Settings"
        subtitle="Choose which engine powers the citizen Telegram conversation."
      />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg mb-4"
            style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
          >
            {error instanceof Error ? error.message : 'Failed to load settings'}
          </div>
        )}
        <IntakeSettingsClient
          key={version}
          currentVersion={version}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['intake-settings'] })
          }}
        />
      </div>
    </div>
  )
}
