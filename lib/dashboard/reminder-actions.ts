'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Direct opslaan van het aantal dagen voor reminder N (1, 2 of 3) op de
 * tenant_settings-rij. Dit is alléén scheduling — geen Meta-goedkeuring
 * nodig. De bot leest `tenant_settings.reminder_dag_N` en stuurt dan op
 * dag N na de offerte.
 *
 * Voor het wijzigen van de tekst zelf gebruikt de owner `requestTemplateChange`
 * in template-actions.ts (aanvraag → Slack → Meta-approval flow).
 *
 * Auth: alleen approved dashboard-users. Schrijven via service-role omdat
 * `tenant_settings` geen UPDATE-policy heeft voor dashboard-users (zelfde
 * pattern als `saveTenantBase` in tenant-base-actions.ts).
 */
export async function updateReminderDays(
  num: 1 | 2 | 3,
  days: number,
): Promise<ActionResult> {
  if (![1, 2, 3].includes(num)) {
    return { ok: false, error: 'Ongeldig reminder-nummer.' }
  }
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    return { ok: false, error: 'Dagen moet tussen 1 en 90 zijn.' }
  }

  // Auth-check via user-client (RLS-gerelateerd).
  const supabase = await getDashboardSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  // Schrijven via admin-client (zoals saveTenantBase).
  const admin = getDashboardAdmin()
  const { data: existing, error: fetchErr } = await admin
    .from('tenant_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchErr || !existing) {
    return { ok: false, error: 'Geen tenant_settings rij gevonden om te updaten.' }
  }

  const column = `reminder_dag_${num}` as const
  const { error: updErr } = await admin
    .from('tenant_settings')
    .update({ [column]: days })
    .eq('id', existing.id)

  if (updErr) {
    console.error('[updateReminderDays] failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}
