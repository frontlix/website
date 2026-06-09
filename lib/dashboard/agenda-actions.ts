'use server'

// Write-server-actions voor de (mobiele) agenda: een klus afronden en een
// afspraak herplannen. Beide updaten de `leads`-rij via de RLS-client (dezelfde
// aanpak als setDashboardStatus, de leads-tabel heeft een UPDATE-policy voor
// dashboard-users) en revalideren /agenda zodat de lijst meteen klopt.

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { toAmsterdamDayKey } from './calendar'
import { callBotLeadApi, botApiError } from './bot-api-client'

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

/**
 * Verzet de afspraak naar een nieuw tijdstip. Loopt via de bot-API, zodat het
 * langs exact hetzelfde pad gaat als een verzetting via WhatsApp/web:
 *  - het Google-event wordt meeverzet (oud event verwijderd, nieuw aangemaakt),
 *  - de klant krijgt een bevestiging (WhatsApp/email, best-effort),
 *  - afspraak_datum + afspraak_starttijd worden in Supabase bijgewerkt.
 *
 * De UI geeft een ISO-tijdstip door; de bot verwacht datum (YYYY-MM-DD) +
 * starttijd (HH:MM) in Amsterdam-tijd, dus we zetten dat hier om.
 */
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

  const datum = toAmsterdamDayKey(new Date(ms).toISOString()) // YYYY-MM-DD
  const starttijd = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms)) // HH:MM

  const result = await callBotLeadApi(leadId, 'reschedule', { datum, starttijd })
  if (!result.ok) {
    return { ok: false, error: botApiError(result, 'Verzetten mislukt.') }
  }

  revalidateAgenda(leadId)
  return { ok: true }
}
