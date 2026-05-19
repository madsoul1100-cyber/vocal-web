import { SignIn, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { tenantApp } from '@/config/tenant.config'

export function SignInPage() {
  const { isSignedIn } = useClerkAuth()
  const location = useLocation()
  const onFactorStep = location.pathname.includes('/factor')

  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--canvas-bg)' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-lg"
            style={{
              background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {tenantApp.shortName}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--canvas-text)' }}>
              Sign in to {tenantApp.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--canvas-muted)' }}>
              Civic issue management platform
            </p>
          </div>
        </div>

        {onFactorStep && (
          <div
            className="w-full text-xs px-3 py-2 rounded-md"
            style={{
              background: 'var(--alert-warning-bg)',
              color: 'var(--alert-warning-text)',
              borderLeft: '3px solid var(--alert-warning-border)',
            }}
          >
            <strong>Second step required.</strong> Check your email for a 6-digit code, or complete
            MFA if prompted. Accounts created by an admin should sign in with email + password only
            — ask support to run &quot;repair Clerk&quot; if you stay stuck here.
          </div>
        )}

        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
        />

        <p className="text-xs text-center" style={{ color: 'var(--canvas-muted)' }}>
          New organization?{' '}
          <Link to="/sign-up" className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
            Create an account
          </Link>
        </p>
        <Link to="/" className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
