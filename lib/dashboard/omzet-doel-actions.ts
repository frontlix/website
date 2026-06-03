'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'

/**
 * Server action voor het instellen / wissen van het maand-omzetdoel
 * (`tenant_settings.omzet_doel_maand`). NULL = geen doel ingesteld; de
 * Hero KPI goal-ring op /dashboard/overzicht (mobile) toont in dat geval
 * een placeholder met CTA naar deze pagina.
 *
 * Auth: alleen approved dashboard-users. Schrijven gebeurt via service-role
 * omdat `tenant_settings` geen UPDATE-policy heeft voor dashboard-users
 * (zelfde patroon als saveTenantBase / setDailyDigestTijdAction).
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

  const userSupabase = await getDashboardSupabase()
  const {
    data: { user },
  } = await userSupabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const admin = getDashboardAdmin()

  // Pak de eerste (en enige) tenant_settings rij, single-tenant setup.
  const { data: existing, error: fetchErr } = await admin
    .from('tenant_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchErr || !existing) {
    return {
      ok: false,
      error: 'Geen tenant_settings rij gevonden om te updaten.',
    }
  }

  const { error: updErr } = await admin
    .from('tenant_settings')
    .update({
      omzet_doel_maand: value,
      bijgewerkt_op: new Date().toISOString(),
    })
    .eq('id', existing.id)

  if (updErr) {
    console.error('[saveOmzetDoelMaand] failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/dashboard/instellingen')
  revalidatePath('/dashboard/overzicht')

  return { ok: true, value }
}
