import { Navigate, Outlet } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'

export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useClerkAuth()

  if (!isLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--shell-bg)', color: 'var(--shell-text)' }}
      >
        Loading…
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  return <Outlet />
}
