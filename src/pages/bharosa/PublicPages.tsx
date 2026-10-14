import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { bharosaFetch } from '@/api/bharosa'
import { useCitizenSession } from './session'
import { Card, Notice, Stepper, errText, type StatusStep } from './ui'

interface Config {
  app_name: string
  languages: string[]
  default_language: string
  categories: { id: string; name: string }[]
  features: { whatsapp_updates: boolean; public_dashboard: boolean; feed: boolean }
}

export function BharosaHome() {
  const { lang } = useCitizenSession()
  const q = useQuery({
    queryKey: ['bharosa', 'config'],
    queryFn: () => bharosaFetch<Config>('/public/config'),
  })
  const te = lang === 'te'
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{te ? 'మీ ఫిర్యాదు, మీ భాషలో' : 'Your complaint, in your language'}</h1>
      <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>
        {te
          ? 'సమస్యను చెప్పండి, ఫోటో పంపండి, స్థితిని ఇక్కడే చూడండి. అధికారికి ఇమెయిల్ పంపే ముందు మీరే ఆమోదిస్తారు.'
          : 'Describe the problem, add proof, and follow it here. You approve the email to the authority before it is sent.'}
      </p>
      {q.isError && <Notice tone="error">{errText(q.error)}</Notice>}
      {q.data && (
        <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
          {q.data.app_name} · {q.data.categories.length} categories
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Link to="/bharosa/new" className="rounded-md px-3 py-2 text-sm font-medium" style={{ background: 'var(--primary)', color: '#fff' }}>
          {te ? 'ఫిర్యాదు చేయండి' : 'File a complaint'}
        </Link>
        <Link to="/bharosa/cases" className="rounded-md px-3 py-2 text-sm" style={{ border: '1px solid var(--canvas-border)' }}>
          {te ? 'నా కేసులు' : 'My cases'}
        </Link>
      </div>
    </div>
  )
}

export function BharosaLogin() {
  const { lang, signIn, setLang } = useCitizenSession()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [sent, setSent] = useState<{ masked: string; dev?: string; wait: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const te = lang === 'te'

  async function request() {
    setBusy(true)
    setError(null)
    try {
      const res = await bharosaFetch<{ masked_phone: string; dev_code?: string; resend_after_seconds: number }>(
        '/public/auth/otp/request',
        { method: 'POST', body: { phone } },
      )
      setSent({ masked: res.masked_phone, dev: res.dev_code, wait: res.resend_after_seconds })
      if (res.dev_code) setCode(res.dev_code)
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await bharosaFetch<{ token: string }>('/public/auth/otp/verify', {
        method: 'POST',
        body: { phone, code, display_name: name || undefined, language: lang },
      })
      signIn(res.token)
      setLang(lang)
      const next = new URLSearchParams(window.location.search).get('next')
      navigate(next || '/bharosa/cases')
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={verify} className="space-y-3 max-w-sm">
      <h1 className="text-xl font-semibold">{te ? 'మొబైల్‌తో లాగిన్' : 'Sign in with mobile'}</h1>
      <input className="w-full rounded-md px-3 py-2 text-sm" style={{ border: '1px solid var(--canvas-border)', background: 'var(--canvas-surface)' }} placeholder={te ? 'మొబైల్ నంబర్' : 'Mobile number'} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="w-full rounded-md px-3 py-2 text-sm" style={{ border: '1px solid var(--canvas-border)', background: 'var(--canvas-surface)' }} placeholder={te ? 'పేరు (ఐచ్ఛికం)' : 'Name (optional)'} value={name} onChange={(e) => setName(e.target.value)} />
      <button type="button" disabled={busy || phone.length < 10} onClick={request} className="text-sm rounded-md px-3 py-2" style={{ border: '1px solid var(--canvas-border)' }}>
        {te ? 'కోడ్ పంపండి' : 'Send code'}
      </button>
      {sent && (
        <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>
          {te ? 'కోడ్ పంపాం' : 'Code sent to'} {sent.masked}
          {sent.dev ? ` · dev ${sent.dev}` : ''}
        </p>
      )}
      <input className="w-full rounded-md px-3 py-2 text-sm tracking-widest" style={{ border: '1px solid var(--canvas-border)', background: 'var(--canvas-surface)' }} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" disabled={busy || code.length < 6} className="rounded-md px-3 py-2 text-sm font-medium" style={{ background: 'var(--primary)', color: '#fff' }}>
        {te ? 'ధృవీకరించండి' : 'Verify'}
      </button>
    </form>
  )
}

export function TrackPage() {
  const { token } = useParams()
  const { lang } = useCitizenSession()
  const q = useQuery({
    queryKey: ['bharosa', 'track', token, lang],
    queryFn: () => bharosaFetch<{ ticket_number: string; title: string | null; status: { label: string; hint: string | null; on_hold: boolean; steps: StatusStep[] }; timeline: { id: string; text: string; at: string }[] }>(`/public/track/${token}?lang=${lang}`),
    enabled: !!token,
  })
  if (q.isLoading) return <p className="text-sm">Loading…</p>
  if (q.isError) return <Notice tone="error">{errText(q.error)}</Notice>
  const d = q.data!
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{d.ticket_number}</h1>
      <p>{d.title}</p>
      <Stepper steps={d.status.steps} onHold={d.status.on_hold} />
      {d.status.hint && <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>{d.status.hint}</p>}
      <ul className="space-y-2">
        {d.timeline.map((e) => (
          <li key={e.id} className="text-sm"><span style={{ color: 'var(--canvas-muted)' }}>{new Date(e.at).toLocaleString()}</span> — {e.text}</li>
        ))}
      </ul>
    </div>
  )
}

export function StatusPage() {
  const { lang } = useCitizenSession()
  const [num, setNum] = useState('')
  const [lookup, setLookup] = useState('')
  const q = useQuery({
    queryKey: ['bharosa', 'status', lookup, lang],
    queryFn: () => bharosaFetch<Record<string, unknown>>(`/public/status/${encodeURIComponent(lookup)}?lang=${lang}`),
    enabled: lookup.length > 3,
  })
  const te = lang === 'te'
  const data = q.data as { ticket_number?: string; details_public?: boolean; title?: string; status?: { label?: string; steps?: StatusStep[]; on_hold?: boolean }; authority_contacted?: boolean } | undefined
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{te ? 'రిఫరెన్స్ నంబర్‌తో చూడండి' : 'Look up by reference number'}</h1>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setLookup(num.trim()) }}>
        <input className="flex-1 rounded-md px-3 py-2 text-sm" style={{ border: '1px solid var(--canvas-border)', background: 'var(--canvas-surface)' }} value={num} onChange={(e) => setNum(e.target.value)} placeholder="DEM-2026-00001" />
        <button className="rounded-md px-3 py-2 text-sm" style={{ background: 'var(--primary)', color: '#fff' }}>{te ? 'చూడండి' : 'Look up'}</button>
      </form>
      {q.isError && <Notice tone="error">{errText(q.error)}</Notice>}
      {data?.ticket_number && (
        <Card>
          <p className="font-medium">{data.ticket_number}</p>
          <p className="text-sm">{data.status?.label}</p>
          {data.details_public ? (
            <>
              <p className="mt-2">{data.title}</p>
              {data.status?.steps && <div className="mt-2"><Stepper steps={data.status.steps} onHold={data.status.on_hold} /></div>}
              <p className="text-xs mt-2" style={{ color: 'var(--canvas-muted)' }}>{data.authority_contacted ? (te ? 'అధికారిని సంప్రదించాం' : 'Authority contacted') : (te ? 'ఇంకా అధికారికి పంపలేదు' : 'Not yet sent to an authority')}</p>
            </>
          ) : (
            <p className="text-sm mt-2" style={{ color: 'var(--canvas-muted)' }}>{te ? 'వివరాలు ప్రైవేట్' : 'Details are private'}</p>
          )}
        </Card>
      )}
    </div>
  )
}

export function PublicDashboard() {
  const { lang } = useCitizenSession()
  const q = useQuery({
    queryKey: ['bharosa', 'stats', lang],
    queryFn: () => bharosaFetch<{
      total_cases: number
      by_status: { code: string; label: string; count: number }[]
      by_category: { category: string | null; total: number; resolved: number }[]
      median_resolution_days: number | null
      authority_emails_sent: number
      authority_response_rate: number | null
      created_last_30_days: number
      resolved_last_30_days: number
    }>(`/public/stats?lang=${lang}`),
  })
  if (q.isLoading) return <p className="text-sm">Loading…</p>
  if (q.isError) return <Notice tone="error">{errText(q.error)}</Notice>
  const s = q.data!
  const max = Math.max(1, ...s.by_status.map((x) => x.count))
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{lang === 'te' ? 'పబ్లిక్ డాష్‌బోర్డ్' : 'Public dashboard'}</h1>
      <div className="grid grid-cols-2 gap-2">
        <Card><p className="text-2xl font-semibold">{s.total_cases}</p><p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{lang === 'te' ? 'మొత్తం' : 'Total cases'}</p></Card>
        <Card><p className="text-2xl font-semibold">{s.authority_emails_sent}</p><p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{lang === 'te' ? 'అధికారి ఇమెయిల్స్' : 'Authority emails'}</p></Card>
        <Card><p className="text-2xl font-semibold">{s.median_resolution_days ?? '—'}</p><p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{lang === 'te' ? 'మధ్యస్థ రోజులు' : 'Median days'}</p></Card>
        <Card><p className="text-2xl font-semibold">{s.authority_response_rate == null ? '—' : `${Math.round(s.authority_response_rate * 100)}%`}</p><p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{lang === 'te' ? 'స్పందన' : 'Reply rate'}</p></Card>
      </div>
      <Card>
        {s.by_status.map((row) => (
          <div key={row.code} className="flex items-center gap-2 text-sm py-1">
            <span className="w-36 truncate">{row.label}</span>
            <span className="h-2 rounded" style={{ width: `${(row.count / max) * 100}%`, background: 'var(--primary)', minWidth: 4 }} />
            <span>{row.count}</span>
          </div>
        ))}
      </Card>
      <p className="text-xs" style={{ color: 'var(--canvas-muted)' }}>{s.created_last_30_days} created · {s.resolved_last_30_days} resolved in 30 days</p>
    </div>
  )
}

interface FeedItem { id: string; title: string; link: string; summary: string | null; image_url: string | null; source_name: string | null; published_at: string | null; pinned: boolean }

export function FeedPage() {
  const { lang } = useCitizenSession()
  const q = useQuery({
    queryKey: ['bharosa', 'feed', lang],
    queryFn: () => bharosaFetch<{ items: FeedItem[] }>(`/public/feed?lang=${lang}`),
  })
  if (q.isLoading) return <p className="text-sm">Loading…</p>
  if (q.isError) return <Notice tone="error">{errText(q.error)}</Notice>
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{lang === 'te' ? 'వార్తలు' : 'Feed'}</h1>
      {q.data!.items.length === 0 && <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>{lang === 'te' ? 'ఇంకా అంశాలు లేవు' : 'No items yet'}</p>}
      {q.data!.items.map((item) => (
        <Card key={item.id}>
          {item.pinned && <p className="text-[10px] uppercase" style={{ color: 'var(--primary)' }}>Pinned</p>}
          <a href={item.link} target="_blank" rel="noreferrer" className="font-medium">{item.title}</a>
          {item.summary && <p className="text-sm mt-1" style={{ color: 'var(--canvas-muted)' }}>{item.summary}</p>}
          <p className="text-xs mt-1" style={{ color: 'var(--canvas-muted)' }}>{item.source_name}</p>
        </Card>
      ))}
    </div>
  )
}
