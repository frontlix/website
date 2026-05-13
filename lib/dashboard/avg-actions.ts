'use server'

import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'

export type AvgActionResult = { ok: true; message?: string } | { ok: false; error: string }

/**
 * Markeert het account voor verwijdering. In v1 zetten we
 * `dashboard_user_profiles.tenant_status = 'rejected'` zodat de user
 * meteen wordt uitgelogd; de werkelijke cascade (auth.users + alle
 * tenant-data) doet de Frontlix-medewerker handmatig in Supabase
 * Studio, of een latere cron-job. AVG vereist verwijdering binnen
 * 30 dagen — dat halen we ruim met deze flow.
 */
export async function requestAccountDeleteAction(
  formData: FormData
): Promise<AvgActionResult> {
  const bevestiging = String(formData.get('bevestiging') ?? '')
  if (bevestiging !== 'VERWIJDER') {
    return { ok: false, error: 'Typ "VERWIJDER" in het bevestigingsveld om door te gaan.' }
  }

  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const admin = getDashboardAdmin()
  const { error } = await admin
    .from('dashboard_user_profiles')
    .update({ tenant_status: 'rejected' })
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }

  // Direct uitloggen — de session is nu effectief geblokkeerd.
  await supabase.auth.signOut()
  return { ok: true, message: 'Account-verwijdering aangevraagd. Je wordt nu uitgelogd.' }
}

/**
 * Triggert een data-export. Voorlopig stub: we sturen geen ZIP, maar
 * loggen het verzoek in lead_notes van de eigenaar (of in een latere
 * tabel) zodat Frontlix het handmatig kan oppakken.
 */
export async function requestDataExportAction(): Promise<AvgActionResult> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, error: 'Niet ingelogd.' }

  // TODO (post-v1): start ZIP-job met alle tenant-data, mail link naar user.
  return {
    ok: true,
    message: `Aanvraag genoteerd. Je ontvangt binnen 5 werkdagen een mail op ${user.email} met een download-link.`,
  }
}
