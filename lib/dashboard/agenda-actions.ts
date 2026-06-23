'use server'

// Write-server-actions voor de (mobiele) agenda: een klus afronden en een
// afspraak herplannen. Beide updaten de `leads`-rij via de RLS-client (dezelfde
// aanpak als setDashboardStatus, de leads-tabel heeft een UPDATE-policy voor
// dashboard-users) en revalideren /agenda zodat de lijst meteen klopt.

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { toAmsterdamDayKey } from './calendar'
import { callBotLeadApi, botApiError } from './bot-api-client'
import { requireApprovedUser } from './require-approved-user'

export type AgendaActionResult = { ok: true } | { ok: false; error: string }

function revalidateAgenda(leadId: string) {
  revalidatePath('/agenda')
  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

/** Markeer de klus/afspraak als afgehandeld (dashboard_status). */
export async function completeAppointment(leadId: string): Promise<AgendaActionResult> {
  if (!leadId.trim()) return { ok: false, error: 'Lead-id ontbreekt.' }

  // Approved-gate: alleen goedgekeurde tenant-users mogen agenda-acties doen.
  // Deze acties triggeren bot-calls, Google-events en klant-bevestigingen, dus
  // een ingelogde-maar-niet-approved user mag ze niet kunnen aanroepen.
  await requireApprovedUser()
  const supabase = await getDashboardSupabase()

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
  opts: { notifyWhatsapp?: boolean; notifyEmail?: boolean } = {},
): Promise<AgendaActionResult> {
  if (!leadId.trim()) return { ok: false, error: 'Lead-id ontbreekt.' }
  const ms = new Date(newIso).getTime()
  if (!Number.isFinite(ms)) return { ok: false, error: 'Ongeldige datum/tijd.' }

  // Approved-gate: alleen goedgekeurde tenant-users mogen agenda-acties doen.
  // Deze acties triggeren bot-calls, Google-events en klant-bevestigingen, dus
  // een ingelogde-maar-niet-approved user mag ze niet kunnen aanroepen.
  await requireApprovedUser()

  const datum = toAmsterdamDayKey(new Date(ms).toISOString()) // YYYY-MM-DD
  const starttijd = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms)) // HH:MM

  const result = await callBotLeadApi(leadId, 'reschedule', {
    datum,
    starttijd,
    notifyWhatsapp: opts.notifyWhatsapp ?? true,
    notifyEmail: opts.notifyEmail ?? true,
  })
  if (!result.ok) {
    return { ok: false, error: botApiError(result, 'Verzetten mislukt.') }
  }

  revalidateAgenda(leadId)
  return { ok: true }
}

/**
 * Annuleert de afspraak: de bot verwijdert het Google-event, maakt de
 * afspraak-velden leeg en stuurt (optioneel) een bericht naar de klant.
 * Loopt via dezelfde bot-route als de andere agenda-acties.
 */
export async function cancelAppointment(
  leadId: string,
  opts: { notifyWhatsapp?: boolean; notifyEmail?: boolean } = {},
): Promise<AgendaActionResult> {
  if (!leadId.trim()) return { ok: false, error: 'Lead-id ontbreekt.' }

  // Approved-gate: alleen goedgekeurde tenant-users mogen agenda-acties doen.
  // Deze acties triggeren bot-calls, Google-events en klant-bevestigingen, dus
  // een ingelogde-maar-niet-approved user mag ze niet kunnen aanroepen.
  await requireApprovedUser()

  const result = await callBotLeadApi(leadId, 'cancel-appointment', {
    notifyWhatsapp: opts.notifyWhatsapp ?? true,
    notifyEmail: opts.notifyEmail ?? true,
  })
  if (!result.ok) {
    return { ok: false, error: botApiError(result, 'Annuleren mislukt.') }
  }

  revalidateAgenda(leadId)
  return { ok: true }
}

/**
 * Plant een NIEUWE afspraak in voor een bestaande lead. Loopt via dezelfde
 * bot-route als de boekingen vanuit WhatsApp/web (book-appointment), zodat
 * alles aan elkaar gelinkt blijft:
 *  - er wordt een Google-Calendar-event aangemaakt, waardoor de bot-planning
 *    die dag als BEZET ziet (1-klus-per-dag) en hem niet meer aanbiedt,
 *  - afspraak_datum + afspraak_starttijd worden in Supabase bijgewerkt,
 *  - de klant krijgt een bevestiging (WhatsApp/email, best-effort).
 */
export async function bookAppointment(
  leadId: string,
  datum: string,
  tijd: string,
  opts: { notifyWhatsapp?: boolean; notifyEmail?: boolean } = {},
): Promise<AgendaActionResult> {
  if (!leadId.trim()) return { ok: false, error: 'Lead-id ontbreekt.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return { ok: false, error: 'Ongeldige datum.' }
  }
  if (!/^\d{2}:\d{2}$/.test(tijd)) {
    return { ok: false, error: 'Ongeldige tijd.' }
  }

  // Approved-gate: alleen goedgekeurde tenant-users mogen agenda-acties doen.
  // Deze acties triggeren bot-calls, Google-events en klant-bevestigingen, dus
  // een ingelogde-maar-niet-approved user mag ze niet kunnen aanroepen.
  await requireApprovedUser()

  // De bot stuurt standaard beide bevestigingen; deze vlaggen kunnen ze los
  // uitzetten (dashboard-keuze per afspraak).
  const result = await callBotLeadApi(leadId, 'book-appointment', {
    datum,
    starttijd: tijd,
    notifyWhatsapp: opts.notifyWhatsapp ?? true,
    notifyEmail: opts.notifyEmail ?? true,
  })
  if (!result.ok) {
    return { ok: false, error: botApiError(result, 'Inplannen mislukt.') }
  }

  revalidateAgenda(leadId)
  return { ok: true }
}
