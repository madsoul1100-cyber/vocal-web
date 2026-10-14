import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { staffBharosa } from '@/api/bharosa'
import { useAuth } from '@/contexts/AuthContext'
import { AmplifyLaunchButton } from '@/components/amplify/AmplifyLaunchButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Btn, Card, Field, Notice, errText, inputClass, inputStyle } from './ui'

function useStaff() {
  const { getAccessToken } = useAuth()
  return getAccessToken
}

export function AssistedIntakePage() {
  const getToken = useStaff()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [place, setPlace] = useState('')
  const [lang, setLang] = useState<'te' | 'en'>('te')
  const [subId, setSubId] = useState<string | null>(null)
  const [structured, setStructured] = useState<{ title: { te: string; en: string }; summary: { te: string; en: string }; missing_questions: { key: string; question_te: string; question_en: string }[] } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [consents, setConsents] = useState({ terms: false, privacy: false, whatsapp_updates: true })
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const res = await staffBharosa<{ submission_id: string; structured: typeof structured; citizen: { phone: string; phone_verified: boolean } }>(
        '/bharosa/intake/assisted',
        getToken,
        { method: 'POST', body: { phone, citizen_name: name, language: lang, description, issue_location: { text: place, source: 'typed' } } },
      )
      setSubId(res.submission_id)
      setStructured(res.structured)
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Phone-call intake" subtitle="Log a complaint while you are on the call. Read the summary back before you confirm." />
      <div className="p-4 sm:p-8 max-w-2xl space-y-3">
        {error && <Notice tone="error">{error}</Notice>}
        {result && <Notice>Case {result} registered. A verification call is queued because the phone was not OTP-verified.</Notice>}
        {!subId && (
          <>
            <Field label="Citizen mobile"><input className={inputClass} style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Name"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Language">
              <select className={inputClass} style={inputStyle} value={lang} onChange={(e) => setLang(e.target.value as 'te' | 'en')}><option value="te">Telugu</option><option value="en">English</option></select>
            </Field>
            <Field label="What they said"><textarea className={inputClass} style={{ ...inputStyle, minHeight: 100 }} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="Place"><input className={inputClass} style={inputStyle} value={place} onChange={(e) => setPlace(e.target.value)} /></Field>
            <Btn disabled={busy || description.length < 10} onClick={start}>Structure with AI</Btn>
          </>
        )}
        {subId && structured && (
          <Card>
            <p className="font-medium">{structured.title[lang]}</p>
            <p className="text-sm mt-1">{structured.summary[lang]}</p>
            {structured.missing_questions.map((q) => (
              <Field key={q.key} label={q.question_en}>
                <input className={inputClass} style={inputStyle} value={answers[q.key] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} />
              </Field>
            ))}
            <label className="flex gap-2 text-sm mt-2"><input type="checkbox" checked={consents.terms} onChange={(e) => setConsents({ ...consents, terms: e.target.checked })} />Citizen agreed to terms (verbal)</label>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={consents.privacy} onChange={(e) => setConsents({ ...consents, privacy: e.target.checked })} />Citizen agreed to privacy notice (verbal)</label>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={consents.whatsapp_updates} onChange={(e) => setConsents({ ...consents, whatsapp_updates: e.target.checked })} />WhatsApp updates</label>
            <div className="flex gap-2 mt-3">
              <Btn kind="ghost" onClick={async () => {
                const res = await staffBharosa<{ structured: typeof structured }>(`/bharosa/intake/assisted/${subId}`, getToken, { method: 'PATCH', body: { answers, restructure: true } })
                setStructured(res.structured)
              }}>Refresh summary</Btn>
              <Btn disabled={!consents.terms || !consents.privacy} onClick={async () => {
                try {
                  const res = await staffBharosa<{ ticket_number: string }>(`/bharosa/intake/assisted/${subId}/confirm`, getToken, {
                    method: 'POST',
                    body: { consents: [{ type: 'terms', granted: consents.terms }, { type: 'privacy', granted: consents.privacy }, { type: 'whatsapp_updates', granted: consents.whatsapp_updates }] },
                  })
                  setResult(res.ticket_number)
                } catch (err) {
                  setError(errText(err))
                }
              }}>Register case</Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

interface QueueItem {
  id: string
  ticket_id: string
  ticket_number: string
  title: string | null
  citizen_name: string | null
  citizen_phone: string | null
  citizen_language: string | null
  severity: string | null
  script_json: {
    greeting: { te: string; en: string }
    confirmations: { key: string; statement_en: string }[]
    questions: { key: string; question_en: string }[]
    closing: { te: string; en: string }
  } | null
}

export function VerificationPage() {
  const getToken = useStaff()
  const qc = useQueryClient()
  const [open, setOpen] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ['bharosa', 'verification'],
    queryFn: () => staffBharosa<{ items: QueueItem[] }>('/bharosa/verification/queue', getToken),
  })
  const item = q.data?.items.find((i) => i.id === open)
  return (
    <div>
      <PageHeader title="Verification queue" subtitle="Call the citizen and mark the complaint passed, failed, or inconclusive." />
      <div className="p-4 sm:p-8 max-w-3xl space-y-3">
        {error && <Notice tone="error">{error}</Notice>}
        {q.isError && <Notice tone="error">{errText(q.error)}</Notice>}
        {(q.data?.items ?? []).map((row) => (
          <Card key={row.id}>
            <div className="flex justify-between gap-2">
              <div>
                <Link to={`/bharosa/workspace/${row.ticket_id}`} className="font-medium">{row.ticket_number}</Link>
                <p className="text-sm">{row.title}</p>
                <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{row.citizen_name} · {row.citizen_phone} · {row.severity}</p>
              </div>
              <Btn kind="ghost" onClick={() => setOpen(row.id === open ? null : row.id)}>{open === row.id ? 'Hide' : 'Open script'}</Btn>
            </div>
            {open === row.id && item?.script_json && (
              <div className="mt-3 space-y-2 text-sm">
                <p>{item.script_json.greeting.te}</p>
                {item.script_json.confirmations.map((c) => <p key={c.key}>☐ {c.statement_en}</p>)}
                {item.script_json.questions.map((qq) => (
                  <Field key={qq.key} label={qq.question_en}>
                    <input className={inputClass} style={inputStyle} value={answers[qq.key] ?? ''} onChange={(e) => setAnswers({ ...answers, [qq.key]: e.target.value })} />
                  </Field>
                ))}
                <textarea className={inputClass} style={inputStyle} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className="flex gap-2">
                  {(['passed', 'failed', 'inconclusive'] as const).map((result) => (
                    <Btn key={result} kind={result === 'failed' ? 'danger' : 'primary'} onClick={async () => {
                      try {
                        await staffBharosa(`/bharosa/verification/${row.id}/complete`, getToken, { method: 'POST', body: { result, notes, answers } })
                        setOpen(null)
                        await qc.invalidateQueries({ queryKey: ['bharosa', 'verification'] })
                      } catch (err) {
                        setError(errText(err))
                      }
                    }}>{result}</Btn>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
        {q.data && q.data.items.length === 0 && <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>Queue is empty.</p>}
      </div>
    </div>
  )
}

const MOVES: Record<string, string[]> = {
  unassigned: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'unassigned', 'on_hold', 'cancelled'],
  picked_up: ['in_progress', 'on_hold', 'waiting_for_reply', 'cancelled', 'closed'],
  in_progress: ['on_hold', 'waiting_for_reply', 'cancelled', 'closed'],
  on_hold: ['in_progress', 'picked_up', 'cancelled'],
  waiting_for_reply: ['in_progress', 'on_hold', 'cancelled', 'closed'],
  cancelled: [],
  closed: [],
}

interface TaskRow {
  id: string
  title: string
  status: string
  owner_name: string | null
  ticket_numbers: string[]
  effective_due_at: string | null
  hold_reason: string | null
}

export function TasksPage() {
  const getToken = useStaff()
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ['bharosa', 'tasks'],
    queryFn: () => staffBharosa<{ tasks: TaskRow[]; counts?: Record<string, string> }>('/bharosa/tasks?limit=50', getToken),
  })
  const summary = useQuery({
    queryKey: ['bharosa', 'task-summary'],
    queryFn: () => staffBharosa<{ counts: Record<string, string> }>('/bharosa/tasks/summary', getToken),
  })
  return (
    <div>
      <PageHeader title="Tasks" subtitle="Sub-tasks from approved plans. Hold pauses the deadline and needs a reason." />
      <div className="p-4 sm:p-8 max-w-4xl space-y-3">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(summary.data?.counts ?? {}).map(([k, v]) => <span key={k} className="rounded-full px-2 py-1" style={{ border: '1px solid var(--canvas-border)' }}>{k}: {v}</span>)}
        </div>
        {(q.data?.tasks ?? []).map((t) => (
          <Card key={t.id}>
            <p className="font-medium">{t.title}</p>
            <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{t.status} · {t.owner_name ?? 'unassigned'} · {t.ticket_numbers.join(', ')}{t.effective_due_at ? ` · due ${new Date(t.effective_due_at).toLocaleDateString()}` : ''}</p>
            {t.hold_reason && <p className="text-xs">Hold: {t.hold_reason}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {(MOVES[t.status] ?? []).map((next) => (
                <Btn key={next} kind="ghost" onClick={async () => {
                  let reason: string | undefined
                  if (next === 'on_hold' || next === 'cancelled') {
                    reason = window.prompt('Reason') ?? undefined
                    if (!reason) return
                  }
                  try {
                    await staffBharosa(`/bharosa/tasks/${t.id}/status`, getToken, { method: 'POST', body: { status: next, reason } })
                    await qc.invalidateQueries({ queryKey: ['bharosa', 'tasks'] })
                    await qc.invalidateQueries({ queryKey: ['bharosa', 'task-summary'] })
                  } catch (err) {
                    setError(errText(err))
                  }
                }}>{next}</Btn>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function ApprovalsPage() {
  const getToken = useStaff()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['bharosa', 'approvals'],
    queryFn: () => staffBharosa<{ items: { id: string; ticket_number: string | null; ticket_title: string | null; purpose: string; subject: string | null; language: string }[] }>('/bharosa/communications/approvals', getToken),
  })
  return (
    <div>
      <PageHeader title="Approval queue" subtitle="Staff drafts waiting for a GRO. Citizen-owned drafts stay with the citizen." />
      <div className="p-4 sm:p-8 max-w-3xl space-y-3">
        {(q.data?.items ?? []).map((item) => (
          <Card key={item.id}>
            <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{item.ticket_number} · {item.purpose} · {item.language}</p>
            <p className="font-medium">{item.subject || item.ticket_title}</p>
            <div className="flex gap-2 mt-2">
              <Btn onClick={async () => { await staffBharosa(`/bharosa/communications/${item.id}/approve`, getToken, { method: 'POST', body: {} }); await qc.invalidateQueries({ queryKey: ['bharosa', 'approvals'] }) }}>Approve</Btn>
              <Btn kind="danger" onClick={async () => {
                const reason = window.prompt('Why reject?')
                if (!reason) return
                await staffBharosa(`/bharosa/communications/${item.id}/reject`, getToken, { method: 'POST', body: { reason } })
                await qc.invalidateQueries({ queryKey: ['bharosa', 'approvals'] })
              }}>Reject</Btn>
            </div>
          </Card>
        ))}
        {q.isError && <Notice tone="error">{errText(q.error)}</Notice>}
        {q.data && q.data.items.length === 0 && <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>Nothing waiting.</p>}
      </div>
    </div>
  )
}

export function EscalationsPage() {
  const getToken = useStaff()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['bharosa', 'escalations'],
    queryFn: () => staffBharosa<{ escalations: { id: string; ticket_id: string | null; trigger_type: string; reason: string; status: string; created_at: string }[]; count: number }>('/bharosa/escalations?status=open', getToken),
  })
  const labels: Record<string, string> = {
    sla_breach: 'SLA breached', task_overdue: 'Task overdue', no_reply: 'No reply', bounce: 'Email bounced',
    ai_uncertain: 'AI needs a decision', citizen_reopen: 'Citizen reopened', manual: 'Raised by staff',
  }
  return (
    <div>
      <PageHeader title="Escalations" subtitle="Items the system or staff raised for a GRO." />
      <div className="p-4 sm:p-8 max-w-3xl space-y-3">
        {q.isError && <Notice tone="error">{errText(q.error)}</Notice>}
        {(q.data?.escalations ?? []).map((e) => (
          <Card key={e.id}>
            <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{labels[e.trigger_type] ?? e.trigger_type}</p>
            <p className="text-sm whitespace-pre-wrap">{e.reason}</p>
            {e.ticket_id && <Link className="text-xs" style={{ color: 'var(--primary)' }} to={`/bharosa/workspace/${e.ticket_id}`}>Open case</Link>}
            <div className="flex gap-2 mt-2">
              <Btn kind="ghost" onClick={() => staffBharosa(`/bharosa/escalations/${e.id}/status`, getToken, { method: 'POST', body: { status: 'acknowledged' } }).then(() => qc.invalidateQueries({ queryKey: ['bharosa', 'escalations'] }))}>Acknowledge</Btn>
              <Btn onClick={() => {
                const note = window.prompt('Resolution note')
                if (!note) return
                void staffBharosa(`/bharosa/escalations/${e.id}/status`, getToken, { method: 'POST', body: { status: 'resolved', note } }).then(() => qc.invalidateQueries({ queryKey: ['bharosa', 'escalations'] }))
              }}>Resolve</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

interface AuthorityCandidate {
  contact_id: string
  contact_name: string | null
  organization_name: string | null
  role_designation: string | null
  department: string | null
  email: string | null
  has_email: boolean
  confidence: number
  reasons: string[]
}

interface CaseComm {
  id: string
  direction: string
  purpose: string
  status: string
  provider: string | null
  subject: string | null
  body: string | null
  approval_by: string
  recipients_json: { name?: string | null; office?: string | null; designation?: string | null; email?: string | null; kind?: string }[] | null
}

const EVENT_LABELS: Record<string, string> = {
  case_created: 'Complaint registered',
  status_changed: 'Status changed',
  verification_started: 'Verification started',
  verified: 'Complaint verified',
  verification_failed: 'Verification failed',
  task_created: 'Task created',
  routing_suggested: 'AI looked for the responsible office',
  resolution_plan_suggested: 'AI wrote a plan',
  resolution_plan_approved: 'Plan approved',
  escalated_to_gro: 'Raised for a staff decision',
  escalation_resolved: 'Staff decision recorded',
}

function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replaceAll('_', ' ')
}

function collapseEvents<T extends { id: string; event_type: string; summary: string | null; reason?: string | null }>(events: T[]): Array<T & { extra?: string }> {
  const out: Array<T & { extra?: string }> = []
  for (const e of events) {
    const prev = out[out.length - 1]
    if (prev && prev.event_type === e.event_type && !e.summary && !prev.summary) {
      const n = prev.extra ? Number(prev.extra.replace('×', '')) + 1 : 2
      prev.extra = `×${n}`
      continue
    }
    out.push({ ...e })
  }
  return out
}

const CASE_TABS = [
  ['overview', 'Overview'],
  ['plan', 'Plan'],
  ['tasks', 'Tasks'],
  ['bodies', 'Public bodies'],
  ['timeline', 'Timeline'],
] as const

type CaseTab = (typeof CASE_TABS)[number][0]

export function CaseWorkspace({ ticketId }: { ticketId: string }) {
  const getToken = useStaff()
  const { data: user } = useCurrentUser()
  const qc = useQueryClient()
  const [tab, setTab] = useState<CaseTab>('overview')
  const [error, setError] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ['bharosa', 'workspace', ticketId],
    queryFn: () => staffBharosa<{
      case: Record<string, unknown> & {
        ticket_number: string
        title: string | null
        citizen_status: string
        citizen_name: string | null
        citizen_phone: string | null
        source_channel: string
        verification_status: string | null
        normalized_summary: string | null
        original_issue_text: string | null
        location_text: string | null
        stage: string
        sub_status: string
        routing_status: string | null
        category_name: string | null
        territory_name: string | null
        owner_name: string | null
      }
      plans: { id: string; status: string; summary: string | null; questions_for_gro_json: string[] | null; plan_json: { steps: { title: string; description: string; suggested_role: string | null; task_type: string }[]; confidence: number; summary: string } }[]
      tasks: TaskRow[]
      communications: CaseComm[]
      escalations: { id: string; reason: string; trigger_type: string; status: string }[]
    }>(`/bharosa/cases/${ticketId}`, getToken),
  })
  const timeline = useQuery({
    queryKey: ['bharosa', 'timeline', ticketId],
    queryFn: () => staffBharosa<{ events: { id: string; event_type: string; visibility: string; summary: string | null; reason: string | null; created_at: string }[] }>(`/bharosa/cases/${ticketId}/timeline`, getToken),
    enabled: tab === 'timeline',
  })
  if (q.isLoading) return <p className="p-8 text-sm">Loading…</p>
  if (q.isError) return <div className="p-8"><Notice tone="error">{errText(q.error)}</Notice></div>
  const data = q.data!
  const plan = data.plans.find((p) => p.status === 'pending_approval') ?? data.plans[0]
  const c = data.case
  const canAmplify = user?.role === 'super_admin' || user?.role === 'central_support'
  return (
    <div>
      <PageHeader
        breadcrumbs={<Link to="/tickets">All tickets</Link>}
        title={c.ticket_number}
        subtitle={`${c.title ?? 'Untitled'} · ${c.citizen_status.replaceAll('_', ' ')} · ${c.source_channel}`}
      />
      <div className="p-4 sm:p-8 max-w-4xl space-y-3">
        <div className="flex gap-2 flex-wrap">
          {CASE_TABS.map(([id, label]) => (
            <button key={id} type="button" className="text-sm px-3 py-1.5 rounded-md" style={{ background: tab === id ? 'var(--primary)' : 'transparent', color: tab === id ? '#fff' : 'inherit', border: '1px solid var(--canvas-border)' }} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {tab === 'overview' && (
          <Card>
            <p className="text-sm font-medium">{c.title}</p>
            <p className="text-sm mt-2 whitespace-pre-wrap">{c.normalized_summary || c.original_issue_text}</p>
            {c.normalized_summary && c.original_issue_text && c.normalized_summary !== c.original_issue_text && (
              <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--canvas-muted)' }}>{c.original_issue_text}</p>
            )}
            <p className="text-xs mt-3" style={{ color: 'var(--canvas-muted)' }}>
              {[c.citizen_name, c.citizen_phone, c.location_text, c.category_name, c.territory_name].filter(Boolean).join(' · ')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--canvas-muted)' }}>
              Assigned to {c.owner_name || 'nobody yet'} · verification {c.verification_status ?? 'pending'} · {c.citizen_status.replaceAll('_', ' ')}
            </p>
            {plan?.status === 'pending_approval' && (
              <p className="text-sm mt-3">The AI plan is ready. Open Plan and approve it. That creates the tasks and assigns each one to a worker.</p>
            )}
            {data.communications.filter((m) => m.purpose === 'citizen_update').map((m) => (
              <p key={m.id} className="text-xs mt-2">Citizen update · {m.status.replaceAll('_', ' ')}</p>
            ))}
            {data.escalations.length > 0 && (
              <div className="mt-3">
                {data.escalations.map((e) => <p key={e.id} className="text-sm">{e.status} · {e.reason}</p>)}
              </div>
            )}
            {canAmplify && (
              <div className="mt-4 max-w-xs">
                <AmplifyLaunchButton ticketId={ticketId} />
              </div>
            )}
          </Card>
        )}
        {tab === 'plan' && !plan && (
          <Card>
            <p className="text-sm">No resolution plan yet. The AI writes one after verification, or you can ask for it now.</p>
            <Btn onClick={async () => {
              try {
                await staffBharosa(`/bharosa/cases/${ticketId}/plans/generate`, getToken, { method: 'POST', body: {} })
                await qc.invalidateQueries({ queryKey: ['bharosa', 'workspace', ticketId] })
              } catch (err) { setError(errText(err)) }
            }}>Write plan</Btn>
          </Card>
        )}
        {tab === 'plan' && plan && (
          <Card>
            <p className="text-xs">{plan.status} · confidence {plan.plan_json?.confidence}</p>
            <p className="text-sm mt-1">{plan.summary}</p>
            {(plan.questions_for_gro_json ?? []).map((qq) => <p key={qq} className="text-sm mt-1" style={{ color: 'var(--amber-700)' }}>{qq}</p>)}
            <ol className="mt-2 space-y-2">
              {(plan.plan_json?.steps ?? []).map((s, i) => (
                <li key={i} className="text-sm"><span className="font-medium">{i + 1}. {s.title}</span> · {s.suggested_role} · {s.task_type}<br />{s.description}</li>
              ))}
            </ol>
            {plan.status === 'pending_approval' && (
              <Btn onClick={async () => {
                try {
                  await staffBharosa(`/bharosa/plans/${plan.id}/approve`, getToken, { method: 'POST', body: { reason: 'Approved from web' } })
                  await qc.invalidateQueries({ queryKey: ['bharosa', 'workspace', ticketId] })
                  setTab('tasks')
                } catch (err) {
                  setError(errText(err))
                }
              }}>Approve plan and assign tasks</Btn>
            )}
          </Card>
        )}
        {tab === 'tasks' && data.tasks.length === 0 && <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>Tasks appear after you approve the plan.</p>}
        {tab === 'tasks' && data.tasks.map((t) => <Card key={t.id}><p className="text-sm font-medium">{t.title}</p><p className="text-xs">{t.status} · {t.owner_name}</p></Card>)}
        {tab === 'bodies' && (
          <PublicBodies
            ticketId={ticketId}
            communications={data.communications}
            onChange={() => qc.invalidateQueries({ queryKey: ['bharosa', 'workspace', ticketId] })}
            onError={setError}
          />
        )}
        {tab === 'timeline' && (
          <div className="space-y-2">
            {c.normalized_summary && (
              <Card>
                <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>AI summary</p>
                <p className="text-sm mt-1">{c.normalized_summary}</p>
              </Card>
            )}
            {collapseEvents(timeline.data?.events ?? []).map((e) => (
              <p key={e.id} className="text-sm">
                <span className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{eventLabel(e.event_type)}{e.extra ? ` · ${e.extra}` : ''}</span>
                {(e.summary || e.reason) && <><br />{e.summary || e.reason}</>}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PublicBodies({
  ticketId,
  communications,
  onChange,
  onError,
}: {
  ticketId: string
  communications: CaseComm[]
  onChange: () => void
  onError: (message: string) => void
}) {
  const getToken = useStaff()
  const [candidates, setCandidates] = useState<AuthorityCandidate[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  async function findOffices() {
    setBusy(true)
    onError('')
    try {
      const r = await staffBharosa<{ uncertain: boolean; uncertainty_reason: string | null; candidates: AuthorityCandidate[] }>(
        `/bharosa/cases/${ticketId}/routing/suggest`,
        getToken,
        { method: 'POST', body: {} },
      )
      setCandidates(r.candidates)
      setNote(r.uncertainty_reason)
      const first = r.candidates.find((c) => c.has_email)
      setPicked(first ? [first.contact_id] : [])
    } catch (err) {
      onError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void findOffices()
    // Load the AI office suggestion once when this tab opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  const authorityMail = communications.filter((m) => m.purpose !== 'citizen_update')

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-sm font-medium">Offices that can act on this complaint</p>
        <p className="text-xs mt-1" style={{ color: 'var(--canvas-muted)' }}>The AI picks them from the directory. Nothing is emailed until you approve the draft.</p>
        {note && <p className="text-sm mt-2">{note}</p>}
        {candidates && candidates.length === 0 && (
          <p className="text-sm mt-2">No matching office is in the directory yet. Add contacts under Directory, then search again.</p>
        )}
        {(candidates ?? []).map((office) => (
          <label key={office.contact_id} className="flex gap-2 text-sm py-1">
            <input
              type="checkbox"
              disabled={!office.has_email}
              checked={picked.includes(office.contact_id)}
              onChange={(e) => setPicked(e.target.checked ? [...picked, office.contact_id].slice(0, 3) : picked.filter((id) => id !== office.contact_id))}
            />
            <span>
              {office.role_designation || office.contact_name} · {office.organization_name}
              {office.department ? ` · ${office.department}` : ''} · {Math.round(office.confidence * 100)}%
              {office.email ? ` · ${office.email}` : ' · no email'}
            </span>
          </label>
        ))}
        <div className="flex gap-2 mt-2">
          <Btn kind="ghost" disabled={busy} onClick={() => void findOffices()}>Search again</Btn>
          <Btn disabled={busy || picked.length === 0} onClick={async () => {
            setBusy(true)
            onError('')
            try {
              await staffBharosa(`/bharosa/cases/${ticketId}/communications/draft`, getToken, {
                method: 'POST',
                body: { format: 'authority_email', contact_ids: picked, language: 'en' },
              })
              onChange()
            } catch (err) {
              onError(errText(err))
            } finally {
              setBusy(false)
            }
          }}>Draft email</Btn>
        </div>
      </Card>
      {authorityMail.length === 0 && <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>No email has been drafted for a public office yet.</p>}
      {authorityMail.map((m) => {
        const to = (m.recipients_json ?? []).filter((r) => r.kind === 'to' || !r.kind)
        return (
          <Card key={m.id}>
            <p className="text-xs">{m.purpose.replaceAll('_', ' ')} · {m.status.replaceAll('_', ' ')} · {m.direction}{m.provider === 'console' ? ' · saved in the API log, not emailed yet' : ''}</p>
            <p className="text-sm font-medium mt-1">{m.subject || 'Untitled draft'}</p>
            {to.length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--canvas-muted)' }}>
                To {to.map((r) => r.office || r.designation || r.name || r.email).filter(Boolean).join(', ')}
              </p>
            )}
            {m.body && <p className="text-sm whitespace-pre-wrap mt-2">{m.body.slice(0, 700)}</p>}
            {m.status === 'pending_approval' && m.approval_by === 'staff' && (
              <Btn onClick={async () => {
                try {
                  await staffBharosa(`/bharosa/communications/${m.id}/approve`, getToken, { method: 'POST', body: {} })
                  onChange()
                } catch (err) {
                  onError(errText(err))
                }
              }}>Approve and send</Btn>
            )}
          </Card>
        )
      })}
    </div>
  )
}

export function CaseWorkspacePage() {
  const { id } = useParams()
  if (!id) return null
  return <CaseWorkspace ticketId={id} />
}

export function AiReviewPage() {
  const getToken = useStaff()
  const q = useQuery({
    queryKey: ['bharosa', 'ai'],
    queryFn: () => staffBharosa<{ agents: { agent: string; runs: number; succeeded: number; failed: number; accepted: number; edited: number; avg_latency_ms: number | null }[] }>('/bharosa/ai-runs/metrics', getToken),
  })
  const runs = useQuery({
    queryKey: ['bharosa', 'ai-runs'],
    queryFn: () => staffBharosa<{ runs: { id: string; agent: string; status: string; confidence: number | null; created_at: string }[] }>('/bharosa/ai-runs', getToken),
  })
  return (
    <div>
      <PageHeader title="AI review" subtitle="Last 30 days. Every agent has a fallback when the model is unavailable." />
      <div className="p-4 sm:p-8 max-w-3xl space-y-2">
        {q.isError && <Notice tone="error">{errText(q.error)}</Notice>}
        {(q.data?.agents ?? []).map((a) => (
          <Card key={a.agent}><p className="font-medium">{a.agent}</p><p className="text-xs">{a.runs} runs · {a.succeeded} ok · {a.failed} failed · accepted {a.accepted} · edited {a.edited}</p></Card>
        ))}
        <h2 className="text-sm font-semibold pt-2">Recent runs</h2>
        {(runs.data?.runs ?? []).slice(0, 20).map((r) => <p key={r.id} className="text-sm">{r.agent} · {r.status} · {r.confidence ?? '—'}</p>)}
      </div>
    </div>
  )
}

export function DirectorySourcesPage() {
  const getToken = useStaff()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ['bharosa', 'dir-sources'],
    queryFn: () => staffBharosa<{ sources: { id: string; name: string; url: string; format: string; last_status: string | null; last_error: string | null }[] }>('/bharosa/directory-sources', getToken),
  })
  const health = useQuery({
    queryKey: ['bharosa', 'dir-health'],
    queryFn: () => staffBharosa<{ contacts: { id: string; contact_name: string; email: string | null; bounce_count: number; verification_status: string }[] }>('/bharosa/directory/health', getToken),
  })
  return (
    <div>
      <PageHeader title="Directory sources" subtitle="Official JSON or CSV lists refresh the authority contacts." />
      <div className="p-4 sm:p-8 max-w-3xl space-y-3">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <input className={inputClass} style={inputStyle} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputClass} style={inputStyle} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Btn onClick={async () => {
            try {
              await staffBharosa('/bharosa/directory-sources', getToken, { method: 'POST', body: { name, url, format: 'json' } })
              setName(''); setUrl('')
              await qc.invalidateQueries({ queryKey: ['bharosa', 'dir-sources'] })
            } catch (err) { setError(errText(err)) }
          }}>Add</Btn>
        </div>
        {(q.data?.sources ?? []).map((s) => (
          <Card key={s.id}>
            <p className="font-medium">{s.name}</p>
            <p className="text-xs break-all">{s.url}</p>
            <p className="text-xs">{s.last_status} {s.last_error}</p>
            <Btn kind="ghost" onClick={() => staffBharosa(`/bharosa/directory-sources/${s.id}/refresh`, getToken, { method: 'POST', body: {} })}>Refresh</Btn>
          </Card>
        ))}
        <h2 className="text-sm font-semibold">Needs attention</h2>
        {(health.data?.contacts ?? []).slice(0, 15).map((c) => <p key={c.id} className="text-sm">{c.contact_name} · {c.email ?? 'no email'} · bounces {c.bounce_count} · {c.verification_status}</p>)}
      </div>
    </div>
  )
}

export function FeedAdminPage() {
  const getToken = useStaff()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const sources = useQuery({
    queryKey: ['bharosa', 'feed-sources'],
    queryFn: () => staffBharosa<{ sources: { id: string; name: string; url: string; kind: string; active: boolean }[] }>('/bharosa/feed/sources', getToken),
  })
  const items = useQuery({
    queryKey: ['bharosa', 'feed-admin'],
    queryFn: () => staffBharosa<{ items: { id: string; title: string; pinned: boolean; hidden: boolean }[] }>('/bharosa/feed/items', getToken),
  })
  return (
    <div>
      <PageHeader title="Feed" subtitle="RSS, Atom, or JSON feeds shown on the public page." />
      <div className="p-4 sm:p-8 max-w-3xl space-y-3">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <input className={inputClass} style={inputStyle} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputClass} style={inputStyle} placeholder="Feed URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Btn onClick={async () => {
            try {
              await staffBharosa('/bharosa/feed/sources', getToken, { method: 'POST', body: { name, url, kind: 'rss' } })
              setName(''); setUrl('')
              await qc.invalidateQueries({ queryKey: ['bharosa', 'feed-sources'] })
            } catch (err) { setError(errText(err)) }
          }}>Add</Btn>
        </div>
        {(sources.data?.sources ?? []).map((s) => (
          <Card key={s.id}>
            <p className="font-medium">{s.name}</p>
            <p className="text-xs break-all">{s.url}</p>
            <Btn kind="ghost" onClick={() => staffBharosa(`/bharosa/feed/sources/${s.id}/refresh`, getToken, { method: 'POST', body: {} }).then(() => qc.invalidateQueries({ queryKey: ['bharosa', 'feed-admin'] }))}>Refresh</Btn>
          </Card>
        ))}
        {(items.data?.items ?? []).slice(0, 20).map((item) => (
          <div key={item.id} className="flex justify-between gap-2 text-sm">
            <span>{item.hidden ? 'Hidden · ' : ''}{item.pinned ? 'Pinned · ' : ''}{item.title}</span>
            <button type="button" className="text-xs" onClick={() => staffBharosa(`/bharosa/feed/items/${item.id}`, getToken, { method: 'PATCH', body: { hidden: !item.hidden } }).then(() => qc.invalidateQueries({ queryKey: ['bharosa', 'feed-admin'] }))}>{item.hidden ? 'Show' : 'Hide'}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BharosaSettingsPage() {
  const getToken = useStaff()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['bharosa', 'settings'],
    queryFn: () => staffBharosa<{ settings: { verification: { callAfterCreate: boolean; callMode: string }; followUp: { intervalsHours: number[] }; notifications: { whatsappEnabled: boolean; smsFallback: boolean } } }>('/bharosa/settings', getToken),
  })
  const [error, setError] = useState<string | null>(null)
  const s = q.data?.settings
  return (
    <div>
      <PageHeader title="Bharosa settings" subtitle="Only a super admin can save. Others can read." />
      <div className="p-4 sm:p-8 max-w-xl space-y-3">
        {error && <Notice tone="error">{error}</Notice>}
        {q.isError && <Notice tone="error">{errText(q.error)}</Notice>}
        {s && (
          <Card>
            <p className="text-sm">Verification call after create: {s.verification.callAfterCreate ? 'on' : 'off'} ({s.verification.callMode})</p>
            <p className="text-sm">Follow-up hours: {s.followUp.intervalsHours.join(', ')}</p>
            <p className="text-sm">WhatsApp updates: {s.notifications.whatsappEnabled ? 'on' : 'off'} · SMS fallback: {s.notifications.smsFallback ? 'on' : 'off'}</p>
            <Btn onClick={async () => {
              try {
                await staffBharosa('/bharosa/settings', getToken, { method: 'PATCH', body: { verification: { callAfterCreate: !s.verification.callAfterCreate } } })
                await qc.invalidateQueries({ queryKey: ['bharosa', 'settings'] })
              } catch (err) { setError(errText(err)) }
            }}>Toggle verification call</Btn>
          </Card>
        )}
      </div>
    </div>
  )
}

export function BharosaJobsPage() {
  const getToken = useStaff()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['bharosa', 'jobs'],
    queryFn: () => staffBharosa<{ jobs: { id: string; job_type: string; status: string; last_error: string | null; attempts: number }[] }>('/bharosa/jobs?limit=40', getToken),
  })
  return (
    <div>
      <PageHeader title="Bharosa jobs" subtitle="Background work: emails, follow-ups, feeds, citizen alerts." />
      <div className="p-4 sm:p-8 max-w-3xl space-y-2">
        {q.isError && <Notice tone="error">{errText(q.error)}</Notice>}
        {(q.data?.jobs ?? []).map((j) => (
          <div key={j.id} className="flex justify-between gap-2 text-sm">
            <span>{j.job_type} · {j.status}{j.last_error ? ` · ${j.last_error}` : ''}</span>
            {(j.status === 'dead' || j.status === 'failed') && (
              <button type="button" className="text-xs" onClick={() => staffBharosa(`/bharosa/jobs/${j.id}/retry`, getToken, { method: 'POST', body: {} }).then(() => qc.invalidateQueries({ queryKey: ['bharosa', 'jobs'] }))}>Retry</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
