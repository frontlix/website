'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

/**
 * Server action voor het opslaan van de Beschikbaarheid (werkdagen + tijden)
 * op `tenant_settings.beschikbaarheid`. De v2 Instellingen-pagina
 * (Beschikbaarheid-sectie) gebruikt dit via de globale "Opslaan"-knop. De
 * lead-automation/Surface-bot leest dezelfde kolom om alleen binnen de
 * ingestelde dagen/tijden afspraken voor te stellen (zie
 * lead-automation/services/google_calendar.py).
 *
 * Opslagvorm = de DaySlot[] zoals het paneel die heeft (array van 7, Ma..Zo):
 *   [{ dag, aan, van: "HH:MM", tot: "HH:MM" }]
 *
 * Auth + write-patroon: identiek aan updateBedrijfsprofiel / saveTenantBase.
 * requireApprovedUser() gate + service-role admin-write (tenant_settings heeft
 * geen UPDATE-policy voor dashboard-users).
 */
export interface DagBeschikbaarheid {
  dag: string
  aan: boolean
  van: string
  tot: string
}

export type SaveBeschikbaarheidResult = { ok: true } | { ok: false; error: string }

const TIJD = /^([01]\d|2[0-3]):[0-5]\d$/

export async function saveBeschikbaarheid(
  dagen: DagBeschikbaarheid[],
): Promise<SaveBeschikbaarheidResult> {
  await requireApprovedUser()

  if (!Array.isArray(dagen) || dagen.length !== 7) {
    return { ok: false, error: 'Beschikbaarheid moet 7 dagen bevatten (Ma..Zo).' }
  }
  for (const d of dagen) {
    if (typeof d.aan !== 'boolean' || !TIJD.test(d.van) || !TIJD.test(d.tot)) {
      return { ok: false, error: 'Ongeldige tijd in de beschikbaarheid (verwacht HH:MM).' }
    }
    if (d.aan && d.tot <= d.van) {
      return { ok: false, error: `Bij ${d.dag} moet de eindtijd na de begintijd liggen.` }
    }
  }

  const admin = getDashboardAdmin()

  // Single-tenant setup: pak de eerste (en enige) tenant_settings rij.
  const { data: existing, error: fetchErr } = await admin
    .from('tenant_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchErr || !existing) {
    return { ok: false, error: 'Geen tenant_settings rij gevonden om te updaten.' }
  }

  // `beschikbaarheid` is een nieuwe kolom (migratie 049); cast omdat de
  // gegenereerde types die pas na regen kennen.
  const payload = {
    beschikbaarheid: dagen,
    bijgewerkt_op: new Date().toISOString(),
  } as never

  const { error: updErr } = await admin
    .from('tenant_settings')
    .update(payload)
    .eq('id', existing.id)

  if (updErr) {
    console.error('[saveBeschikbaarheid] failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/dashboard/instellingen')
  revalidatePath('/dashboard/v2/instellingen')

  return { ok: true }
}
