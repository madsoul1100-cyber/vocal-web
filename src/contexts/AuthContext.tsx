import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch, ApiError, type VocalUser } from '@/api/client'
import { getStoredToken, setStoredToken } from '@/lib/tokenStorage'

interface LoginResult {
  token: string
  user: VocalUser
}

interface AuthContextValue {
  user: VocalUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  getAccessToken: () => Promise<string | null>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const baseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/v1'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VocalUser | null>(null)
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [isLoading, setIsLoading] = useState(true)

  const getAccessToken = useCallback(async () => token, [token])

  const refreshUser = useCallback(async () => {
    const currentToken = token ?? getStoredToken()
    if (!currentToken) {
      setUser(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const me = await apiFetch<VocalUser>('/auth/me', {
        getToken: async () => currentToken,
      })
      setUser(me)
    } catch {
      setUser(null)
      setToken(null)
      setStoredToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    })

    const text = await res.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: text }
      }
    }

    if (!res.ok) {
      const msg =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error: string }).error)
          : res.statusText
      throw new ApiError(msg, res.status)
    }

    const { token: accessToken, user: loggedInUser } = data as LoginResult
    setStoredToken(accessToken)
    setToken(accessToken)
    setUser(loggedInUser)
    setIsLoading(false)
  }, [])

  const logout = useCallback(() => {
    setStoredToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      getAccessToken,
      refreshUser,
    }),
    [user, isLoading, login, logout, getAccessToken, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
