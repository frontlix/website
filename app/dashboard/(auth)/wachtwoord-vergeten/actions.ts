'use server'

import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export type WachtwoordVergetenState = { error?: string; success?: boolean }

/**
 * Stuurt een Supabase magic-link mail naar het opgegeven e-mailadres met
 * een redirect naar /wachtwoord-reset. De mail-template is geconfigureerd
 * in Supabase Studio → Auth → Email Templates → "Reset Password".
 *
 * Geeft expres geen verschil tussen "bestaand account" en "onbekend mailadres"
 * — dat voorkomt enumeratie van gebruikers.
 */
export async function vergetenAction(
  _prev: WachtwoordVergetenState,
  formData: FormData
): Promise<WachtwoordVergetenState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Vul je e-mailadres in.' }

  const supabase = await getDashboardSupabase()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD ?? 'https://app.frontlix.com'

  // redirect_to wijst naar /callback (die wisselt de PKCE-code in voor
  // een sessie) en geeft via ?next= door naar welke pagina daarna komt.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/callback?next=/wachtwoord-reset`,
  })

  // Altijd success retourneren — geen enumeratie van geldige mailadressen.
  return { success: true }
}
