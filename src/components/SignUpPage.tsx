import { SignUp, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { Link, Navigate } from 'react-router-dom'
import { tenantApp } from '@/config/tenant.config'

export function SignUpPage() {
  const { isSignedIn } = useClerkAuth()

  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--canvas-bg)' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <SignUpBrand />
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
        <p className="text-xs text-center" style={{ color: 'var(--canvas-muted)' }}>
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function SignUpBrand() {
  return (
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
          Create your {tenantApp.name} account
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--canvas-muted)' }}>
          Start managing civic issues in minutes
        </p>
      </div>
    </div>
  )
}
