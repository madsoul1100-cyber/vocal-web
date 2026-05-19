import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiPost } from '@/api/client'
import type {
  AmplifyOutput,
  AmplifySource,
  AmplifyTone,
  GenerateAmplifyResponse,
  PlatformMeta,
} from '@/types/amplify'

const TONES: { value: AmplifyTone; label: string; group: 'neutral' | 'campaign' }[] = [
  { value: 'informative', label: 'Informative', group: 'neutral' },
  { value: 'urgent', label: 'Urgent', group: 'neutral' },
  { value: 'formal', label: 'Formal', group: 'neutral' },
  { value: 'empathetic', label: 'Empathetic', group: 'neutral' },
  { value: 'neutral', label: 'Neutral', group: 'neutral' },
  { value: 'activist', label: 'Activist — campaign push', group: 'campaign' },
  { value: 'opposition', label: 'Opposition — accountability', group: 'campaign' },
  { value: 'public_shame', label: 'Public shame — viral hook', group: 'campaign' },
]

interface Props {
  sessionId: string
  ticket: {
    id: string
    ticket_number: string
    title: string | null
    location_text: string | null
  } | null
  initialSources: AmplifySource[]
  initialOutputs: AmplifyOutput[]
  platforms: PlatformMeta[]
}

export function AmplifyEditor({
  sessionId,
  ticket,
  initialSources,
  initialOutputs,
  platforms,
}: Props) {
  const { getAccessToken } = useAuth()
  const [activePlatform, setActivePlatform] = useState(platforms[0]?.key ?? 'tweet')
  const [tone, setTone] = useState<AmplifyTone>('informative')
  const [sources, setSources] = useState(initialSources)
  const [drafts, setDrafts] = useState<Record<string, AmplifyOutput>>(
    Object.fromEntries(
      initialOutputs.map((o) => [o.output_format, o]),
    ) as Record<string, AmplifyOutput>,
  )
  const [editing, setEditing] = useState<Record<string, string>>(
    Object.fromEntries(initialOutputs.map((o) => [o.output_format, o.content])),
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate(platform: string) {
    setError(null)
    setBusy(platform)
    try {
      const includedIds = sources.filter((s) => s.included).map((s) => s.id)
      const body = await apiPost<GenerateAmplifyResponse>(
        `/amplify/sessions/${sessionId}/generate`,
        { platform, tone, source_ids: includedIds },
        getAccessToken,
      )
      const output = body.output
      setDrafts((d) => ({ ...d, [platform]: output }))
      setEditing((e) => ({ ...e, [platform]: output.content }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  async function copy(platform: string) {
    const text = editing[platform] ?? ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(platform)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setError('Could not access clipboard')
    }
  }

  function toggleSource(id: string) {
    setSources((s) => s.map((x) => (x.id === id ? { ...x, included: !x.included } : x)))
  }

  const active = platforms.find((p) => p.key === activePlatform)!
  const currentDraft = drafts[activePlatform]
  const currentBody = editing[activePlatform] ?? ''

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-5">
        <section className="card p-4">
          <h3
            className="text-[11px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--canvas-muted)' }}
          >
            Ticket
          </h3>
          <div className="text-sm font-medium truncate" style={{ color: 'var(--canvas-text)' }}>
            {ticket?.title ?? ticket?.ticket_number ?? '—'}
          </div>
          <code className="text-[11px]" style={{ color: 'var(--canvas-muted)' }}>
            {ticket?.ticket_number}
          </code>
          {ticket?.location_text && (
            <p className="text-xs mt-1" style={{ color: 'var(--canvas-text-dim)' }}>
              📍 {ticket.location_text}
            </p>
          )}
        </section>

        <section className="card p-4">
          <h3
            className="text-[11px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--canvas-muted)' }}
          >
            Sources to include
          </h3>
          {sources.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
              No sources attached. Drafts will be written from ticket metadata only.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {sources.map((s) => (
                <li key={s.id}>
                  <label
                    className="flex items-start gap-2 text-xs cursor-pointer"
                    style={{ color: 'var(--canvas-text)' }}
                  >
                    <input
                      type="checkbox"
                      checked={s.included}
                      onChange={() => toggleSource(s.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">{s.source_type.replace(/_/g, ' ')}</span>
                      {s.source_content && (
                        <span
                          className="block text-[11px] truncate"
                          style={{ color: 'var(--canvas-muted)' }}
                        >
                          {s.source_content.slice(0, 80)}
                          {s.source_content.length > 80 ? '…' : ''}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h3
            className="text-[11px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--canvas-muted)' }}
          >
            Tone
          </h3>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as AmplifyTone)}
            className="w-full py-1.5 px-2 rounded text-xs border"
            style={{
              borderColor: 'var(--canvas-border)',
              background: 'white',
              color: 'var(--canvas-text)',
            }}
          >
            <optgroup label="Neutral / factual">
              {TONES.filter((t) => t.group === 'neutral').map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Campaign / escalation">
              {TONES.filter((t) => t.group === 'campaign').map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </select>
          {(tone === 'activist' || tone === 'opposition' || tone === 'public_shame') && (
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--canvas-text-dim)' }}>
              Campaign voice — sharper, visibility-seeking language with [@Handle] placeholders.
              Review before posting; only facts in the source are used.
            </p>
          )}
        </section>
      </aside>

      <section className="card overflow-hidden">
        <nav
          className="flex overflow-x-auto"
          style={{ borderBottom: '1px solid var(--canvas-border)', background: 'var(--canvas-surface)' }}
        >
          {platforms.map((p) => {
            const hasDraft = !!drafts[p.key]
            const isActive = activePlatform === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setActivePlatform(p.key)}
                className="px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  color: isActive ? 'var(--primary)' : 'var(--canvas-text-dim)',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {p.label}
                {hasDraft && <span style={{ color: 'var(--green-600)' }}> ·</span>}
              </button>
            )
          })}
        </nav>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
              {active.short_hint}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => generate(active.key)}
                disabled={busy === active.key}
                className="py-1.5 px-3 rounded-md text-xs font-medium disabled:opacity-60"
                style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
              >
                {busy === active.key ? 'Generating…' : currentDraft ? 'Regenerate' : 'Generate'}
              </button>
              <button
                type="button"
                onClick={() => copy(active.key)}
                disabled={!currentBody}
                className="py-1.5 px-3 rounded-md text-xs font-medium disabled:opacity-50"
                style={{
                  background: 'var(--slate-100)',
                  color: 'var(--canvas-text)',
                  border: '1px solid var(--canvas-border)',
                }}
              >
                {copied === active.key ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="text-xs p-2 rounded-md"
              style={{ background: 'var(--alert-danger-bg)', color: 'var(--alert-danger-text)' }}
            >
              {error}
            </div>
          )}

          {currentDraft?.metadata_json?.fallback === true && (
            <div
              className="text-[11px] px-2 py-1 rounded"
              style={{ background: 'var(--alert-warning-bg)', color: 'var(--alert-warning-text)' }}
            >
              AI was unavailable — showing a template draft. Regenerate once AI is reachable.
              {currentDraft.metadata_json?.error != null && (
                <div className="mt-1 font-mono opacity-80 break-all">
                  {String(currentDraft.metadata_json.error)}
                </div>
              )}
            </div>
          )}

          <textarea
            value={currentBody}
            onChange={(e) => setEditing((s) => ({ ...s, [active.key]: e.target.value }))}
            rows={16}
            placeholder={
              busy === active.key
                ? 'Generating…'
                : `No draft yet. Click Generate to draft a ${active.label.toLowerCase()} from the selected sources.`
            }
            className="w-full px-3 py-2 rounded text-sm resize-y border font-mono leading-relaxed"
            style={{
              borderColor: 'var(--canvas-border)',
              color: 'var(--canvas-text)',
              background: 'white',
              minHeight: '300px',
            }}
          />

          <p className="text-[11px]" style={{ color: 'var(--canvas-muted)' }}>
            {active.char_hint && `Target: ≤ ${active.char_hint} chars · `}
            {currentBody ? `${currentBody.length} chars written.` : ''}
            {currentDraft &&
              ` Last generated ${new Date(currentDraft.generated_at).toLocaleString('en-IN')}.`}
          </p>
        </div>
      </section>
    </div>
  )
}
