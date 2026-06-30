import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { getDashboardSupabase } from './supabase-server'

export interface DashboardUserProfile {
  user_id: string
  tenant_status: 'pending' | 'approved' | 'rejected'
  bedrijfsnaam: string | null
  is_owner: boolean
  onboarding_voltooid_op: string | null
  tenant_id: string | null
  platform_role: 'tenant' | 'superadmin'
}

/**
 * Retourneert de huidig ingelogde Supabase-Auth user, of null als er geen
 * sessie is. Faalt nooit met een exception, RLS / network errors worden
 * als "niet ingelogd" behandeld zodat aanroepers altijd kunnen doorgaan
 * met een redirect-naar-login fallback.
 */
// React cache(): dedupliceert binnen één request-render. Layout, shell en
// pagina roepen dit (via v2Session) allemaal aan, dus zonder cache draait de
// JWT-validatie ~6x per paginalading. cache() is request-scoped (geen
// cross-request/-tenant lek), dus precies veilig hiervoor.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user ?? null
})

/**
 * Haalt de dashboard_user_profiles-rij voor de huidige user op. Retourneert
 * null als (a) niet ingelogd of (b) profile-rij ontbreekt, dat laatste is
 * een data-integriteit issue (de Auth Hook trigger zou 'm moeten hebben
 * gemaakt) en wordt als geen-toegang behandeld.
 */
export const getCurrentUserProfile = cache(
  async (): Promise<DashboardUserProfile | null> => {
    const user = await getCurrentUser()
    if (!user) return null

    const supabase = await getDashboardSupabase()
    const { data } = await supabase
      .from('dashboard_user_profiles')
      .select('user_id, tenant_status, bedrijfsnaam, is_owner, onboarding_voltooid_op, tenant_id, platform_role')
      .eq('user_id', user.id)
      .maybeSingle()

    return (data as DashboardUserProfile | null) ?? null
  },
)
