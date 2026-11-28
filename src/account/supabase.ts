// Isolated Supabase client for optional per-user auth and My Trips cloud sync.
// Returns null when VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing so the
// core offline-first app continues working with zero errors.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
