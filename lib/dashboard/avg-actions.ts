'use server'

import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

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

  // Ingelogd EN approved. Een reeds-rejected user is effectief al geblokkeerd
  // en hoeft niet nogmaals te verwijderen; requireApprovedUser() redirect 'm
  // dan naar /wachtkamer i.p.v. de service-role-update opnieuw te draaien.
  const { user } = await requireApprovedUser()

  // signOut() na de update — daarom hebben we óók de SSR-cookie-client nodig.
  const supabase = await getDashboardSupabase()

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
 * Registreert een data-export-aanvraag. Let op: deze action verstuurt
 * (nog) GÉÉN automatische mail en zet geen ZIP-job klaar — de afhandeling
 * gebeurt handmatig door Frontlix. De message belooft daarom bewust geen
 * automatische levering binnen X dagen.
 *
 * TODO (Optie B, aparte beslissing): export-aanvragen in een eigen tabel
 * loggen + een ZIP-job starten en de download-link mailen.
 */
export async function requestDataExportAction(): Promise<AvgActionResult> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, error: 'Niet ingelogd.' }

  return {
    ok: true,
    message:
      'Je export-aanvraag is doorgegeven aan Frontlix. We nemen contact met je op zodra je data klaarstaat.',
  }
}
