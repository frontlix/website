'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

/**
 * Server action voor het opslaan van de bewerkbare bedrijfsprofiel-velden op
 * `tenant_settings`: bedrijfsnaam, adres, postcode, plaats, eigenaar_email en
 * telefoon. De v2 Instellingen-pagina (Bedrijfsprofiel-sectie) gebruikt dit
 * via de globale "Opslaan"-knop.
 *
 * Telefoon-keuze: het invoerveld "Telefoon" schrijft naar
 * `tenant_settings.eigenaar_whatsapp`. Dat is consistent met hoe de pagina de
 * waarde teruglezt (toCompanyProfile mapt `tel` = eigenaar_whatsapp, met
 * eigenaar_spoed_telefoon alleen als fallback). KvK is bewust NIET opgenomen,
 * die kolom bestaat niet op tenant_settings.
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
  adres: string
  postcode: string
  plaats: string
  eigenaar_email: string
  telefoon: string
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

  const { error: updErr } = await admin
    .from('tenant_settings')
    .update({
      bedrijfsnaam: input.bedrijfsnaam.trim() || null,
      adres: input.adres.trim() || null,
      postcode: input.postcode.trim() || null,
      plaats: input.plaats.trim() || null,
      eigenaar_email: email || null,
      eigenaar_whatsapp: input.telefoon.trim() || null,
      bijgewerkt_op: new Date().toISOString(),
    })
    .eq('id', existing.id)

  if (updErr) {
    console.error('[updateBedrijfsprofiel] failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/dashboard/instellingen')
  revalidatePath('/dashboard/v2/instellingen')

  return { ok: true }
}
