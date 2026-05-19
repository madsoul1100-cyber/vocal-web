import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/ui/PageHeader'
import { IntakeLabClient } from '@/components/admin/IntakeLabClient'

const ALLOWED_ROLES = ['super_admin', 'central_support']

export function IntakeLabPage() {
  const navigate = useNavigate()
  const { data: user, isLoading: userLoading } = useCurrentUser()

  useEffect(() => {
    if (!userLoading && user?.role && !ALLOWED_ROLES.includes(user.role)) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userLoading, navigate])

  if (userLoading) {
    return (
      <div>
        <PageHeader title="Intake Lab" subtitle="Loading…" />
      </div>
    )
  }

  if (!user?.role || !ALLOWED_ROLES.includes(user.role)) {
    return null
  }

  return (
    <div>
      <PageHeader
        title="Intake Lab"
        subtitle="Test the LLM intake conversation manager. Pure sandbox — no DB writes."
      />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <IntakeLabClient />
      </div>
    </div>
  )
}
