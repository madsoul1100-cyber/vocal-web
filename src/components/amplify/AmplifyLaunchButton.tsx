import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiPost } from '@/api/client'
import type { CreateAmplifySessionResponse } from '@/types/amplify'

export function AmplifyLaunchButton({ ticketId }: { ticketId: string }) {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const launch = async () => {
    setError(null)
    setPending(true)
    try {
      const body = await apiPost<CreateAmplifySessionResponse>(
        '/amplify/sessions',
        { ticket_id: ticketId },
        getAccessToken,
      )
      navigate(`/amplify/${body.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="pt-2" style={{ borderTop: '1px solid var(--canvas-border)' }}>
      <button
        type="button"
        disabled={pending}
        onClick={launch}
        className="block w-full text-center py-2 rounded-md text-xs font-medium disabled:opacity-60"
        style={{ background: 'var(--shell-surface)', color: 'var(--shell-text-dim)' }}
      >
        {pending ? 'Launching…' : '⚡ Launch Amplify session'}
      </button>
      {error && (
        <div
          className="text-[11px] mt-1.5 px-2 py-1 rounded"
          style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
