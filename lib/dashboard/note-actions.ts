'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type NoteActionResult = { ok: true } | { ok: false; error: string }

/**
 * Voegt een notitie toe aan een lead. `auteur` wordt automatisch gezet
 * via auth.uid(), RLS-policy in 024 staat alleen INSERT toe als
 * auteur = auth.uid().
 */
export async function addNote(
  leadId: string,
  tekst: string
): Promise<NoteActionResult> {
  const trimmed = tekst.trim()
  if (!trimmed) {
    return { ok: false, error: 'Notitie mag niet leeg zijn.' }
  }

  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Niet ingelogd.' }
  }

  const { error } = await supabase.from('lead_notes').insert({
    lead_id: leadId,
    tekst: trimmed,
    auteur: user.id,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}

/**
 * Verwijdert een notitie. RLS-policy (migratie 061) laat elk goedgekeurd
 * teamlid dit doen, niet alleen de auteur. leadId is nodig voor revalidatePath;
 * het is niet onderdeel van de query (id is uniek).
 */
export async function deleteNote(
  noteId: string,
  leadId: string
): Promise<NoteActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase.from('lead_notes').delete().eq('id', noteId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}

/**
 * Bewerkt de tekst van een notitie. RLS-policy (migratie 061) laat elk
 * goedgekeurd teamlid dit doen. De auteur en aanmaaktijd blijven ongewijzigd;
 * we werken alleen `tekst` bij. leadId is voor revalidatePath.
 */
export async function updateNote(
  noteId: string,
  leadId: string,
  tekst: string
): Promise<NoteActionResult> {
  const trimmed = tekst.trim()
  if (!trimmed) {
    return { ok: false, error: 'Notitie mag niet leeg zijn.' }
  }

  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('lead_notes')
    .update({ tekst: trimmed })
    .eq('id', noteId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}

/**
 * Stelt in waar een notitie verschijnt: op de afspraak-print en/of de
 * opdrachtbon (de twee vinkjes in het Notities-tabblad). Beide default true
 * (migratie 062). RLS-policy (migratie 061) laat elk goedgekeurd teamlid dit
 * doen. leadId is voor revalidatePath.
 */
export async function setNoteTargets(
  noteId: string,
  leadId: string,
  targets: { opAfspraak: boolean; opOpdrachtbon: boolean }
): Promise<NoteActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('lead_notes')
    .update({ op_afspraak: targets.opAfspraak, op_opdrachtbon: targets.opOpdrachtbon })
    .eq('id', noteId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}
