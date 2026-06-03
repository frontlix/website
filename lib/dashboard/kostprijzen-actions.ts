'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

// ── Fase 3a: kostprijzen-per-dienst CRUD ──────────────────────────────────
//
// Globale tabel `kostprijzen_per_dienst` (migratie 043) bevat één rij per
// dienst-categorie met `kost_pct` (0–100). Wordt gelezen door de marge-kaart
// in de offerte-tab en geschreven via de Kostprijzen-modal.
//
// Read (getKostprijzen): voor iedere approved user (de marge-kaart toont
// alleen aan owners, maar de query zelf is harmloos, RLS staat sowieso
// alleen service-role toe).
//
// Writes (saveKostprijzen, resetKostprijzen): alleen voor `is_owner=true`.
// We controleren dit via `profile.is_owner` die requireApprovedUser()
// teruggeeft. Geen aparte DB-query nodig (auth.ts haalt al `is_owner` op).

export type Kostprijs = {
  rule_key: string
  label: string
  kost_pct: number
}

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

// ─── Hardcoded defaults ────────────────────────────────────────────────
// Spiegel van de seed in migratie 043. Gebruikt door resetKostprijzen()
// om "Standaard-waarden terugzetten" te ondersteunen. Wijziging hier
// MOET ook in 043_kostprijzen_per_dienst.sql doorgevoerd worden zodat
// verse installaties dezelfde defaults krijgen.
const DEFAULT_KOSTPRIJZEN: ReadonlyArray<Kostprijs> = [
  { rule_key: 'reiniging_straatwerk',     label: 'Reiniging straatwerk',       kost_pct: 42 },
  { rule_key: 'arbeid_invegen',           label: 'Voegen invegen (arbeid)',    kost_pct: 38 },
  { rule_key: 'voegzand',                 label: 'Voegzand (materiaal)',       kost_pct: 55 },
  { rule_key: 'beschermlaag_impregneren', label: 'Beschermlaag impregneren',   kost_pct: 30 },
  { rule_key: 'plantenafscherming_folie', label: 'Plantenafscherming folie',   kost_pct: 35 },
  { rule_key: 'reiskosten',               label: 'Reiskosten',                 kost_pct: 18 },
  { rule_key: 'onderhoud_abonnement',     label: 'Onderhoud / abonnement',     kost_pct: 35 },
  { rule_key: 'overig_handmatig',         label: 'Overig / handmatige regels', kost_pct: 38 },
]

/**
 * Haal alle kostprijzen op (gesorteerd op label voor consistente UI-volgorde).
 *
 * Retourneert een lege lijst als de tabel leeg/niet-geseed is of bij een
 * netwerk-/RLS-fout. De aanroepers (marge-kaart) hebben dan een veilige
 * fallback: geen kostprijzen = geen marge-zicht (verbergen of "configureer
 * eerst kostprijzen"-state). Lege return is bewust geen Result-shape, de
 * read is bedoeld als "fire-and-forget" data-load, niet als een action.
 */
export async function getKostprijzen(): Promise<Kostprijs[]> {
  const admin = getDashboardAdmin()
  const { data, error } = await admin
    .from('kostprijzen_per_dienst')
    .select('rule_key, label, kost_pct')
    .order('label', { ascending: true })

  if (error || !data) return []

  // Cast number-veld door Number(), Supabase numeric-types kunnen als
  // string terugkomen afhankelijk van driver-config.
  return data.map((row) => ({
    rule_key: row.rule_key,
    label: row.label,
    kost_pct: Number(row.kost_pct),
  }))
}

/**
 * Update meerdere kostprijzen tegelijk via upsert. Alleen voor owners.
 *
 * Per upsert wordt alleen `kost_pct` + `bijgewerkt_op` geschreven; bestaande
 * `label` blijft staan. Als de rule_key nog niet bestaat (verse install,
 * migratie nog niet gerund), pakken we het label uit DEFAULT_KOSTPRIJZEN
 *, anders zou de NOT NULL constraint op `label` falen.
 *
 * Validaties:
 *  - rule_key is een niet-lege string
 *  - kost_pct is een eindig getal binnen [0, 100]
 *
 * Bij fout wordt direct gestopt (eerder geschreven rijen blijven staan,
 * net als in updatePricingRulesBatch). De client geeft de owner een
 * duidelijke melding.
 */
export async function saveKostprijzen(
  updates: Array<{ rule_key: string; kost_pct: number }>,
): Promise<Result> {
  const { profile } = await requireApprovedUser()
  if (!profile.is_owner) return { ok: false, error: 'Geen toegang' }

  if (!Array.isArray(updates) || updates.length === 0) {
    return { ok: false, error: 'Geen wijzigingen' }
  }

  // Valideer alles vooraf, zo voorkom je half-doorlopen writes.
  for (const u of updates) {
    if (typeof u.rule_key !== 'string' || u.rule_key.trim() === '') {
      return { ok: false, error: 'Ongeldige categorie-key' }
    }
    if (!Number.isFinite(u.kost_pct) || u.kost_pct < 0 || u.kost_pct > 100) {
      return { ok: false, error: `Ongeldig percentage voor ${u.rule_key}` }
    }
  }

  const admin = getDashboardAdmin()

  // Lookup-map van defaults voor het geval een rule_key nog niet in de DB
  // staat en we 'm via upsert moeten inserten, `label` is NOT NULL.
  const defaultLabelByKey = new Map(
    DEFAULT_KOSTPRIJZEN.map((d) => [d.rule_key, d.label] as const),
  )

  const now = new Date().toISOString()
  const rows = updates.map((u) => ({
    rule_key: u.rule_key,
    // Fallback-label voor onbekende rule_keys; bij bestaande rij doet de
    // upsert er niets mee omdat we expliciet `label` mee-updaten, dus
    // hier kiezen we voor het default-label (of de key zelf als ook dat
    // ontbreekt) zodat de DB-constraint nooit faalt.
    label: defaultLabelByKey.get(u.rule_key) ?? u.rule_key,
    kost_pct: u.kost_pct,
    bijgewerkt_op: now,
  }))

  const { error } = await admin
    .from('kostprijzen_per_dienst')
    .upsert(rows, { onConflict: 'rule_key' })

  if (error) return { ok: false, error: error.message }

  // Marge-kaart staat in de lead-detail-pagina. Geen specifieke lead-id
  // bekend op dit punt, dus we revalidaten het pad-pattern globaal,   // Next.js raakt alle [lead_id]-routes aan.
  revalidatePath('/leads/[lead_id]', 'page')
  revalidatePath('/instellingen')

  return { ok: true }
}

// Bij success geven we ook een (undefined) error-veld mee zodat consumers
// die uniform `res.error` lezen in fallback-paden niet op een TS-error
// stuiten. Runtime is dat dan simpelweg `undefined`.
type ResetResult =
  | { ok: true; kostprijzen: Kostprijs[]; error?: undefined }
  | { ok: false; error: string }

/**
 * Reset alle kostprijzen naar de hardcoded defaults. Alleen voor owners.
 *
 * Implementatie: DELETE FROM kostprijzen_per_dienst, daarna INSERT van
 * de 8 default-rijen. We doen geen TRUNCATE (zou RLS/permission issues
 * kunnen geven via PostgREST), een simpele DELETE op alle rijen is
 * equivalent voor deze tabel.
 *
 * De DELETE gebruikt een altijd-ware filter (`neq('rule_key', '')`)
 * omdat de Supabase JS client een filter vereist op DELETE, anders
 * faalt 'ie met "DELETE requires a filter clause".
 *
 * Return-shape: bij success geven we de verse defaults mee in `kostprijzen`
 * zodat de aanroepende UI (Kostprijzen-modal) direct de sliders kan
 * resetten zonder een aparte refetch.
 */
export async function resetKostprijzen(): Promise<ResetResult> {
  const { profile } = await requireApprovedUser()
  if (!profile.is_owner) return { ok: false, error: 'Geen toegang' }

  const admin = getDashboardAdmin()

  // Wis alle bestaande rijen. Filter is intentioneel altijd-waar; we
  // willen heel de tabel platgooien voor de reset.
  const { error: delErr } = await admin
    .from('kostprijzen_per_dienst')
    .delete()
    .neq('rule_key', '')

  if (delErr) return { ok: false, error: `Reset (delete) mislukt: ${delErr.message}` }

  const now = new Date().toISOString()
  const { error: insErr } = await admin
    .from('kostprijzen_per_dienst')
    .insert(
      DEFAULT_KOSTPRIJZEN.map((d) => ({
        rule_key: d.rule_key,
        label: d.label,
        kost_pct: d.kost_pct,
        bijgewerkt_op: now,
      })),
    )

  if (insErr) return { ok: false, error: `Reset (insert) mislukt: ${insErr.message}` }

  revalidatePath('/leads/[lead_id]', 'page')
  revalidatePath('/instellingen')

  // Geef de defaults mee zodat de modal de sliders direct kan synchroniseren.
  return { ok: true, kostprijzen: DEFAULT_KOSTPRIJZEN.map((d) => ({ ...d })) }
}
