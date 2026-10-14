import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bharosaFetch, type Lang } from '@/api/bharosa'
import { useCitizenSession } from './session'
import { Btn, Card, Field, Notice, Stepper, errText, inputClass, inputStyle, type StatusStep } from './ui'

interface Facts {
  title: { en: string; te: string }
  summary: { en: string; te: string }
  category: string | null
  severity: string
  is_civic_issue: boolean
  out_of_scope_reason?: string | null
  missing_questions: { key: string; question_en: string; question_te: string }[]
}
interface Submission {
  id: string
  status: string
  channel?: string
  structured_json?: Facts | null
  evidence: { id: string; file_name: string }[]
}
interface Config { categories: { id: string; name: string }[]; evidence: { max_files: number } }

const CONSENTS: { type: string; required?: boolean; en: string; te: string }[] = [
  { type: 'terms', required: true, en: 'I accept the terms', te: 'నిబంధనలను అంగీకరిస్తున్నాను' },
  { type: 'privacy', required: true, en: 'I accept the privacy notice', te: 'గోప్యతా నోటీసును అంగీకరిస్తున్నాను' },
  { type: 'share_with_authority', en: 'Share my name with the office we email', te: 'ఇమెయిల్ చేసే కార్యాలయంతో నా పేరు పంచండి' },
  { type: 'whatsapp_updates', en: 'Send me updates on WhatsApp', te: 'నాకు వాట్సాప్‌లో అప్‌డేట్లు పంపండి' },
  { type: 'contact_by_phone', en: 'The team may call me', te: 'బృందం నాకు కాల్ చేయవచ్చు' },
  { type: 'public_status', en: 'Show my case (no name or phone) on the public tracker', te: 'పబ్లిక్ ట్రాకర్‌లో నా కేసు చూపించండి (పేరు, ఫోన్ లేకుండా)' },
  { type: 'location_exact', en: 'Share my exact GPS location', te: 'నా ఖచ్చితమైన GPS స్థానం పంచండి' },
  { type: 'media_use', en: 'My photos may be used in public posts', te: 'నా ఫోటోలు పబ్లిక్ పోస్టుల్లో వాడవచ్చు' },
]

export function WizardPage() {
  const { lang, token } = useCitizenSession()
  const navigate = useNavigate()
  const te = lang === 'te'
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const idem = useMemo(() => crypto.randomUUID(), [])
  const [sub, setSub] = useState<Submission | null>(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [place, setPlace] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [facts, setFacts] = useState<Facts | null>(null)
  const [fallback, setFallback] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [consents, setConsents] = useState<Record<string, boolean>>({ terms: false, privacy: false, whatsapp_updates: true, share_with_authority: true, location_exact: true })
  const [done, setDone] = useState<{ number: string; track: string | null } | null>(null)

  const cfg = useQuery({
    queryKey: ['bharosa', 'config'],
    queryFn: () => bharosaFetch<Config>('/public/config'),
  })

  useEffect(() => {
    if (!token) navigate(`/bharosa/login?next=${encodeURIComponent('/bharosa/new')}`)
  }, [token, navigate])

  async function saveDraft() {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const body = {
        description,
        language: lang,
        category_hint: category || undefined,
        issue_location: { text: place || undefined, latitude: coords?.lat, longitude: coords?.lng, source: coords ? 'gps' : 'typed' },
        idempotency_key: idem,
      }
      const row = sub
        ? await bharosaFetch<Submission>(`/public/submissions/${sub.id}`, { method: 'PATCH', body, token })
        : await bharosaFetch<Submission>('/public/submissions', { method: 'POST', body, token })
      setSub(row)
      setStep(2)
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile(file: File) {
    if (!token || !sub) return
    setBusy(true)
    setError(null)
    try {
      const slot = await bharosaFetch<{ upload_url: string; storage_path: string; headers: Record<string, string> }>(
        `/public/submissions/${sub.id}/evidence/upload-url`,
        { method: 'POST', token, body: { file_name: file.name, mime_type: file.type || 'application/octet-stream', file_size_bytes: file.size } },
      )
      const put = await fetch(slot.upload_url, { method: 'PUT', headers: slot.headers, body: file })
      if (!put.ok) throw new Error('Upload failed')
      await bharosaFetch(`/public/submissions/${sub.id}/evidence`, {
        method: 'POST', token,
        body: { storage_path: slot.storage_path, file_name: file.name, mime_type: file.type, file_size_bytes: file.size },
      })
      const fresh = await bharosaFetch<Submission>(`/public/submissions/${sub.id}`, { token })
      setSub(fresh)
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  async function structure(withAnswers?: Record<string, string>) {
    if (!token || !sub) return
    setBusy(true)
    setError(null)
    try {
      if (withAnswers && Object.keys(withAnswers).length) {
        await bharosaFetch(`/public/submissions/${sub.id}`, { method: 'PATCH', token, body: { answers: withAnswers } })
      }
      const res = await bharosaFetch<{ structured: Facts; ai_fallback: boolean }>(`/public/submissions/${sub.id}/structure`, { method: 'POST', token })
      setFacts(res.structured)
      setFallback(res.ai_fallback)
      const l = lang
      setTitle(res.structured.title[l] || res.structured.title.en)
      setSummary(res.structured.summary[l] || res.structured.summary.en)
      setCategory(res.structured.category ?? category)
      setStep(3)
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!token || !sub) return
    setBusy(true)
    setError(null)
    try {
      const res = await bharosaFetch<{ ticket_number: string; tracking_token: string | null }>(`/public/submissions/${sub.id}/confirm`, {
        method: 'POST', token,
        body: {
          consents: CONSENTS.map((c) => ({ type: c.type, granted: !!consents[c.type] })),
          edits: { title, summary, category },
        },
      })
      setDone({ number: res.ticket_number, track: res.tracking_token ? `/track/${res.tracking_token}` : null })
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  if (!token) return null
  if (done) {
    return (
      <Card>
        <h1 className="text-xl font-semibold">{te ? 'నమోదైంది' : 'Registered'}</h1>
        <p className="text-2xl font-semibold mt-2">{done.number}</p>
        <p className="text-sm mt-2" style={{ color: 'var(--canvas-muted)' }}>{te ? 'మేము ధృవీకరిస్తాం. మీకు కాల్ రావచ్చు.' : 'We will verify this. You may get a call.'}</p>
        {done.track && <Link className="text-sm underline" to={done.track}>{te ? 'ట్రాక్ లింక్' : 'Tracker link'}</Link>}
        <div className="mt-3"><Link to="/bharosa/cases" className="text-sm" style={{ color: 'var(--primary)' }}>{te ? 'నా కేసులు' : 'My cases'}</Link></div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{te ? 'దశ' : 'Step'} {Math.min(step + 1, 4)} / 4</p>
      {error && <Notice tone="error">{error}</Notice>}
      {step <= 1 && (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">{te ? 'సమస్యను చెప్పండి' : 'Describe the problem'}</h1>
          <textarea className={inputClass} style={{ ...inputStyle, minHeight: 120 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={te ? 'ఏమి జరిగింది?' : 'What happened?'} />
          <Field label={te ? 'విభాగం' : 'Category'}>
            <select className={inputClass} style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{te ? 'ఎంచుకోండి' : 'Choose'}</option>
              {(cfg.data?.categories ?? []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={te ? 'స్థలం' : 'Where is the problem?'}>
            <input className={inputClass} style={inputStyle} value={place} onChange={(e) => setPlace(e.target.value)} />
          </Field>
          <Btn kind="ghost" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }))}>
            {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : (te ? 'నా స్థానం వాడండి' : 'Use my location')}
          </Btn>
          <Btn disabled={busy || description.trim().length < 10} onClick={saveDraft}>{te ? 'తర్వాత' : 'Next'}</Btn>
        </div>
      )}
      {step === 2 && sub && (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">{te ? 'ఫోటో లేదా వీడియో' : 'Photo or video'}</h1>
          <input type="file" accept="image/*,video/mp4,application/pdf,audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f) }} />
          <ul className="text-sm">{sub.evidence.map((ev) => <li key={ev.id}>{ev.file_name}</li>)}</ul>
          <div className="flex gap-2">
            <Btn kind="ghost" onClick={() => setStep(0)}>{te ? 'వెనక్కి' : 'Back'}</Btn>
            <Btn disabled={busy} onClick={() => structure()}>{te ? 'AI సారాంశం' : 'Review summary'}</Btn>
          </div>
        </div>
      )}
      {step === 3 && facts && (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">{te ? 'మేము ఇలా అర్థం చేసుకున్నాం' : 'Here is what we understood'}</h1>
          {fallback && <Notice>{te ? 'AI అందుబాటులో లేదు. మీ మాటలే సారాంశం.' : 'AI is unavailable. The summary is your own words.'}</Notice>}
          {!facts.is_civic_issue && facts.out_of_scope_reason && <Notice tone="error">{facts.out_of_scope_reason}</Notice>}
          <Field label={te ? 'శీర్షిక' : 'Title'}><input className={inputClass} style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label={te ? 'సారాంశం' : 'Summary'}><textarea className={inputClass} style={{ ...inputStyle, minHeight: 80 }} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
          <p className="text-xs">{te ? 'తీవ్రత' : 'Severity'}: {facts.severity}</p>
          {facts.missing_questions.map((q) => (
            <Field key={q.key} label={te ? q.question_te : q.question_en}>
              <input className={inputClass} style={inputStyle} value={answers[q.key] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} />
            </Field>
          ))}
          {facts.missing_questions.length > 0 && <Btn kind="ghost" disabled={busy} onClick={() => structure(answers)}>{te ? 'సమాధానాలతో మళ్లీ' : 'Update with answers'}</Btn>}
          <h2 className="text-sm font-semibold">{te ? 'అనుమతులు' : 'Consents'}</h2>
          {CONSENTS.map((c) => (
            <label key={c.type} className="flex gap-2 text-sm">
              <input type="checkbox" checked={!!consents[c.type]} onChange={(e) => setConsents({ ...consents, [c.type]: e.target.checked })} />
              <span>{te ? c.te : c.en}{c.required ? ' *' : ''}</span>
            </label>
          ))}
          <Btn disabled={busy || !consents.terms || !consents.privacy} onClick={confirm}>{te ? 'సమర్పించండి' : 'Submit'}</Btn>
        </div>
      )}
    </div>
  )
}

interface CaseListItem {
  id: string
  ticket_number: string
  title: string | null
  status: { code: string; label: string; hint: string | null }
  needs_action: boolean
  pending_approvals: number
  updated_at: string
}

export function CasesPage() {
  const { token, lang } = useCitizenSession()
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['bharosa', 'cases', lang, token],
    queryFn: () => bharosaFetch<{ cases: CaseListItem[] }>(`/public/cases?lang=${lang}`, { token, lang }),
    enabled: !!token,
  })
  useEffect(() => {
    if (!token) navigate(`/bharosa/login?next=${encodeURIComponent('/bharosa/cases')}`)
  }, [token, navigate])
  if (!token) return null
  if (q.isLoading) return <p className="text-sm">Loading…</p>
  if (q.isError) return <Notice tone="error">{errText(q.error)}</Notice>
  const te = lang === 'te'
  const rows = [...(q.data?.cases ?? [])].sort((a, b) => Number(b.needs_action) - Number(a.needs_action))
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{te ? 'నా కేసులు' : 'My cases'}</h1>
      {rows.length === 0 && <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>{te ? 'ఇంకా ఫిర్యాదులు లేవు' : 'No complaints yet'}</p>}
      {rows.map((c) => (
        <Link key={c.id} to={`/bharosa/cases/${c.id}`} className="block">
          <Card>
            <div className="flex justify-between gap-2">
              <p className="font-medium">{c.ticket_number}</p>
              <span className="text-xs">{c.status.label}</span>
            </div>
            <p className="text-sm">{c.title}</p>
            {c.needs_action && <p className="text-xs mt-1" style={{ color: 'var(--primary)' }}>{te ? 'మీ చర్య అవసరం' : 'Action needed'}{c.pending_approvals ? ` · ${c.pending_approvals}` : ''}</p>}
          </Card>
        </Link>
      ))}
    </div>
  )
}

interface CitizenComm {
  id: string
  direction: string
  purpose: string
  status: string
  needs_your_approval: boolean
  language: string
  subject: string | null
  body: string | null
  translations: { en?: { subject?: string; body?: string }; te?: { subject?: string; body?: string } } | null
  recipients: { office?: string | null; designation?: string | null; email?: string | null }[]
  reply_summary: { en?: string; te?: string } | null
}
interface CaseDetail {
  id: string
  ticket_number: string
  title: string | null
  summary: string | null
  status: { label: string; hint: string | null; on_hold: boolean; steps: StatusStep[]; code: string }
  actions: {
    approve_communications: string[]
    can_request_authority_email: boolean
    respond_requested: boolean
    can_give_feedback: boolean
    can_reopen: boolean
  }
  timeline: { id: string; text: string; actor: string; at: string; type: string }[]
  communications: CitizenComm[]
  evidence: { id: string; file_name: string; url: string | null; type: string | null }[]
}

export function CaseDetailPage() {
  const { id } = useParams()
  const { token, lang } = useCitizenSession()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const te = lang === 'te'
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [rating, setRating] = useState(5)
  const [resolved, setResolved] = useState(true)
  const [comment, setComment] = useState('')
  const [draftLang, setDraftLang] = useState<Lang>(lang)
  const [editBody, setEditBody] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['bharosa', 'case', id, lang, token],
    queryFn: () => bharosaFetch<CaseDetail>(`/public/cases/${id}?lang=${lang}`, { token, lang }),
    enabled: !!token && !!id,
  })
  useEffect(() => {
    if (!token) navigate(`/bharosa/login?next=${encodeURIComponent(`/cases/${id}`)}`)
  }, [token, id, navigate])

  async function act(path: string, body?: unknown) {
    setError(null)
    try {
      return await bharosaFetch(path, { method: 'POST', token, body, lang })
    } catch (err) {
      setError(errText(err))
      return null
    }
  }

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ['bharosa', 'case', id] })
  }

  if (!token) return null
  if (q.isLoading) return <p className="text-sm">Loading…</p>
  if (q.isError) return <Notice tone="error">{errText(q.error)}</Notice>
  const c = q.data!
  const pending = c.communications.find((m) => m.needs_your_approval)

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{c.ticket_number}</p>
      <h1 className="text-xl font-semibold">{c.title}</h1>
      <Stepper steps={c.status.steps} onHold={c.status.on_hold} />
      {c.status.hint && <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>{c.status.hint}</p>}
      {c.summary && <p className="text-sm">{c.summary}</p>}
      {error && <Notice tone="error">{error}</Notice>}

      {c.actions.can_request_authority_email && (
        <AuthorityEmail ticketId={c.id} token={token!} lang={lang} onDone={refresh} />
      )}

      {pending && (
        <Card>
          <p className="text-sm font-medium">{te ? 'అధికారి ఇమెయిల్‌ను చూడండి' : 'Review the email to the authority'}</p>
          <div className="flex gap-2 my-2">
            {(['te', 'en'] as const).map((l) => (
              <button key={l} type="button" className="text-xs px-2 py-1 rounded-full" style={{ border: '1px solid var(--canvas-border)', background: draftLang === l ? 'var(--primary)' : 'transparent', color: draftLang === l ? '#fff' : 'inherit' }} onClick={() => { setDraftLang(l); setEditBody(null) }}>{l === 'te' ? 'తెలుగు' : 'English'}</button>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{pending.recipients.map((r) => r.office || r.email).filter(Boolean).join(', ')}</p>
          <p className="text-sm font-medium mt-2">{pending.translations?.[draftLang]?.subject || pending.subject}</p>
          <textarea className="w-full text-sm mt-2 rounded-md px-2 py-2" style={{ ...inputStyle, minHeight: 140 }} value={editBody ?? pending.translations?.[draftLang]?.body ?? pending.body ?? ''} onChange={(e) => setEditBody(e.target.value)} />
          <div className="flex gap-2 mt-2">
            <Btn onClick={async () => {
              let idToApprove = pending.id
              if (editBody && editBody !== (pending.translations?.[draftLang]?.body ?? pending.body)) {
                const next = await bharosaFetch<{ id: string }>(`/public/communications/${pending.id}`, { method: 'PATCH', token, body: { body: editBody, language: draftLang } })
                idToApprove = next.id
              }
              await act(`/public/communications/${idToApprove}/approve`, { language: draftLang })
              setEditBody(null)
              await refresh()
            }}>{te ? 'పంపండి' : 'Approve & send'}</Btn>
            <Btn kind="ghost" onClick={async () => { await act(`/public/communications/${pending.id}/reject`, { reason: 'Rejected by citizen' }); await refresh() }}>{te ? 'వద్దు' : 'Reject'}</Btn>
          </div>
        </Card>
      )}

      {c.actions.respond_requested && (
        <Card>
          <p className="text-sm font-medium">{te ? 'మీ సమాధానం కావాలి' : 'The team needs a reply'}</p>
          <textarea className="w-full text-sm mt-2 rounded-md px-2 py-2" style={{ ...inputStyle, minHeight: 80 }} value={reply} onChange={(e) => setReply(e.target.value)} />
          <Btn onClick={async () => { await act(`/public/cases/${c.id}/respond`, { text: reply }); setReply(''); await refresh() }}>{te ? 'పంపండి' : 'Send'}</Btn>
        </Card>
      )}

      {c.actions.can_give_feedback && (
        <Card>
          <p className="text-sm font-medium">{te ? 'అభిప్రాయం' : 'Feedback'}</p>
          <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-2 w-20 rounded-md px-2 py-1 text-sm" style={inputStyle} />
          <label className="flex gap-2 text-sm mt-2"><input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} />{te ? 'పరిష్కరించబడింది' : 'Resolved'}</label>
          <textarea className="w-full text-sm mt-2 rounded-md px-2 py-2" style={inputStyle} value={comment} onChange={(e) => setComment(e.target.value)} />
          <Btn onClick={async () => { await act(`/public/cases/${c.id}/feedback`, { rating, resolved, comment, reopen: !resolved }); await refresh() }}>{te ? 'పంపండి' : 'Submit'}</Btn>
        </Card>
      )}

      {c.actions.can_reopen && (
        <Btn kind="ghost" onClick={async () => {
          const reason = window.prompt(te ? 'ఎందుకు తెరవాలి?' : 'Why is it not resolved?')
          if (!reason) return
          await act(`/public/cases/${c.id}/reopen`, { reason })
          await refresh()
        }}>{te ? 'మళ్లీ తెరవండి' : 'Reopen'}</Btn>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{te ? 'కాలక్రమం' : 'Timeline'}</h2>
        {c.timeline.map((e) => (
          <p key={e.id} className="text-sm"><span className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{new Date(e.at).toLocaleString()} · {e.actor}</span><br />{e.text}</p>
        ))}
      </section>

      {c.communications.filter((m) => m.direction === 'inbound' && m.reply_summary).map((m) => (
        <Card key={m.id}>
          <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{te ? 'అధికారి సమాధానం' : 'Authority reply'}</p>
          <p className="text-sm">{m.reply_summary?.[lang] || m.reply_summary?.en}</p>
        </Card>
      ))}

      {c.evidence.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {c.evidence.map((ev) => ev.url ? <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer"><img src={ev.url} alt={ev.file_name} className="h-24 w-24 object-cover rounded-md" /></a> : <span key={ev.id} className="text-xs">{ev.file_name}</span>)}
        </div>
      )}
    </div>
  )
}

function AuthorityEmail({ ticketId, token, lang, onDone }: { ticketId: string; token: string; lang: Lang; onDone: () => void }) {
  const te = lang === 'te'
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ['bharosa', 'authorities', ticketId],
    queryFn: () => bharosaFetch<{ uncertain: boolean; message: string | null; candidates: { contact_id: string; office: string | null; designation: string | null; confidence: number }[] }>(`/public/cases/${ticketId}/authority-suggestions`, { token, lang }),
    enabled: open,
  })
  if (!open) return <Btn onClick={() => setOpen(true)}>{te ? 'అధికారికి ఇమెయిల్' : 'Email the responsible office'}</Btn>
  return (
    <Card>
      {q.data?.message && <p className="text-sm mb-2">{q.data.message}</p>}
      {error && <Notice tone="error">{error}</Notice>}
      {(q.data?.candidates ?? []).map((c) => (
        <label key={c.contact_id} className="flex gap-2 text-sm py-1">
          <input type="checkbox" checked={picked.includes(c.contact_id)} onChange={(e) => setPicked(e.target.checked ? [...picked, c.contact_id].slice(0, 3) : picked.filter((id) => id !== c.contact_id))} />
          <span>{c.designation} · {c.office} · {Math.round(c.confidence * 100)}%</span>
        </label>
      ))}
      <Btn disabled={picked.length === 0} onClick={async () => {
        try {
          await bharosaFetch(`/public/cases/${ticketId}/authority-email`, { method: 'POST', token, body: { contact_ids: picked, language: lang, share_name: true } })
          setOpen(false)
          onDone()
        } catch (err) {
          setError(errText(err))
        }
      }}>{te ? 'ముసాయిదా తయారు చేయండి' : 'Draft email'}</Btn>
    </Card>
  )
}

export function CompletePage() {
  const { token: claim } = useParams()
  const { token, lang } = useCitizenSession()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [subId, setSubId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      navigate(`/bharosa/login?next=${encodeURIComponent(`/complete/${claim}`)}`)
      return
    }
    if (!claim || subId) return
    bharosaFetch<{ id: string }>('/public/submissions/claim', { method: 'POST', token, body: { token: claim } })
      .then((row) => setSubId(row.id))
      .catch((err) => setError(errText(err)))
  }, [token, claim, navigate, subId])

  const te = lang === 'te'
  if (error) return <Notice tone="error">{error}</Notice>
  if (!subId) return <p className="text-sm">{te ? 'లింక్ తెరుస్తున్నాం…' : 'Opening your complaint…'}</p>
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{te ? 'ఇమెయిల్ ఫిర్యాదును పూర్తి చేయండి' : 'Finish your emailed complaint'}</h1>
      <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>{te ? 'సారాంశం సిద్ధంగా ఉంది. ఫోటోలు జోడించి నిర్ధారించండి.' : 'The summary is ready. Add photos if you have them, then confirm.'}</p>
      <ClaimFinish submissionId={subId} />
    </div>
  )
}

function ClaimFinish({ submissionId }: { submissionId: string }) {
  const { token, lang } = useCitizenSession()
  const te = lang === 'te'
  const q = useQuery({
    queryKey: ['bharosa', 'claim-sub', submissionId],
    queryFn: () => bharosaFetch<Submission & { structured_json: Facts | null }>(`/public/submissions/${submissionId}`, { token }),
  })
  const [consents, setConsents] = useState<Record<string, boolean>>({ terms: false, privacy: false, whatsapp_updates: true })
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (q.isLoading) return <p className="text-sm">Loading…</p>
  if (q.isError) return <Notice tone="error">{errText(q.error)}</Notice>
  const facts = q.data?.structured_json
  if (done) return <Card><p className="text-xl font-semibold">{done}</p><Link to="/bharosa/cases">{te ? 'నా కేసులు' : 'My cases'}</Link></Card>
  return (
    <div className="space-y-3">
      <Card>
        <p className="font-medium">{facts?.title[lang] || facts?.title.en}</p>
        <p className="text-sm mt-1">{facts?.summary[lang] || facts?.summary.en}</p>
      </Card>
      {error && <Notice tone="error">{error}</Notice>}
      {CONSENTS.filter((c) => c.required || c.type === 'whatsapp_updates').map((c) => (
        <label key={c.type} className="flex gap-2 text-sm">
          <input type="checkbox" checked={!!consents[c.type]} onChange={(e) => setConsents({ ...consents, [c.type]: e.target.checked })} />
          {te ? c.te : c.en}
        </label>
      ))}
      <Btn disabled={!consents.terms || !consents.privacy} onClick={async () => {
        try {
          const res = await bharosaFetch<{ ticket_number: string }>(`/public/submissions/${submissionId}/confirm`, {
            method: 'POST', token,
            body: { consents: CONSENTS.map((c) => ({ type: c.type, granted: !!consents[c.type] })) },
          })
          setDone(res.ticket_number)
        } catch (err) {
          setError(errText(err))
        }
      }}>{te ? 'నిర్ధారించండి' : 'Confirm'}</Btn>
    </div>
  )
}
