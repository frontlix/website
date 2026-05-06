'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type CreateTagResult =
  | { ok: true; tagId: string }
  | { ok: false; error: string }

export type TagActionResult = { ok: true } | { ok: false; error: string }

/**
 * Maakt een nieuwe tag aan. `naam` moet uniek zijn (DB-constraint).
 * Returnt het nieuwe tag.id zodat caller direct kan koppelen aan een lead.
 */
export async function createTag(naam: string): Promise<CreateTagResult> {
  const trimmed = naam.trim()
  if (!trimmed) {
    return { ok: false, error: 'Tag-naam mag niet leeg zijn.' }
  }

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('tags')
    .insert({ naam: trimmed })
    .select()
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Tag aanmaken mislukt.' }
  }

  revalidatePath('/leads')
  return { ok: true, tagId: (data as unknown as { id: string }).id }
}

/**
 * Koppelt een bestaande tag aan een lead via lead_tags.
 * RLS-policy in 024 vereist aangemaakt_door = auth.uid().
 */
export async function addTagToLead(
  leadId: string,
  tagId: string
): Promise<TagActionResult> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Niet ingelogd.' }
  }

  const { error } = await supabase
    .from('lead_tags')
    .insert({
      lead_id: leadId,
      tag_id: tagId,
      aangemaakt_door: user.id,
    })
    .select()
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}

/**
 * Verwijdert een tag van een lead. Tag zelf blijft in tags-tabel.
 */
export async function removeTagFromLead(
  leadId: string,
  tagId: string
): Promise<TagActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('lead_tags')
    .delete()
    .match({ lead_id: leadId, tag_id: tagId })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}
