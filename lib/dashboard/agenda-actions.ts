'use server'

// Write-server-actions voor de (mobiele) agenda: een klus afronden en een
// afspraak herplannen. Beide updaten de `leads`-rij via de RLS-client (dezelfde
// aanpak als setDashboardStatus, de leads-tabel heeft een UPDATE-policy voor
// dashboard-users) en revalideren /agenda zodat de lijst meteen klopt.

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { toAmsterdamDayKey } from './calendar'

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
 * Verzet de afspraak naar een nieuw tijdstip. De agenda plaatst afspraken op
 * `afspraak_datum` + `afspraak_starttijd` (de echte afspraakdatum), dus
 * schrijven we die velden, afgeleid uit het nieuwe moment in Amsterdam-tijd.
 * `afspraak_geboekt_op` (het oorspronkelijke boekmoment) blijft ongemoeid.
 *
 * NB: dit synct (nog) niet met Google Agenda; dat doet de bot bij boekingen
 * via WhatsApp/web. Een dashboard-verzetting past alleen de Frontlix-agenda aan.
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

  const iso = new Date(ms).toISOString()
  const afspraakDatum = toAmsterdamDayKey(iso)
  const afspraakStarttijd = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms))

  const { error } = await supabase
    .from('leads')
    .update({ afspraak_datum: afspraakDatum, afspraak_starttijd: afspraakStarttijd })
    .eq('lead_id', leadId)

  if (error) return { ok: false, error: error.message }

  revalidateAgenda(leadId)
  return { ok: true }
}
