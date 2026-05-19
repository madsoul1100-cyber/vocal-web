import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { WorkerQueue } from '@/components/workers/WorkerQueue'
import { TelegramLinkBanner } from '@/components/workers/TelegramLinkBanner'
import type { WorkerAssignmentsPayload } from '@/types/worker'

export function MyAssignmentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { getAccessToken } = useAuth()
  const { data: user, isLoading: userLoading } = useCurrentUser()

  useEffect(() => {
    if (!userLoading && user?.role && user.role !== 'ground_worker') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userLoading, navigate])

  const { data, isLoading, error } = useQuery({
    queryKey: ['worker', 'assignments'],
    queryFn: () =>
      apiFetch<WorkerAssignmentsPayload>('/worker/assignments', { getToken: getAccessToken }),
    enabled: !!user && user.role === 'ground_worker',
    refetchInterval: 30_000,
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['worker', 'assignments'] })
  }

  if (userLoading || (user?.role === 'ground_worker' && isLoading)) {
    return (
      <div>
        <PageHeader title="My Assignments" subtitle="Loading…" />
      </div>
    )
  }

  if (user?.role !== 'ground_worker') {
    return null
  }

  const offered = data?.offered ?? null
  const subtitle = offered
    ? '⏳ You have a pending offer — respond before it expires'
    : 'No pending offer right now'

  return (
    <div>
      <PageHeader title="My Assignments" subtitle={subtitle} />
      <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg"
            style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
          >
            {error instanceof Error ? error.message : 'Failed to load assignments'}
          </div>
        )}
        {user && (
          <TelegramLinkBanner userId={user.id} linked={data?.telegramLinked ?? false} />
        )}
        {data && user && (
          <WorkerQueue
            workerId={user.id}
            offered={offered}
            activeTickets={data.activeTickets}
            onRefresh={refresh}
          />
        )}
      </div>
    </div>
  )
}
