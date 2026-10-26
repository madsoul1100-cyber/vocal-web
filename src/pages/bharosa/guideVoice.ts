import { BHAROSA_BASE, ORG_SLUG } from '@/api/bharosa'

export type VoiceLang = 'te' | 'en' | 'hi'

const BCP: Record<VoiceLang, string> = {
  te: 'te-IN',
  hi: 'hi-IN',
  en: 'en-IN',
}

interface RecResult {
  isFinal: boolean
  0: { transcript: string }
}

interface RecEvent {
  resultIndex: number
  results: ArrayLike<RecResult>
}

interface Rec extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: RecEvent) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

type RecCtor = new () => Rec

function recognitionCtor(): RecCtor | null {
  const w = window as Window & { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function canListen(): boolean {
  return recognitionCtor() !== null
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel()
}

function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() ?? []
  const code = BCP[lang].toLowerCase()
  const prefix = lang
  return (
    voices.find((voice) => voice.lang.toLowerCase() === code) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((voice) => /telugu|hindi|india/i.test(voice.name) && voice.lang.toLowerCase().startsWith(prefix)) ||
    null
  )
}

/** Read a short answer aloud. Long replies are split so the browser does not cut them off. */
export function speakAnswer(text: string, lang: VoiceLang): void {
  if (!text.trim() || !canSpeak()) return
  stopSpeaking()
  const chunks = text
    .split(/(?<=[.!?।])\s+/)
    .map((part) => part.replace(/:\s*$/, '').trim())
    .filter((part) => part.replace(/[^\p{L}\p{N}]+/gu, '').length > 2)
  const pieces = chunks.length ? chunks : [text.trim()]
  for (const piece of pieces) {
    const utterance = new SpeechSynthesisUtterance(piece)
    utterance.lang = BCP[lang]
    const voice = pickVoice(lang)
    if (voice) utterance.voice = voice
    utterance.rate = lang === 'en' ? 1 : 0.95
    window.speechSynthesis.speak(utterance)
  }
}

/**
 * One spoken turn. Interim text updates the box; the final transcript is returned
 * when the person pauses or taps stop.
 */
export function listenOnce(
  lang: VoiceLang,
  handlers: {
    onPartial: (text: string) => void
    onError: (code: string) => void
  },
): { rec: Rec; done: Promise<string> } | null {
  const Ctor = recognitionCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = BCP[lang]
  rec.continuous = false
  rec.interimResults = true
  let finalText = ''
  let latest = ''
  const done = new Promise<string>((resolve) => {
    rec.onresult = (ev) => {
      let interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const bit = ev.results[i][0]?.transcript ?? ''
        if (ev.results[i].isFinal) finalText = `${finalText} ${bit}`.trim()
        else interim += bit
      }
      latest = `${finalText} ${interim}`.trim()
      handlers.onPartial(latest)
    }
    rec.onerror = (ev) => {
      if (ev.error !== 'aborted' && ev.error !== 'no-speech') handlers.onError(ev.error)
    }
    rec.onend = () => resolve((finalText || latest).trim())
  })
  rec.start()
  return { rec, done }
}

let currentAudio: HTMLAudioElement | null = null

export function voiceIsPlaying(): boolean {
  return Boolean(currentAudio && !currentAudio.paused) || Boolean(window.speechSynthesis?.speaking)
}

export function stopSpokenAudio(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  stopSpeaking()
}

/** Record until stop(). This is the same idea as the voice agent: capture speech, then transcribe it. */
export async function beginRecording(): Promise<{ stop: () => Promise<{ blob: Blob; mime: string }> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4'
  const recorder = new MediaRecorder(stream, { mimeType: mime })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }
  recorder.start()
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop())
          resolve({ blob: new Blob(chunks, { type: mime }), mime })
        }
        if (recorder.state !== 'inactive') recorder.stop()
        else {
          stream.getTracks().forEach((track) => track.stop())
          resolve({ blob: new Blob(chunks, { type: mime }), mime })
        }
      }),
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function transcribeRecording(blob: Blob, mime: string, lang: VoiceLang): Promise<string> {
  const res = await fetch(`${BHAROSA_BASE}/public/guide/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Slug': ORG_SLUG },
    body: JSON.stringify({ audio_base64: await blobToBase64(blob), mime, language: lang }),
  })
  const data = (await res.json().catch(() => ({}))) as { transcript?: string; error?: string }
  if (!res.ok) throw new Error(data.error || 'Could not transcribe')
  return (data.transcript || '').trim()
}

/** Play the answer with Sarvam, the same voice engine as the working agent. */
export async function playSarvam(text: string, lang: VoiceLang): Promise<boolean> {
  stopSpokenAudio()
  const res = await fetch(`${BHAROSA_BASE}/public/guide/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Slug': ORG_SLUG },
    body: JSON.stringify({ text, language: lang }),
  })
  if (!res.ok) return false
  const blob = await res.blob()
  if (!blob.size) return false
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  currentAudio = audio
  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null
    URL.revokeObjectURL(url)
  }
  await audio.play()
  return true
}
