'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client. Gebruik in Client Components, bv. voor
 * realtime channels op /wachtkamer of /leads.
 *
 * Cookies worden automatisch beheerd door @supabase/ssr.
 */
export function createDashboardClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD!
  )
}
