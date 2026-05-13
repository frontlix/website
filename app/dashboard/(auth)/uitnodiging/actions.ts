'use server'

import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export type UitnodigingState = { error?: string; redirectTo?: string }

/**
 * Een uitnodigingslink vanuit Supabase Auth loopt naar
 * /uitnodiging?code=... . Supabase verwerkt de code automatisch (cookies)
 * via dezelfde flow als wachtwoord-reset. Hier vraagt de uitgenodigde
 * medewerker zijn wachtwoord in te stellen — daarna is hij ingelogd
 * en sturen we 'm naar /leads.
 */
export async function uitnodigingAction(
  _prev: UitnodigingState,
  formData: FormData
): Promise<UitnodigingState> {
  const nieuw = String(formData.get('nieuw') ?? '')
  const herhaal = String(formData.get('herhaal') ?? '')

  if (nieuw.length < 8) return { error: 'Kies een wachtwoord van minimaal 8 karakters.' }
  if (nieuw !== herhaal) return { error: 'De twee wachtwoorden komen niet overeen.' }

  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Uitnodigingslink ongeldig of verlopen. Vraag een nieuwe uitnodiging aan je werkruimte-beheerder.' }
  }

  const { error } = await supabase.auth.updateUser({ password: nieuw })
  if (error) return { error: error.message }

  return { redirectTo: '/leads' }
}
