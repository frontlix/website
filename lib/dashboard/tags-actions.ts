'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type ActionResult = { ok: true } | { ok: false; error: string }

export type CreateTagResult =
  | {
      ok: true
      tag: {
        id: string
        naam: string
        kleur: string | null
        aangemaakt_op: string
      }
    }
  | { ok: false; error: string }

const MAX_NAAM = 32

/**
 * Maak een nieuwe tag aan. Faalt als de naam leeg/te lang is, of als
 * een tag met dezelfde naam (case-insensitive) al bestaat — anders krijg je
 * dubbele tags in de UI.
 *
 * Retourneert de aangemaakte row (incl. echte id) zodat de UI 'm meteen
 * met de juiste id in state kan zetten — anders crashed een directe
 * verwijder-actie op een tijdelijke client-side id.
 */
export async function createTag(input: {
  naam: string
  kleur?: string | null
}): Promise<CreateTagResult> {
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

  const { data: inserted, error } = await supabase
    .from('tags')
    .insert({ naam, kleur: input.kleur ?? null })
    .select('id, naam, kleur, aangemaakt_op')
    .single()

  if (error || !inserted) {
    console.error('[createTag] failed:', error)
    return { ok: false, error: 'Aanmaken mislukt — geen rechten?' }
  }

  revalidatePath('/instellingen')
  return { ok: true, tag: inserted }
}

/**
 * Verwijder een tag. Geen onderscheid meer tussen system- en user-tags —
 * alles is verwijderbaar. Cascade via FK regelt opruiming van `lead_tags`.
 *
 * Let op: system-tags (Particulier, Zakelijk, etc.) worden automatisch
 * opnieuw aangemaakt zodra de tags-pagina geladen wordt (zie
 * `ensureSystemTagsExist` in tags-queries.ts) — wil je een definitieve
 * verwijdering, schakel die seed dan ook uit.
 */
export async function deleteTag(tagId: string): Promise<ActionResult> {
  if (!tagId) return { ok: false, error: 'Ongeldige tag-id.' }

  const supabase = await getDashboardSupabase()

  const { data: tag } = await supabase
    .from('tags')
    .select('id')
    .eq('id', tagId)
    .maybeSingle()
  if (!tag) return { ok: false, error: 'Tag niet gevonden.' }

  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  if (error) {
    console.error('[deleteTag] failed:', error)
    return { ok: false, error: 'Verwijderen mislukt — geen rechten?' }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}
