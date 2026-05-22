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

type Mode = 'otp' | 'password' | 'forgot'
type OtpStep = 'identify' | 'verify' | 'set_password'

export function SignInPage() {
  const { isAuthenticated, login, requestOtp, verifyOtp, completePasswordSetup, isLoading } =
    useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('otp')
  const [otpStep, setOtpStep] = useState<OtpStep>('identify')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [setupToken, setSetupToken] = useState<string | null>(null)
  const [otpHint, setOtpHint] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [deliveryMode, setDeliveryMode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const resetOtpFlow = () => {
    setOtpStep('identify')
    setOtp('')
    setSetupToken(null)
    setOtpHint(null)
    setDevCode(null)
    setDeliveryMode(null)
    setNewPassword('')
    setConfirmPassword('')
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    resetOtpFlow()
    if (next !== 'password') setPassword('')
  }

  async function handleOtpRequest(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const purpose = mode === 'forgot' ? 'forgot_password' : 'login'
      const res = await requestOtp(email, phone, purpose)
      setOtpHint(
        `Code sent via ${res.sent_to} (${res.provider ?? 'otp'}) to ${res.masked_destination}`,
      )
      setDeliveryMode(res.delivery_mode ?? null)
      setDevCode(res.dev_code ?? null)
      setOtpStep('verify')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send code')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOtpVerify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const purpose = mode === 'forgot' ? 'forgot_password' : 'login'
      const res = await verifyOtp(email, phone, otp, purpose)
      if (res.needs_password && res.setup_token) {
        setSetupToken(res.setup_token)
        setOtpStep('set_password')
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!setupToken) {
      setError('Session expired. Start again.')
      return
    }
    setSubmitting(true)
    try {
      await completePasswordSetup(setupToken, newPassword)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not set password')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasswordLogin(e: FormEvent) {
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

  const title =
    mode === 'forgot'
      ? 'Reset password'
      : mode === 'password'
        ? 'Sign in with password'
        : 'Sign in with OTP'

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
              {title}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--canvas-muted)' }}>
              {mode === 'otp' && otpStep === 'identify'
                ? 'Use the email and phone on your staff profile'
                : mode === 'otp' && otpStep === 'verify'
                  ? 'Enter the 6-digit code we sent you'
                  : mode === 'otp' || mode === 'forgot'
                    ? 'Create a password to finish'
                    : 'Email and password'}
            </p>
          </div>
        </div>

        <div className="flex gap-1 w-full text-[11px]">
          {(['otp', 'password'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className="flex-1 py-1.5 rounded-md font-medium"
              style={{
                background: mode === m ? 'var(--primary)' : 'var(--canvas-surface-alt)',
                color: mode === m ? 'var(--primary-text)' : 'var(--canvas-muted)',
              }}
            >
              {m === 'otp' ? 'OTP' : 'Password'}
            </button>
          ))}
        </div>

        <form
          onSubmit={
            mode === 'password'
              ? handlePasswordLogin
              : otpStep === 'identify'
                ? handleOtpRequest
                : otpStep === 'verify'
                  ? handleOtpVerify
                  : handleSetPassword
          }
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

          {otpHint && otpStep !== 'identify' && (
            <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
              {otpHint}
              {deliveryMode === 'console' && (
                <span className="block mt-1" style={{ color: 'var(--amber-700)' }}>
                  Test mode (console) — check API logs if no code below
                </span>
              )}
              {devCode && (
                <span className="block mt-1 font-mono" style={{ color: 'var(--amber-700)' }}>
                  Code: {devCode}
                </span>
              )}
            </p>
          )}

          {(mode === 'otp' || mode === 'forgot') && otpStep !== 'set_password' && (
            <>
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
                  Mobile number
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="+91 …"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpStep === 'verify'}
                  className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2 disabled:opacity-70"
                  style={inputStyle}
                />
              </label>
            </>
          )}

          {(mode === 'otp' || mode === 'forgot') && otpStep === 'verify' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
                Verification code
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2 tracking-widest text-center font-mono"
                style={inputStyle}
              />
            </label>
          )}

          {(mode === 'otp' || mode === 'forgot') && otpStep === 'set_password' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
                  New password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>
                  Confirm password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-md border outline-none focus:ring-2"
                  style={inputStyle}
                />
              </label>
            </>
          )}

          {mode === 'password' && (
            <>
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
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-sm font-medium px-3 py-2.5 rounded-md text-white disabled:opacity-60"
            style={{ background: 'var(--primary)' }}
          >
            {submitting
              ? 'Please wait…'
              : mode === 'password'
                ? 'Sign in'
                : otpStep === 'identify'
                  ? 'Send code'
                  : otpStep === 'verify'
                    ? 'Verify code'
                    : 'Save password & sign in'}
          </button>

          {mode === 'password' && (
            <button
              type="button"
              className="text-xs text-center"
              style={{ color: 'var(--primary)' }}
              onClick={() => switchMode('forgot')}
            >
              Forgot password?
            </button>
          )}

          {(mode === 'otp' || mode === 'forgot') && otpStep !== 'identify' && (
            <button
              type="button"
              className="text-xs text-center"
              style={{ color: 'var(--canvas-muted)' }}
              onClick={resetOtpFlow}
            >
              ← Start over
            </button>
          )}
        </form>

        <p className="text-xs text-center" style={{ color: 'var(--canvas-muted)' }}>
          Staff accounts are created by your organization admin. No password needed until first
          sign-in.
        </p>
        <Link to="/" className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
