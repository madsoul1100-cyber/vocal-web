import { useEffect, useRef, useState } from 'react'
import { bharosaFetch, getCitizenToken } from '@/api/bharosa'
import { beginRecording, canListen, listenOnce, playSarvam, speakAnswer, stopSpokenAudio, transcribeRecording, voiceIsPlaying } from './guideVoice'
import { Btn, Notice, errText } from './ui'

type GuideLang = 'te' | 'en' | 'hi'

interface GuideContact {
  name: string
  phone?: string
  url?: string
  email?: string
  covers: string
}

interface GuideMessage {
  id: string
  role: 'user' | 'assistant'
  body: string
}

interface GuideCaseChoice {
  key: string
  kind: 'ticket' | 'guide' | 'memory' | 'action'
  id: string
  title: string
  status: string
  status_label?: string
  updated_at?: string
}

interface GuideTurn {
  session_id: string
  language: GuideLang
  reply: string
  spoken?: string
  status: 'open' | 'satisfied' | 'raised'
  problem: { id: string; title: string; mode: string } | null
  contacts: GuideContact[]
  draft: { to: string; subject: string; body: string } | null
  messages: GuideMessage[]
  case_choices?: GuideCaseChoice[]
  focused_case?: { kind: string; id: string; title: string; status: string } | null
}

const SESSION_KEY = 'bharosa_guide_session'
const LANG_KEY = 'bharosa_guide_lang'

const UI = {
  en: {
    title: 'Ask for help',
    sub: 'Type or talk. No login. I answer in text and read it aloud, with the official Telangana steps and the department number.',
    placeholder: 'Type, or tap the mic and talk',
    send: 'Send',
    sending: 'Sending…',
    talk: 'Talk',
    listening: 'Listening… tap again to send',
    stopVoice: 'Stop voice',
    voiceOn: 'Voice answers on',
    voiceOff: 'Voice answers off',
    micDenied: 'Allow the microphone in the browser to talk. You can still type.',
    micMissing: 'This browser cannot hear the microphone. You can still type.',
    helped: 'This helped',
    newChat: 'New chat',
    mail: 'Send this email',
    yourCases: 'Your issues — tap one to continue',
    seeMore: 'See more',
    newProblem: 'New problem',
    langs: { te: 'తెలుగు', en: 'English', hi: 'हिन्दी' },
  },
  te: {
    title: 'సహాయం అడగండి',
    sub: 'టైప్ చేయండి లేదా మాట్లాడండి. లాగిన్ అవసరం లేదు. సమాధానం రాతగా కనిపిస్తుంది, వినిపిస్తుంది కూడా.',
    placeholder: 'టైప్ చేయండి, లేదా మైక్ నొక్కి మాట్లాడండి',
    send: 'పంపండి',
    sending: 'పంపుతున్నాం…',
    talk: 'మాట్లాడండి',
    listening: 'వింటున్నాను… మళ్లీ నొక్కితే పంపుతాం',
    stopVoice: 'ఆపు',
    voiceOn: 'సమాధానం వినిపిస్తుంది',
    voiceOff: 'సమాధానం వినిపించదు',
    micDenied: 'మాట్లాడటానికి బ్రౌజర్‌లో మైక్రోఫోన్ అనుమతి ఇవ్వండి. టైప్ చేయవచ్చు.',
    micMissing: 'ఈ బ్రౌజర్ మైక్ వినలేదు. టైప్ చేయవచ్చు.',
    helped: 'ఇది సరిపోయింది',
    newChat: 'కొత్త చాట్',
    mail: 'ఈ ఇమెయిల్ పంపండి',
    yourCases: 'మీ సమస్యలు — కొనసాగించడానికి నొక్కండి',
    seeMore: 'ఇంకా చూపించు',
    newProblem: 'కొత్త సమస్య',
    langs: { te: 'తెలుగు', en: 'English', hi: 'हिन्दी' },
  },
  hi: {
    title: 'मदद पूछें',
    sub: 'लिखें या बोलें। लॉगिन ज़रूरी नहीं। जवाब लिखा भी दिखेगा और सुनाई भी देगा।',
    placeholder: 'लिखें, या माइक दबाकर बोलें',
    send: 'भेजें',
    sending: 'भेज रहे हैं…',
    talk: 'बोलें',
    listening: 'सुन रहा हूँ… फिर दबाएँ तो भेजेंगे',
    stopVoice: 'रोकें',
    voiceOn: 'जवाब सुनाई देगा',
    voiceOff: 'जवाब नहीं सुनाई देगा',
    micDenied: 'बोलने के लिए ब्राउज़र में माइक्रोफ़ोन की अनुमति दें। लिख भी सकते हैं।',
    micMissing: 'यह ब्राउज़र माइक नहीं सुन पा रहा। लिख सकते हैं।',
    helped: 'यह काफी है',
    newChat: 'नई बात',
    mail: 'यह ईमेल भेजें',
    yourCases: 'आपकी समस्याएँ — जारी रखने के लिए दबाएँ',
    seeMore: 'और दिखाएँ',
    newProblem: 'नई समस्या',
    langs: { te: 'తెలుగు', en: 'English', hi: 'हिन्दी' },
  },
} as const

const STARTERS: Record<GuideLang, string[]> = {
  en: ['Change my Aadhaar mobile number', 'No electricity in my area', 'The road has potholes', 'Sewer is blocked'],
  te: ['ఆధార్ మొబైల్ నంబర్ మార్చాలి', 'మా ప్రాంతంలో కరెంట్ లేదు', 'రోడ్డుపై గుంతలు ఉన్నాయి', 'మురుగు కాలువ బ్లాక్ అయింది'],
  hi: ['आधार का मोबाइल नंबर बदलना है', 'मेरे इलाके में बिजली नहीं है', 'सड़क पर गड्ढे हैं', 'नाली बंद है'],
}

function storedLang(): GuideLang {
  const raw = localStorage.getItem(LANG_KEY)
  return raw === 'en' || raw === 'hi' || raw === 'te' ? raw : 'te'
}

export function GuidePage() {
  const [lang, setLang] = useState<GuideLang>(storedLang)
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY))
  const [messages, setMessages] = useState<GuideMessage[]>([])
  const [contacts, setContacts] = useState<GuideContact[]>([])
  const [draft, setDraft] = useState<GuideTurn['draft']>(null)
  const [status, setStatus] = useState<GuideTurn['status']>('open')
  const [caseChoices, setCaseChoices] = useState<GuideCaseChoice[]>([])
  const [focusedCase, setFocusedCase] = useState<GuideTurn['focused_case']>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const stopListenRef = useRef<(() => void) | null>(null)
  const bootstrappedRef = useRef(false)
  const t = UI[lang]
  const loggedIn = Boolean(getCitizenToken())

  useEffect(() => {
    return () => {
      stopListenRef.current?.()
      stopSpokenAudio()
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setSpeaking(voiceIsPlaying()), 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    bharosaFetch<GuideTurn>(`/public/guide/sessions/${sessionId}`)
      .then((res) => {
        if (cancelled) return
        setMessages(res.messages)
        setDraft(res.draft)
        setStatus(res.status)
        setLang(res.language)
      })
      .catch(() => {
        localStorage.removeItem(SESSION_KEY)
        if (!cancelled) setSessionId(null)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, draft])

  function chooseLang(next: GuideLang) {
    setLang(next)
    localStorage.setItem(LANG_KEY, next)
  }

  function apply(res: GuideTurn) {
    setSessionId(res.session_id)
    localStorage.setItem(SESSION_KEY, res.session_id)
    setMessages(res.messages)
    setContacts(res.contacts)
    setDraft(res.draft)
    setStatus(res.status)
    setLang(res.language)
    setCaseChoices(res.case_choices ?? [])
    setFocusedCase(res.focused_case ?? null)
  }

  async function send(message: string, confirm = false) {
    const value = message.trim()
    if (!value && !confirm) return
    stopSpokenAudio()
    setBusy(true)
    setError(null)
    try {
      const res = await bharosaFetch<GuideTurn>('/public/guide/messages', {
        method: 'POST',
        lang: lang === 'hi' ? undefined : lang,
        token: getCitizenToken(),
        body: { session_id: sessionId, message: value || null, language: lang, confirm_send: confirm },
      })
      apply(res)
      setText('')
      if (voiceOn && res.spoken) {
        const played = await playSarvam(res.spoken, res.language).catch(() => false)
        if (!played) speakAnswer(res.spoken, res.language)
      }
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  /** Logged-in bootstrap: empty turn so Priya can list top cases. */
  async function bootstrapLoggedIn() {
    if (!getCitizenToken() || bootstrappedRef.current || busy) return
    bootstrappedRef.current = true
    stopSpokenAudio()
    setBusy(true)
    setError(null)
    try {
      const res = await bharosaFetch<GuideTurn>('/public/guide/messages', {
        method: 'POST',
        lang: lang === 'hi' ? undefined : lang,
        token: getCitizenToken(),
        body: { session_id: sessionId, message: null, language: lang, confirm_send: false },
      })
      apply(res)
    } catch (err) {
      setError(errText(err))
      bootstrappedRef.current = false
    } finally {
      setBusy(false)
    }
  }

  function pickCase(choice: GuideCaseChoice) {
    if (choice.kind === 'action') {
      void send(choice.id === 'see_more' ? 'see more' : choice.id === 'new_issue' ? '__case:action:new_issue' : choice.title)
      return
    }
    void send(`__case:${choice.kind}:${choice.id}`)
  }

  function startTalk() {
    stopSpokenAudio()
    if (listening) {
      stopListenRef.current?.()
      return
    }
    setError(null)
    const browserListen = () => {
      const session = listenOnce(lang, {
        onPartial: (partial) => setText(partial),
        onError: (code) => setError(code === 'not-allowed' ? t.micDenied : t.micMissing),
      })
      if (!session) {
        setError(t.micDenied)
        return
      }
      setListening(true)
      stopListenRef.current = () => session.rec.stop()
      void session.done.then((said) => {
        setListening(false)
        stopListenRef.current = null
        if (said.trim()) void send(said)
      })
    }
    void (async () => {
      try {
        const recording = await beginRecording()
        setListening(true)
        stopListenRef.current = () => {
          void recording.stop().then(async ({ blob, mime }) => {
            setListening(false)
            stopListenRef.current = null
            try {
              const said = await transcribeRecording(blob, mime, lang)
              setText(said)
              if (said) await send(said)
            } catch {
              browserListen()
            }
          })
        }
      } catch {
        if (canListen()) browserListen()
        else setError(t.micDenied)
      }
    })()
  }

  function restart() {
    stopListenRef.current?.()
    stopSpokenAudio()
    localStorage.removeItem(SESSION_KEY)
    setSessionId(null)
    setMessages([])
    setContacts([])
    setDraft(null)
    setStatus('open')
    setCaseChoices([])
    setFocusedCase(null)
    setText('')
    setListening(false)
    bootstrappedRef.current = false
    if (getCitizenToken()) {
      queueMicrotask(() => void bootstrapLoggedIn())
    }
  }

  useEffect(() => {
    if (!loggedIn) return
    if (messages.length > 0) return
    void bootstrapLoggedIn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn])

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: '70vh' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--canvas-muted)' }}>{t.sub}</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            type="button"
            className="text-xs rounded-full px-2 py-1"
            style={{ border: '1px solid var(--canvas-border)', background: voiceOn ? 'var(--primary)' : 'transparent', color: voiceOn ? '#fff' : 'inherit' }}
            onClick={() => {
              const next = !voiceOn
              setVoiceOn(next)
              if (!next) stopSpokenAudio()
            }}
          >
            {voiceOn ? t.voiceOn : t.voiceOff}
          </button>
          {(['te', 'en', 'hi'] as const).map((code) => (
            <button
              key={code}
              type="button"
              className="text-xs rounded-full px-2 py-1"
              style={{ border: '1px solid var(--canvas-border)', background: lang === code ? 'var(--primary)' : 'transparent', color: lang === code ? '#fff' : 'inherit' }}
              onClick={() => chooseLang(code)}
            >
              {t.langs[code]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 rounded-lg p-3" style={{ background: 'var(--canvas-surface)', border: '1px solid var(--canvas-border)', minHeight: 360 }}>
        {messages.length === 0 && caseChoices.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {STARTERS[lang].map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={busy}
                className="text-sm rounded-full px-3 py-1 text-left"
                style={{ border: '1px solid var(--canvas-border)' }}
                onClick={() => send(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[90%] whitespace-pre-wrap text-sm rounded-lg px-3 py-2 ${m.role === 'user' ? 'ml-auto' : ''}`} style={{ background: m.role === 'user' ? 'var(--primary)' : 'var(--canvas-bg)', color: m.role === 'user' ? '#fff' : 'inherit' }}>
            {m.body}
          </div>
        ))}
        {caseChoices.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium" style={{ color: 'var(--canvas-muted)' }}>{t.yourCases}</div>
            <div className="flex flex-col gap-2">
              {caseChoices.map((c) => (
                <button
                  key={`${c.kind}:${c.id}`}
                  type="button"
                  disabled={busy}
                  className="text-left text-sm rounded-lg px-3 py-2"
                  style={{
                    border: '1px solid var(--canvas-border)',
                    background: c.kind === 'action' ? 'transparent' : 'var(--canvas-bg)',
                  }}
                  onClick={() => pickCase(c)}
                >
                  {c.kind === 'action' ? (
                    <span>{c.id === 'see_more' ? t.seeMore : c.id === 'new_issue' ? t.newProblem : c.title}</span>
                  ) : (
                    <>
                      <span className="font-medium">{c.key}. {c.title}</span>
                      <span className="block text-xs mt-0.5" style={{ color: 'var(--canvas-muted)' }}>
                        {c.status_label || c.status}
                        {c.updated_at ? ` · ${c.updated_at}` : ''}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {focusedCase && (
          <div className="text-xs rounded-md px-2 py-1" style={{ background: 'var(--canvas-bg)', color: 'var(--canvas-muted)' }}>
            Continuing: {focusedCase.title}
          </div>
        )}
        {contacts.length > 0 && (
          <div className="text-xs space-y-1" style={{ color: 'var(--canvas-muted)' }}>
            {contacts.map((c) => (
              <div key={c.name}>
                {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
                {c.phone && c.url ? ' · ' : ''}
                {c.url && <a href={c.url} target="_blank" rel="noreferrer">{c.url.replace(/^https?:\/\//, '')}</a>}
              </div>
            ))}
          </div>
        )}
        {draft && status !== 'raised' && (
          <div className="rounded-md p-3 text-sm space-y-2" style={{ border: '1px solid var(--canvas-border)' }}>
            <div className="font-medium">{draft.subject}</div>
            <div style={{ color: 'var(--canvas-muted)' }}>To {draft.to}</div>
            <pre className="whitespace-pre-wrap text-xs">{draft.body}</pre>
            <Btn disabled={busy} onClick={() => send('', true)}>{t.mail}</Btn>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          void send(text)
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? t.listening : t.placeholder}
          className="flex-1 min-w-0 rounded-md px-3 py-2 text-sm"
          style={{ border: '1px solid var(--canvas-border)', background: 'var(--canvas-surface)' }}
          disabled={busy || status === 'satisfied'}
        />
        <div className="flex gap-2">
          <Btn kind={listening ? 'danger' : 'ghost'} disabled={busy || status === 'satisfied'} onClick={startTalk}>
            {listening ? t.stopVoice : t.talk}
          </Btn>
          <Btn type="submit" disabled={busy || listening || !text.trim() || status === 'satisfied'}>{busy ? t.sending : t.send}</Btn>
        </div>
      </form>
      {speaking && (
        <Btn kind="ghost" onClick={() => { stopSpokenAudio(); setSpeaking(false) }}>{t.stopVoice}</Btn>
      )}
      <div className="flex gap-2">
        {status === 'open' && messages.length > 0 && (
          <Btn kind="ghost" disabled={busy} onClick={() => send(t.helped)}>{t.helped}</Btn>
        )}
        {messages.length > 0 && <Btn kind="ghost" disabled={busy} onClick={restart}>{t.newChat}</Btn>}
      </div>
    </div>
  )
}
