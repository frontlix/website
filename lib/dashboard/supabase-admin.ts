import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasst RLS — gebruik ALLEEN server-side
 * voor admin-acties zoals het uitnodigen van users (Plan 7) of het
 * inserten van een profile-rij vlak nadat de Auth Hook 'm aanmaakt.
 *
 * NOOIT importeren in een Client Component — dan lekt de service-key
 * naar de browser.
 */
let _admin: ReturnType<typeof createClient> | null = null

export function getDashboardAdmin() {
  if (_admin) return _admin

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY_DASHBOARD

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL_DASHBOARD en SUPABASE_SERVICE_ROLE_KEY_DASHBOARD moeten gezet zijn'
    )
  }

  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _admin
}
