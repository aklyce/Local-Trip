// Provides optional Supabase email/password authentication and wires cloudSync on login/logout.
import type { User } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AuthContext } from './authContext'
import { clearOnSignOut, registerCloudSyncHooks, syncOnSignIn } from './cloudSync'
import { supabase } from './supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const lastUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    registerCloudSyncHooks()

    let mounted = true
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const nextUser = data.session?.user ?? null
      setUser(nextUser)
      if (nextUser && lastUserId.current !== nextUser.id) {
        lastUserId.current = nextUser.id
        await syncOnSignIn(nextUser.id)
      }
      if (mounted) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      if (nextUser && lastUserId.current !== nextUser.id) {
        lastUserId.current = nextUser.id
        void syncOnSignIn(nextUser.id)
      } else if (!nextUser && event === 'SIGNED_OUT' && lastUserId.current !== null) {
        lastUserId.current = null
        void clearOnSignOut()
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!supabase) return 'Account sync is not configured.'
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return error.message
    if (data.user && lastUserId.current !== data.user.id) {
      lastUserId.current = data.user.id
      await syncOnSignIn(data.user.id)
    }
    return null
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!supabase) return 'Account sync is not configured.'
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error) return error.message
    if (!data.session) {
      return 'Account created! Please check your email to confirm, or ask the admin to disable email confirmation.'
    }
    if (data.user && lastUserId.current !== data.user.id) {
      lastUserId.current = data.user.id
      await syncOnSignIn(data.user.id)
    }
    return null
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    lastUserId.current = null
    setUser(null)
    await clearOnSignOut()
    try {
      await Promise.race([
        supabase?.auth.signOut({ scope: 'local' }),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ])
    } catch {
      // Ignore network/lock errors when clearing the local session.
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        enabled: Boolean(supabase),
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
