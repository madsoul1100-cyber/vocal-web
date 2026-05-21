import { FormEvent, useState, type CSSProperties } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError } from '@/api/client'
import { tenantApp } from '@/config/tenant.config'

const inputStyle: CSSProperties = {
  borderColor: 'var(--canvas-border)',
  background: 'var(--canvas-surface)',
  color: 'var(--canvas-text)',
}

export function SignInPage() {
  const { isAuthenticated, login, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Sign in failed. Check your email and password.')
      }
    } finally {
      setSubmitting(false)
    }
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

        <form
          onSubmit={handleSubmit}
          className="w-full card p-5 flex flex-col gap-4"
          style={{ background: 'var(--canvas-surface)' }}
        >
          {error && (
            <div
              className="text-xs px-3 py-2 rounded-md"
              style={{
                background: 'var(--alert-error-bg)',
                color: 'var(--alert-error-text)',
                borderLeft: '3px solid var(--alert-error-border)',
              }}
            >
              {error}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
              style={inputStyle}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-sm font-medium px-3 py-2.5 rounded-md text-white disabled:opacity-60"
            style={{ background: 'var(--primary)' }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-center" style={{ color: 'var(--canvas-muted)' }}>
          Staff accounts are created by your organization admin.
        </p>
        <Link to="/" className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
