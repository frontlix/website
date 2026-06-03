'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { isValidIcon, isValidColor } from './tag-presets'

export type ActionResult = { ok: true } | { ok: false; error: string }

export type TagRow = {
  id: string
  naam: string
  kleur: string | null
  icon: string | null
  aangemaakt_op: string
}

export type CreateTagResult = { ok: true; tag: TagRow } | { ok: false; error: string }

const MAX_NAAM = 32

/**
 * Maak een nieuwe tag aan met optionele kleur + icoon. Faalt bij lege/te
 * lange naam, of als een tag met dezelfde naam (case-insensitive) al
 * bestaat. Retourneert de volledige row (incl. uuid) zodat de UI 'm
 * direct kan tonen met de echte id.
 */
export async function createTag(input: {
  naam: string
  kleur?: string | null
  icon?: string | null
}): Promise<CreateTagResult> {
  const naam = input.naam.trim()
  if (!naam) return { ok: false, error: 'Naam is verplicht.' }
  if (naam.length > MAX_NAAM) {
    return { ok: false, error: `Naam mag max ${MAX_NAAM} tekens zijn.` }
  }

  // Optionele kleur/icoon valideren tegen de preset-lijsten.
  const kleur = normalizeKleur(input.kleur)
  if (kleur === 'INVALID') return { ok: false, error: 'Ongeldige kleur.' }
  const icon = normalizeIcon(input.icon)
  if (icon === 'INVALID') return { ok: false, error: 'Ongeldig icoon.' }

  const supabase = await getDashboardSupabase()

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
    .insert({ naam, kleur, icon })
    .select('id, naam, kleur, icon, aangemaakt_op')
    .single()

  if (error || !inserted) {
    console.error('[createTag] failed:', error)
    return { ok: false, error: 'Aanmaken mislukt, geen rechten?' }
  }

  revalidatePath('/instellingen')
  return { ok: true, tag: inserted }
}

/**
 * Update naam / kleur / icoon van een bestaande tag. Velden die niet
 * in `input` zitten blijven ongewijzigd. Naam-duplicate-check skip't de
 * tag zelf om geen valse positive te krijgen.
 */
export async function updateTag(input: {
  id: string
  naam?: string
  kleur?: string | null
  icon?: string | null
}): Promise<ActionResult> {
  if (!input.id) return { ok: false, error: 'Ongeldige tag-id.' }

  const patch: { naam?: string; kleur?: string | null; icon?: string | null } = {}

  if (input.naam !== undefined) {
    const naam = input.naam.trim()
    if (!naam) return { ok: false, error: 'Naam is verplicht.' }
    if (naam.length > MAX_NAAM) {
      return { ok: false, error: `Naam mag max ${MAX_NAAM} tekens zijn.` }
    }
    patch.naam = naam
  }

  if (input.kleur !== undefined) {
    const kleur = normalizeKleur(input.kleur)
    if (kleur === 'INVALID') return { ok: false, error: 'Ongeldige kleur.' }
    patch.kleur = kleur
  }

  if (input.icon !== undefined) {
    const icon = normalizeIcon(input.icon)
    if (icon === 'INVALID') return { ok: false, error: 'Ongeldig icoon.' }
    patch.icon = icon
  }

  if (Object.keys(patch).length === 0) return { ok: true }

  const supabase = await getDashboardSupabase()

  // Naam-duplicate check (skip self).
  if (patch.naam) {
    const { data: clash } = await supabase
      .from('tags')
      .select('id')
      .ilike('naam', patch.naam)
      .neq('id', input.id)
      .limit(1)
    if (clash && clash.length > 0) {
      return { ok: false, error: `Tag "${patch.naam}" bestaat al.` }
    }
  }

  const { error } = await supabase.from('tags').update(patch).eq('id', input.id)
  if (error) {
    console.error('[updateTag] failed:', error)
    return { ok: false, error: 'Opslaan mislukt, geen rechten?' }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}

/**
 * Verwijder een tag. Alle tags zijn verwijderbaar (geen system-protectie).
 * Systeem-tags worden bij refresh van de tags-pagina opnieuw aangemaakt
 * via `ensureSystemTagsExist`. Cascade via FK regelt opruiming van
 * `lead_tags`-rijen.
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
    return { ok: false, error: 'Verwijderen mislukt, geen rechten?' }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}

/* ── Helpers ──────────────────────────────────────────── */

/**
 * Normaliseer een kleur-input naar:
 *  - null (expliciete clear of geen waarde),
 *  - de kleur-string zelf (geldige hex uit de preset-set, of vrij gegeven),
 *  - 'INVALID' wanneer er een waarde is maar 'ie matched geen hex-regex.
 *
 * Vrije hex-waardes (buiten COLOR_OPTIONS) zijn toegestaan zolang ze
 * geldig hex zijn, de UI kiest uit presets, maar database staat
 * flexibiliteit toe.
 */
function normalizeKleur(value: string | null | undefined): string | null | 'INVALID' {
  if (value === null || value === undefined || value === '') return null
  return isValidColor(value) ? value : 'INVALID'
}

/** Idem voor icon, moet matchen met een key in ICON_OPTIONS. */
function normalizeIcon(value: string | null | undefined): string | null | 'INVALID' {
  if (value === null || value === undefined || value === '') return null
  return isValidIcon(value) ? value : 'INVALID'
}
