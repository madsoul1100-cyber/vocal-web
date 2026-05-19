import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { AppShell } from './AppShell'
import type { RoleName } from '@/types/database'

export function DashboardLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { data: user, isLoading, error } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--shell-bg)' }}>
        <p style={{ color: 'var(--shell-text)' }}>Loading…</p>
      </div>
    )
  }

  if (error || !user || !user.role) {
    return <PendingView logout={logout} navigate={navigate} />
  }

  const role = user.role as RoleName

  return (
    <AppShell
      userRole={role}
      orgName={user.organization_name ?? 'Organization'}
      userName={user.full_name}
      onSignOut={() => {
        logout()
        navigate('/sign-in')
      }}
    >
      <Outlet context={{ user }} />
    </AppShell>
  )
}

function PendingView({ logout, navigate }: { logout: () => void; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas-bg)' }}>
      <div className="text-center px-6 py-10 rounded-lg max-w-sm card">
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--canvas-text)' }}>
          Account Pending Activation
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--canvas-muted)' }}>
          You signed in with Clerk, but there is no matching active row in the staff database
          (check <code className="text-[11px]">users.clerk_user_id</code>). Ask an admin to add you
          via Workers, or link your Clerk user id to your profile.
        </p>
        <button
          type="button"
          className="text-sm underline"
          style={{ color: 'var(--primary)' }}
          onClick={() => { logout(); navigate('/sign-in') }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
