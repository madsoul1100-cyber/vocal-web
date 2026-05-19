import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { JobsRunner } from '@/components/jobs/JobsRunner'
import type { JobsListResponse } from '@/types/jobs'

const ALLOWED_ROLES = ['super_admin', 'central_support']

export function JobsPage() {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const { data: user, isLoading: userLoading } = useCurrentUser()

  useEffect(() => {
    if (!userLoading && user?.role && !ALLOWED_ROLES.includes(user.role)) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userLoading, navigate])

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', 'runs'],
    queryFn: () => apiFetch<JobsListResponse>('/jobs', { getToken: getAccessToken }),
    enabled: !!user?.role && ALLOWED_ROLES.includes(user.role),
  })

  if (userLoading || (user?.role && ALLOWED_ROLES.includes(user.role) && isLoading)) {
    return (
      <div>
        <PageHeader title="Jobs" subtitle="Loading…" />
      </div>
    )
  }

  if (!user?.role || !ALLOWED_ROLES.includes(user.role)) {
    return null
  }

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Manually run scheduled jobs while Vercel cron is disabled"
      />

      <div className="p-6 sm:p-8 max-w-4xl mx-auto">
        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg mb-4"
            style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
          >
            {error instanceof Error ? error.message : 'Failed to load job history'}
          </div>
        )}
        <JobsRunner initialRuns={data?.runs ?? []} />
      </div>
    </div>
  )
}
