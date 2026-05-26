'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import type { DashboardStatus, Database } from './database.types'
import { regenerateAutoRegels } from './offerte-auto-regels'

type LeadUpdate = Database['public']['Tables']['leads']['Update']

const VALID_STATUSES: ReadonlySet<DashboardStatus> = new Set([
  'open',
  'opgevolgd',
  'afgehandeld',
  'no_show',
  'geen_interesse',
  'archief',
])

// Velden die — indien gewijzigd via de info-tab — de auto-berekende
// offerte-regels moeten triggeren. Zit één van deze keys in de patch
// dan roepen we na de UPDATE `regenerateAutoRegels()` aan zodat
// prijsregels in sync blijven met de actuele lead-data. Strict gehouden
// tot velden die `computeRules()` daadwerkelijk leest — adres-velden
// veranderen de prijs niet en triggeren dus niets.
const OFFERTE_TRIGGER_FIELDS: ReadonlySet<string> = new Set([
  'm2',
  'sub_diensten',
  'voegzand_type',
  'voegzand_zakken',
  'voegzand_normaal_zakken',
  'voegzand_onkruidwerend_zakken',
  'zand_kleur',
  'zand_kleur_antraciet',
  'zand_kleur_naturel',
  'korstmos',
  'planten_afschermen',
  'groene_aanslag',
  'beschermlaag_m2',
  'extra_arbeid_minuten',
  'extra_arbeid_personen',
  'korting_percentage',
  'afstand_km',
])

export type ActionResult = { ok: true } | { ok: false; error: string }

// ── Lead-gegevens bewerken (info-tab) ────────────────────────────────
//
// Witte lijst van kolommen die via de "Bewerken"-flow vanuit de info-tab
// gewijzigd mogen worden. Alle andere kolommen (status-flow, offerte-velden,
// systeem-velden) blijven onbereikbaar — die hebben hun eigen actions.
const EDITABLE_TEXT_FIELDS = new Set<string>([
  'naam',
  'bedrijfsnaam',
  'telefoon',
  'email',
  'straat',
  'huisnummer',
  'postcode',
  'plaats',
  'bron',
  'hoofdcategorie',
  'zand_kleur',
  'voegzand_type',
  'groene_aanslag',
  'korstmos',
  'planten',
  'planten_afschermen',
  'toelichting',
])
const EDITABLE_NUMERIC_FIELDS = new Set<string>(['afstand_km', 'm2'])
const EDITABLE_ARRAY_FIELDS = new Set<string>(['sub_diensten'])

export type LeadEditPatch = Partial<{
  naam: string
  bedrijfsnaam: string | null
  telefoon: string
  email: string
  straat: string | null
  huisnummer: string
  postcode: string
  plaats: string | null
  bron: string | null
  hoofdcategorie: string
  zand_kleur: string | null
  voegzand_type: string | null
  groene_aanslag: string | null
  korstmos: string | null
  planten: string | null
  planten_afschermen: string | null
  toelichting: string | null
  afstand_km: number | null
  m2: number | null
  sub_diensten: string[] | null
}>

/**
 * Werkt één of meerdere kolommen van een lead bij. Wordt gebruikt door de
 * inline-edit op de info-tab. Valideert dat alleen toegestane kolommen
 * worden meegegeven (whitelist hierboven) — dit voorkomt dat een aangepaste
 * client per ongeluk status/offerte-velden kan overschrijven.
 */
export async function updateLeadFields(
  leadId: string,
  patch: LeadEditPatch
): Promise<ActionResult> {
  const keys = Object.keys(patch)
  if (keys.length === 0) {
    return { ok: false, error: 'Geen wijzigingen' }
  }

  // Whitelist-check
  for (const k of keys) {
    if (
      !EDITABLE_TEXT_FIELDS.has(k) &&
      !EDITABLE_NUMERIC_FIELDS.has(k) &&
      !EDITABLE_ARRAY_FIELDS.has(k)
    ) {
      return { ok: false, error: `Kolom "${k}" mag niet bewerkt worden` }
    }
  }

  // Lichte type-validatie + leeg → null waar de DB nullable is
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (EDITABLE_NUMERIC_FIELDS.has(k)) {
      if (v === null || v === '' || v === undefined) {
        cleaned[k] = null
      } else if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        cleaned[k] = v
      } else {
        return { ok: false, error: `Veld "${k}" moet een positief getal zijn` }
      }
      continue
    }
    if (EDITABLE_ARRAY_FIELDS.has(k)) {
      if (v === null || v === undefined) {
        cleaned[k] = null
      } else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
        cleaned[k] = v
      } else {
        return { ok: false, error: `Veld "${k}" moet een lijst van strings zijn` }
      }
      continue
    }
    // Tekst-velden
    if (v === null || v === undefined) {
      cleaned[k] = null
    } else if (typeof v === 'string') {
      const trimmed = v.trim()
      cleaned[k] = trimmed === '' ? null : trimmed
    } else {
      return { ok: false, error: `Veld "${k}" moet tekst zijn` }
    }
  }

  // Extra: e-mail moet er minimaal als e-mail uitzien
  if (typeof cleaned.email === 'string' && !cleaned.email.includes('@')) {
    return { ok: false, error: 'E-mailadres ziet er ongeldig uit' }
  }
  // Verplichte velden mogen niet leeggemaakt worden
  for (const required of ['naam', 'telefoon', 'email', 'huisnummer', 'postcode', 'hoofdcategorie']) {
    if (required in cleaned && cleaned[required] === null) {
      return { ok: false, error: `Veld "${required}" is verplicht` }
    }
  }

  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update(cleaned as LeadUpdate)
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  // Fase 2.4: als deze patch een prijs-relevant veld raakt, herbereken
  // de auto-prijsregels synchroon. Synchroon zodat de router.refresh()
  // in de UI direct verse data ophaalt (geen race met realtime).
  //
  // Errors loggen we wel, maar we breken de info-tab edit niet — de
  // lead-update zelf is succesvol en de owner kan altijd nog via de
  // offerte-tab herberekenen. Voorkomt dat een offerte-bug een info-tab
  // edit blokkeert.
  const triggers = Object.keys(cleaned).some((k) => OFFERTE_TRIGGER_FIELDS.has(k))
  if (triggers) {
    try {
      const result = await regenerateAutoRegels(leadId)
      if (!result.ok) {
        console.error(
          `[updateLeadFields] regenerateAutoRegels failed for ${leadId}: ${result.error}`,
        )
      }
    } catch (err) {
      console.error(`[updateLeadFields] regenerateAutoRegels threw for ${leadId}:`, err)
    }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

/**
 * Wijzigt leads.dashboard_status. De BEFORE/AFTER UPDATE trigger
 * (migratie 025) logt automatisch naar lead_status_history.
 *
 * `null` is toegestaan om de status leeg te maken.
 */
export async function setDashboardStatus(
  leadId: string,
  status: DashboardStatus | null
): Promise<ActionResult> {
  if (status !== null && !VALID_STATUSES.has(status)) {
    return { ok: false, error: 'Ongeldige status-waarde' }
  }

  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ dashboard_status: status })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

/**
 * Markeert een lead als gearchiveerd. getLeadsList filtert deze automatisch
 * weg, dus de lead verdwijnt uit de hoofdlijst.
 */
export async function archiveLead(leadId: string): Promise<ActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ dashboard_archived: true })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

/**
 * Maakt een gearchiveerde lead weer zichtbaar in de hoofdlijst.
 */
export async function unarchiveLead(leadId: string): Promise<ActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ dashboard_archived: false })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

/**
 * Markeert een gesprek als "gelezen" door de owner — zet
 * leads.inbox_gelezen_op = now(). Wordt aangeroepen vanuit de inbox
 * zodra een lead geselecteerd wordt (?lead=...). Verandert daarmee de
 * "Ongelezen" count in de filter-tabs.
 *
 * Idempotent: meerdere calls achter elkaar overschrijven gewoon de
 * timestamp. Bij DB-fouten falen we silent (return ok:false) — de inbox
 * werkt door, alleen de unread-count update niet.
 */
export async function markInboxRead(leadId: string): Promise<ActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ inbox_gelezen_op: new Date().toISOString() })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/inbox')
  return { ok: true }
}
