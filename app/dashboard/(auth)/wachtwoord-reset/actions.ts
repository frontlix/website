'use server'

import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export type WachtwoordResetState = { error?: string; redirectTo?: string }

/**
 * Werkt het wachtwoord bij voor de huidige (recovery-)sessie. Supabase
 * heeft de recovery-token al verwerkt via /wachtwoord-reset?code=... door
 * de session-cookies te zetten, we hoeven hier alleen `updateUser` te
 * roepen met het nieuwe wachtwoord.
 */
export async function resetAction(
  _prev: WachtwoordResetState,
  formData: FormData
): Promise<WachtwoordResetState> {
  const nieuw = String(formData.get('nieuw') ?? '')
  const herhaal = String(formData.get('herhaal') ?? '')

  if (nieuw.length < 8) {
    return { error: 'Kies een wachtwoord van minimaal 8 karakters.' }
  }
  if (nieuw !== herhaal) {
    return { error: 'De twee wachtwoorden komen niet overeen.' }
  }

  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Reset-link ongeldig of verlopen. Vraag opnieuw een mail aan.' }
  }

  const { error } = await supabase.auth.updateUser({ password: nieuw })
  if (error) return { error: error.message }

  return { redirectTo: '/leads' }
}
