'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

export type MeldingenActionResult = { ok: true } | { ok: false; error: string }

/**
 * Zet de "Klus afronden"-actie aan/uit (tenant_settings.klus_status_melden).
 * Wanneer aan toont het Overzicht na een voorbije afspraak een herinnering in
 * "Eerst dit doen" om de klus af te ronden of als geblokkeerd te markeren.
 *
 * Auth: alleen approved dashboard-users. Schrijven via service-role omdat
 * `tenant_settings` geen UPDATE-policy heeft voor dashboard-users (zelfde
 * pattern als updateReminderDays / saveTenantBase).
 */
export async function setKlusStatusMelden(
  enabled: boolean,
): Promise<MeldingenActionResult> {
  // Auth-check: ingelogd EN approved. Anders kan een pending/rejected user via
  // de service-role-write hieronder de ontbrekende UPDATE-policy omzeilen.
  await requireApprovedUser()

  const admin = getDashboardAdmin()
  const { data: existing, error: fetchErr } = await admin
    .from('tenant_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchErr || !existing) {
    return { ok: false, error: 'Geen tenant_settings rij gevonden om te updaten.' }
  }

  const { error: updErr } = await admin
    .from('tenant_settings')
    .update({ klus_status_melden: enabled })
    .eq('id', existing.id)

  if (updErr) {
    console.error('[setKlusStatusMelden] failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}
