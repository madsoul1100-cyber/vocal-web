import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { tenantApp } from '@/config/tenant.config'

export function SignUpPage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--canvas-bg)' }}
    >
      <div className="w-full max-w-sm card p-6 text-center flex flex-col gap-4">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--canvas-text)' }}>
          Join {tenantApp.name}
        </h1>
        <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>
          New staff accounts are created by your organization administrator. If you already have
          credentials, sign in below.
        </p>
        <Link
          to="/sign-in"
          className="text-sm font-medium px-4 py-2.5 rounded-md text-white inline-block"
          style={{ background: 'var(--primary)' }}
        >
          Go to sign in
        </Link>
        <Link to="/" className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
