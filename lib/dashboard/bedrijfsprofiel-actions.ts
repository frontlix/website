'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

/**
 * Server action voor het opslaan van de bewerkbare bedrijfsprofiel-velden op
 * `tenant_settings`: bedrijfsnaam, bot-naam (chatbot_naam), adres, postcode,
 * plaats, eigenaar_email, eigenaar_whatsapp, spoed-telefoon
 * (eigenaar_spoed_telefoon) en de werkstraal (radius_max_km). De v2
 * Instellingen-pagina (Bedrijfsprofiel-sectie) gebruikt
 * dit via de globale "Opslaan"-knop, zodat klant-wijzigingen in de DB landen
 * en de bot/workflow ze kan lezen.
 *
 * Telefoon-velden: "Eigenaar WhatsApp" schrijft naar `eigenaar_whatsapp`,
 * "Spoed-telefoon" naar `eigenaar_spoed_telefoon` (twee aparte kolommen, zoals
 * het v1-dashboard ze toont). KvK is bewust NIET opgenomen, die kolom bestaat
 * niet op tenant_settings.
 *
 * Werkstraal: `radius_max_km` wordt alleen weggeschreven als de meegestuurde
 * waarde een plausibel getal is (1–1000 km); een lege/ongeldige invoer laat de
 * bestaande waarde ongemoeid.
 *
 * Auth + write-patroon: identiek aan saveOmzetDoelMaand / saveTenantBase.
 * requireApprovedUser() blokkeert niet-approved users (redirect). Het
 * daadwerkelijke schrijven gaat via de service-role admin-client, omdat
 * `tenant_settings` geen UPDATE-policy heeft voor dashboard-users (een gewone
 * RLS-client zou stil 0 rijen raken en niets opslaan).
 */
export type SaveBedrijfsprofielResult =
  | { ok: true }
  | { ok: false; error: string }

export interface BedrijfsprofielInput {
  bedrijfsnaam: string
  /** Bot-naam → tenant_settings.chatbot_naam. */
  bot_naam: string
  adres: string
  postcode: string
  plaats: string
  eigenaar_email: string
  /** Voornaam eigenaar → tenant_settings.eigenaar_naam (ondertekening mails). */
  eigenaar_naam: string
  /** Eigenaar-WhatsApp → tenant_settings.eigenaar_whatsapp. */
  telefoon: string
  /** Spoed-telefoon → tenant_settings.eigenaar_spoed_telefoon. */
  spoed_telefoon: string
  /** Werkstraal in km → tenant_settings.radius_max_km. */
  radius_max_km: number
}

export async function updateBedrijfsprofiel(
  input: BedrijfsprofielInput,
): Promise<SaveBedrijfsprofielResult> {
  // Ingelogd EN approved, anders kan een pending/rejected user via de
  // service-role-write hieronder de ontbrekende UPDATE-policy omzeilen.
  await requireApprovedUser()

  // Lichte validatie: e-mail moet leeg zijn of een plausibel adres bevatten.
  const email = input.eigenaar_email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Vul een geldig e-mailadres in.' }
  }

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

  // Werkstraal alleen wegschrijven bij een plausibel getal (1–1000 km); een
  // lege/0/ongeldige invoer laat de bestaande radius_max_km ongemoeid.
  const radius =
    Number.isFinite(input.radius_max_km) && input.radius_max_km > 0
      ? Math.min(Math.round(input.radius_max_km), 1000)
      : null

  const updatePayload = {
    bedrijfsnaam: input.bedrijfsnaam.trim() || null,
    chatbot_naam: input.bot_naam.trim() || null,
    adres: input.adres.trim() || null,
    postcode: input.postcode.trim() || null,
    plaats: input.plaats.trim() || null,
    eigenaar_email: email || null,
    eigenaar_naam: input.eigenaar_naam.trim() || null,
    eigenaar_whatsapp: input.telefoon.trim() || null,
    eigenaar_spoed_telefoon: input.spoed_telefoon.trim() || null,
    bijgewerkt_op: new Date().toISOString(),
    ...(radius != null ? { radius_max_km: radius } : {}),
  }

  const { error: updErr } = await admin
    .from('tenant_settings')
    .update(updatePayload)
    .eq('id', existing.id)

  if (updErr) {
    console.error('[updateBedrijfsprofiel] failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/dashboard/instellingen')
  revalidatePath('/dashboard/v2/instellingen')

  return { ok: true }
}
