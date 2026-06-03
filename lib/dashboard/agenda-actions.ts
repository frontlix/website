'use server'

// Write-server-actions voor de (mobiele) agenda: een klus afronden en een
// afspraak herplannen. Beide updaten de `leads`-rij via de RLS-client (dezelfde
// aanpak als setDashboardStatus, de leads-tabel heeft een UPDATE-policy voor
// dashboard-users) en revalideren /agenda zodat de lijst meteen klopt.

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type AgendaActionResult = { ok: true } | { ok: false; error: string }

function revalidateAgenda(leadId: string) {
  revalidatePath('/agenda')
  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

/** Markeer de klus/afspraak als afgehandeld (dashboard_status). */
export async function completeAppointment(leadId: string): Promise<AgendaActionResult> {
  if (!leadId.trim()) return { ok: false, error: 'Lead-id ontbreekt.' }

  const supabase = await getDashboardSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const { error } = await supabase
    .from('leads')
    .update({ dashboard_status: 'afgehandeld' })
    .eq('lead_id', leadId)

  if (error) return { ok: false, error: error.message }

  revalidateAgenda(leadId)
  return { ok: true }
}

/** Verzet de afspraak naar een nieuw tijdstip (afspraak_geboekt_op, ISO/UTC). */
export async function rescheduleAppointment(
  leadId: string,
  newIso: string,
): Promise<AgendaActionResult> {
  if (!leadId.trim()) return { ok: false, error: 'Lead-id ontbreekt.' }
  const ms = new Date(newIso).getTime()
  if (!Number.isFinite(ms)) return { ok: false, error: 'Ongeldige datum/tijd.' }

  const supabase = await getDashboardSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const { error } = await supabase
    .from('leads')
    .update({ afspraak_geboekt_op: new Date(ms).toISOString() })
    .eq('lead_id', leadId)

  if (error) return { ok: false, error: error.message }

  revalidateAgenda(leadId)
  return { ok: true }
}
