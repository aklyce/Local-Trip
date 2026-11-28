// Auth context separated from AuthProvider component to satisfy react-refresh lint rules.
import type { User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export interface AuthContextValue {
  enabled: boolean
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  enabled: false,
  user: null,
  loading: false,
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
