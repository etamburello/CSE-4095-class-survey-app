import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthStore = {
  session: Session | null
  user: User | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthStore | null>(null)

export function returnPath(state: unknown) {
  if (!state || typeof state !== 'object' || !('from' in state)) {
    return '/dashboard'
  }
  const from = state.from
  if (
    typeof from !== 'string' ||
    !from.startsWith('/') ||
    from.startsWith('//')
  ) {
    return '/dashboard'
  }
  if (from.startsWith('/login')) return '/dashboard'
  return from
}
