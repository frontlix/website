'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type OnboardingResult = { ok: true } | { ok: false; error: string }

/**
 * Markeert de eerste-keer-overlay als voltooid voor de huidige user.
 * Wordt door OnboardingWizard.tsx aangeroepen op de "Klaar"-stap én
 * via "Sla over" rechtsboven.
 */
export async function completeOnboardingAction(): Promise<OnboardingResult> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const { error } = await supabase
    .from('dashboard_user_profiles')
    .update({ onboarding_voltooid_op: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  return { ok: true }
}
