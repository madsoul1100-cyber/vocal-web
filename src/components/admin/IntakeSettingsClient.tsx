import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiPost } from '@/api/client'
import type { IntakeVersion, SaveIntakeSettingsResponse } from '@/types/intakeSettings'

interface Props {
  currentVersion: IntakeVersion
  onSaved?: (version: IntakeVersion) => void
}

const OPTIONS: Array<{
  value: IntakeVersion
  title: string
  subtitle: string
  bullets: string[]
}> = [
  {
    value: 'v1',
    title: 'V1 — Guided State Machine',
    subtitle: 'Original rigid flow. Predictable, no LLM dependency.',
    bullets: [
      'Step-by-step: issue → media → location → confirm → file',
      'No AI required to handle the conversation',
      'Same UX every time — easier for ground teams to train citizens on',
      'Works even when OpenRouter is unreachable',
    ],
  },
  {
    value: 'v2',
    title: 'V2 — LLM Conversation Manager',
    subtitle: 'Natural-language intake. Use after pilot validates quality.',
    bullets: [
      'Responds in the citizen’s own language (Telugu, Hindi, English, mixed — auto-detected)',
      'Asks intelligent follow-ups, not a fixed checklist',
      'Civic-scope filter — empathetic decline of clearly personal matters',
      'Multimodal-ready (voice + image when W2-D2 ships)',
      'Falls back gracefully if OpenRouter is down',
    ],
  },
]

export function IntakeSettingsClient({ currentVersion, onSaved }: Props) {
  const { getAccessToken } = useAuth()
  const [selected, setSelected] = useState<IntakeVersion>(currentVersion)
  const [saved, setSaved] = useState<IntakeVersion>(currentVersion)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const dirty = selected !== saved

  async function save() {
    setError(null)
    setBusy(true)
    const target = selected
    try {
      const body = await apiPost<SaveIntakeSettingsResponse>(
        '/admin/intake-settings',
        { version: target },
        getAccessToken,
      )
      const serverVersion: IntakeVersion = body.version === 'v2' ? 'v2' : 'v1'
      setSaved(serverVersion)
      setSelected(serverVersion)
      onSaved?.(serverVersion)
      setFlash(`Switched to ${serverVersion.toUpperCase()}.`)
      setTimeout(() => setFlash(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="card p-4 text-sm"
        style={{
          background: 'var(--alert-info-bg)',
          border: '1px solid var(--alert-info-border)',
          color: 'var(--alert-info-text)',
        }}
      >
        <strong>Currently live:</strong>{' '}
        <span className="font-mono font-semibold">{saved.toUpperCase()}</span> —{' '}
        {OPTIONS.find((o) => o.value === saved)?.title}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value
          const isLive = saved === opt.value
          return (
            <label
              key={opt.value}
              className="cursor-pointer card p-4 transition-all"
              style={{
                borderColor: isSelected ? 'var(--primary)' : 'var(--canvas-border)',
                borderWidth: isSelected ? 2 : 1,
                background: isSelected ? 'var(--primary-soft-bg)' : 'var(--canvas-surface)',
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="intake_version"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => setSelected(opt.value)}
                  disabled={busy}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--canvas-text)' }}>
                      {opt.title}
                    </h3>
                    {isLive && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(16,185,129,0.15)',
                          color: 'var(--green-600)',
                          border: '1px solid rgba(16,185,129,0.35)',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'var(--green-600)' }}
                        />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--canvas-text-dim)' }}>
                    {opt.subtitle}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs" style={{ color: 'var(--canvas-text-dim)' }}>
                    {opt.bullets.map((b) => (
                      <li key={b} className="flex gap-1.5">
                        <span style={{ color: 'var(--canvas-muted)' }}>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </label>
          )
        })}
      </div>

      {error && (
        <div
          className="text-xs px-3 py-2 rounded-md"
          style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
        >
          {error}
        </div>
      )}
      {flash && !error && (
        <div
          className="text-xs px-3 py-2 rounded-md"
          style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--green-600)' }}
        >
          ✓ {flash}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !dirty}
          className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
        >
          {busy ? 'Saving…' : dirty ? `Switch to ${selected.toUpperCase()}` : 'No changes'}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setSelected(saved)}
            disabled={busy}
            className="text-xs underline-offset-2 hover:underline"
            style={{ color: 'var(--canvas-muted)' }}
          >
            Discard
          </button>
        )}
      </div>

      <div
        className="text-[11px] mt-6 p-3 rounded-md"
        style={{ background: 'var(--shell-surface-hi)', color: 'var(--shell-text-dim)' }}
      >
        <strong>How it takes effect:</strong> the Telegram webhook reads this setting on every inbound
        message. Switching engines is instant — no redeploy needed. Active conversations in flight will
        continue under the engine they started on.
      </div>
    </div>
  )
}
