import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  getCurrentUser,
  getCurrentUserProfile,
  type DashboardUserProfile,
} from './auth'

/**
 * Vereist dat de huidige request van een ingelogde, approved user komt.
 * Gebruik in Server Components / Server Actions die alleen voor approved
 * users beschikbaar moeten zijn (bv. /leads, /leads/[id]).
 *
 * - Niet ingelogd → redirect('/login')
 * - Ingelogd maar geen profile-rij of tenant_status != 'approved'
 *   → redirect('/wachtkamer')
 *
 * Vervangt het inline auth-check patroon dat Plan 3 in
 * app/dashboard/(app)/layout.tsx gebruikte.
 */
export async function requireApprovedUser(): Promise<{
  user: User
  profile: DashboardUserProfile
}> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') {
    redirect('/wachtkamer')
  }

  return { user, profile }
}
