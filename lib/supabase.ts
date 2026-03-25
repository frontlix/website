import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-side Supabase client met service_role key
// Alleen gebruiken in API routes / server components — nooit importeren in client components

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables zijn niet geconfigureerd.')
    }

    _supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabase
}
