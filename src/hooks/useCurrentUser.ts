import { useAuth } from '@/contexts/AuthContext'

/** Current staff user from backend JWT session. */
export function useCurrentUser() {
  const { user, isLoading, refreshUser } = useAuth()
  return {
    data: user,
    isLoading,
    error: null,
    refetch: refreshUser,
  }
}
