'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type ActionResult = { ok: true } | { ok: false; error: string }

const MAX_NAAM = 32

/** Synced met `SYSTEM_TAG_NAMES` in tags-queries.ts — system-tags zijn
 *  beschermd tegen verwijdering, alleen hernoemen / kleur aanpassen mag. */
const SYSTEM_TAG_NAMES = new Set([
  'Particulier',
  'Zakelijk',
  'Korting',
  'Buiten radius',
  'Review',
])

/**
 * Maak een nieuwe (user-)tag aan. Faalt als de naam leeg/te lang is, of als
 * een tag met dezelfde naam (case-insensitive) al bestaat — anders krijg je
 * dubbele tags in de UI.
 */
export async function createTag(input: {
  naam: string
  kleur?: string | null
}): Promise<ActionResult> {
  const naam = input.naam.trim()
  if (!naam) return { ok: false, error: 'Naam is verplicht.' }
  if (naam.length > MAX_NAAM) {
    return { ok: false, error: `Naam mag max ${MAX_NAAM} tekens zijn.` }
  }

  const supabase = await getDashboardSupabase()

  // Duplicate-check (case-insensitive). Done client-side query om duidelijke
  // foutmelding te kunnen tonen i.p.v. ruwe DB-constraint-error.
  const { data: existing } = await supabase
    .from('tags')
    .select('id, naam')
    .ilike('naam', naam)
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: false, error: `Tag "${naam}" bestaat al.` }
  }

  const { error } = await supabase
    .from('tags')
    .insert({ naam, kleur: input.kleur ?? null })

  if (error) {
    console.error('[createTag] failed:', error)
    return { ok: false, error: 'Aanmaken mislukt — geen rechten?' }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}

/**
 * Verwijder een tag. System-tags (Korting, Buiten radius, etc.) zijn
 * beschermd — Surface kent ze automatisch toe en weer-aanmaken zou
 * verwarrend zijn. Cascade via FK regelt opruiming van `lead_tags`-rijen.
 */
export async function deleteTag(tagId: string): Promise<ActionResult> {
  if (!tagId) return { ok: false, error: 'Ongeldige tag-id.' }

  const supabase = await getDashboardSupabase()

  // Beschermen tegen verwijdering van system-tags.
  const { data: tag } = await supabase
    .from('tags')
    .select('naam')
    .eq('id', tagId)
    .maybeSingle()
  if (!tag) return { ok: false, error: 'Tag niet gevonden.' }
  if (SYSTEM_TAG_NAMES.has(tag.naam)) {
    return {
      ok: false,
      error: 'System-tags kunnen niet verwijderd worden — wel hernoemen of kleur aanpassen.',
    }
  }

  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  if (error) {
    console.error('[deleteTag] failed:', error)
    return { ok: false, error: 'Verwijderen mislukt — geen rechten?' }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}
