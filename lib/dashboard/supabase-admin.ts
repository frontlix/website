import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasst RLS — gebruik ALLEEN server-side
 * voor admin-acties zoals het uitnodigen van users (Plan 7) of het
 * inserten van een profile-rij vlak nadat de Auth Hook 'm aanmaakt.
 *
 * NOOIT importeren in een Client Component — dan lekt de service-key
 * naar de browser.
 *
 * We typeren expliciet als `SupabaseClient` (i.p.v. `ReturnType<typeof createClient>`)
 * zodat de default `Database = any` generic correct doorwerkt naar
 * `from(...).upsert(...)` — anders worden Insert-types `never` en breken
 * type-checks op write-operaties.
 */
let _admin: SupabaseClient | null = null

export function getDashboardAdmin(): SupabaseClient {
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
