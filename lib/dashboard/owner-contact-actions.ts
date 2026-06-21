'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'
import { isValidEmail, normalizeWhatsapp } from './owner-contact'

export type SaveOwnerContactResult = { ok: true } | { ok: false; error: string }

export interface OwnerContactInput {
  /** Basis-ontvangadres (verplicht, geldig e-mailadres). */
  basisEmail: string
  /** Goedkeuring: leeg/null = volg basis; anders een eigen geldig adres. */
  goedkeuringEmail: string | null
  /** Meldingen: leeg/null = volg basis; anders een eigen geldig adres. */
  meldingenEmail: string | null
  /** WhatsApp-ping-nummer (optioneel; leeg = geen ping). */
  whatsapp: string
}

export async function saveOwnerContactSettings(
  input: OwnerContactInput,
): Promise<SaveOwnerContactResult> {
  await requireApprovedUser()

  const basis = (input.basisEmail ?? '').trim()
  if (!isValidEmail(basis)) {
    return { ok: false, error: 'Vul een geldig basis-ontvangadres in.' }
  }

  const goedkeuring = (input.goedkeuringEmail ?? '').trim()
  if (goedkeuring && !isValidEmail(goedkeuring)) {
    return { ok: false, error: 'Het goedkeuring-adres is geen geldig e-mailadres.' }
  }

  const meldingen = (input.meldingenEmail ?? '').trim()
  if (meldingen && !isValidEmail(meldingen)) {
    return { ok: false, error: 'Het meldingen-adres is geen geldig e-mailadres.' }
  }

  const whatsappRaw = (input.whatsapp ?? '').trim()
  let whatsapp: string | null = null
  if (whatsappRaw) {
    whatsapp = normalizeWhatsapp(whatsappRaw)
    if (!whatsapp) {
      return { ok: false, error: 'Het WhatsApp-nummer is ongeldig. Gebruik bijvoorbeeld 0612345678.' }
    }
  }

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
    .update({
      eigenaar_email: basis,
      goedkeuring_email: goedkeuring || null,
      meldingen_email: meldingen || null,
      eigenaar_whatsapp: whatsapp,
    })
    .eq('id', existing.id)

  if (updErr) {
    console.error('[saveOwnerContactSettings] failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/dashboard/instellingen')
  revalidatePath('/dashboard/v2/instellingen')
  return { ok: true }
}
