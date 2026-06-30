'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

/**
 * Server action voor het instellen / wissen van het maand-omzetdoel
 * (`tenant_settings.omzet_doel_maand`). NULL = geen doel ingesteld; de
 * Hero KPI goal-ring op /dashboard/overzicht (mobile) toont in dat geval
 * een placeholder met CTA naar deze pagina.
 *
 * Auth: alleen approved dashboard-users. Schrijven gebeurt via service-role
 * omdat `tenant_settings` geen UPDATE-policy heeft voor dashboard-users
 * (zelfde patroon als saveTenantBase / setDailyDigestTijdAction).
 *
 * Multitenant: de update wordt gescoped op de EIGEN tenant van de ingelogde
 * user (profile.tenant_id) i.p.v. de "enige" rij (.limit(1)). Voor SS (één
 * tenant) is het gedrag identiek.
 */
export type SaveOmzetDoelResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string }

export async function saveOmzetDoelMaand(
  value: number | null,
): Promise<SaveOmzetDoelResult> {
  // Validatie: numeric, niet-negatief, of expliciet null (= wissen).
  if (value !== null) {
    if (!Number.isFinite(value)) {
      return { ok: false, error: 'Doel moet een geldig getal zijn.' }
    }
    if (value < 0) {
      return { ok: false, error: 'Doel kan niet negatief zijn.' }
    }
  }

  const { profile } = await requireApprovedUser()
  if (!profile.tenant_id) {
    return { ok: false, error: 'Geen tenant gekoppeld aan deze gebruiker.' }
  }
  const tenantId = profile.tenant_id

  const admin = getDashboardAdmin()

  const { error: updErr } = await admin
    .from('tenant_settings')
    .update({
      omzet_doel_maand: value,
      bijgewerkt_op: new Date().toISOString(),
    })
    .eq('id', tenantId)

  if (updErr) {
    console.error('[saveOmzetDoelMaand] failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/dashboard/instellingen')
  revalidatePath('/dashboard') // overview-route (was '/dashboard/overzicht', bestaat niet)

  return { ok: true, value }
}
