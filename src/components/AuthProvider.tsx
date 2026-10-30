import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from '../lib/auth-context.ts'
import { supabase } from '../lib/supabase.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabase !== null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'This app is not connected to Supabase yet.'
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (!error) return null
    if (error.message === 'Invalid login credentials') {
      return 'Email or password is incorrect.'
    }
    return error.message
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: supabase !== null,
      signIn,
      signOut,
    }),
    [loading, session, signIn, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
