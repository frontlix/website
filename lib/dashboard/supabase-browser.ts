'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client met cookie-session voor Realtime.
 * Gebruikt dezelfde env-vars als supabase-server.ts, RLS-policies blijven
 * van kracht omdat de session-cookie wordt meegestuurd.
 *
 * Niet bedoeld voor data-fetching, gebruik daarvoor server components
 * en getDashboardSupabase. Deze client is specifiek voor Realtime channels.
 */
export function getDashboardSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD!
  )
}
