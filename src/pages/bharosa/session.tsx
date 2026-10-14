import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { Lang } from '@/api/bharosa'
import { getCitizenToken, setCitizenToken } from '@/api/bharosa'

interface CitizenSession {
  token: string | null
  lang: Lang
  setLang: (lang: Lang) => void
  signIn: (token: string) => void
  signOut: () => void
}

const Ctx = createContext<CitizenSession | null>(null)
const LANG_KEY = 'bharosa_lang'

export function CitizenSessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getCitizenToken())
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'te'))

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(LANG_KEY, next)
    setLangState(next)
  }, [])

  const signIn = useCallback((next: string) => {
    setCitizenToken(next)
    setToken(next)
  }, [])

  const signOut = useCallback(() => {
    setCitizenToken(null)
    setToken(null)
  }, [])

  const value = useMemo(() => ({ token, lang, setLang, signIn, signOut }), [token, lang, setLang, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCitizenSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Citizen session missing')
  return ctx
}
