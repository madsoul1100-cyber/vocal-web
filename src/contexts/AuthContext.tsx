import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react'
import { apiFetch, type VocalUser } from '@/api/client'

interface AuthContextValue {
  user: VocalUser | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => void
  getAccessToken: () => Promise<string | null>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth()
  const { signOut } = useClerk()
  const [user, setUser] = useState<VocalUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getAccessToken = useCallback(async () => {
    if (!isSignedIn) return null
    return getToken()
  }, [isSignedIn, getToken])

  const refreshUser = useCallback(async () => {
    if (!isLoaded) return
    if (!isSignedIn) {
      setUser(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const me = await apiFetch<VocalUser>('/auth/me', { getToken: getAccessToken })
      setUser(me)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isSignedIn, getAccessToken])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const logout = useCallback(() => {
    void signOut()
    setUser(null)
  }, [signOut])

  const value = useMemo(
    () => ({
      user,
      isLoading: !isLoaded || isLoading,
      isAuthenticated: Boolean(isSignedIn && user),
      logout,
      getAccessToken,
      refreshUser,
    }),
    [user, isLoaded, isLoading, isSignedIn, logout, getAccessToken, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
