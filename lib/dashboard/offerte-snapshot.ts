/**
 * Pure helpers rond de offerte prijs-snapshot.
 *
 * Bij het versturen van een offerte bevriezen we de gebruikte prijslijst +
 * regels in `offertes.regels_snapshot` (jsonb). Het concept-bewerkscherm seedt
 * zijn prijslijst daaruit, zodat het de VERZONDEN prijzen toont i.p.v. live te
 * herberekenen uit de (mogelijk gewijzigde) actuele prijslijst.
 *
 * Geen next/headers of supabase hier: pure functies, veilig vanuit zowel
 * server-actions als (indirect) client-componenten.
 */

import { FALLBACK_PRICING, type ManualOffertePricing } from './pricing-types'
import { DEFAULTS, type ManualOfferteData } from './manual-offerte-types'

/** Eén bevroren regel in de snapshot. `bron` ontbreekt bij bot-regels. */
export type SnapshotRegel = {
  omschrijving: string
  aantal: number | null
  eenheid: string | null
  stukprijs: number
  totaal: number
  bron?: 'auto_lead' | 'manual'
  volgorde: number
  /** Bevroren zichtbare klant-opmerking onder deze regel (optioneel). */
  opmerking?: string | null
}

/** Object dat we in offertes.regels_snapshot (jsonb) wegschrijven. */
export type OfferteSnapshot = {
  /** 1 = alleen pricing+regels (legacy/bot). 2 = bevat ook `data` (volledige
   *  editor-invoer), zodat het concept exact teruggezet kan worden. */
  schemaVersie: 1 | 2
  pricing: ManualOffertePricing
  regels: SnapshotRegel[]
  kortingPct: number
  geldigheidDagen?: number
  /** Volledige editor-invoer (ManualOfferteData) op het verzendmoment. Hiermee
   *  zet "Terug naar verstuurde versie" niet alleen de prijsregels terug maar
   *  ook de werk-invoer (m2, afstand, diensten, korting, overrides). Afwezig bij
   *  oude offertes (schemaVersie 1) en bot-snapshots → val terug op de live
   *  lead-velden / het huidige revert-gedrag. */
  data?: ManualOfferteData
}

/** De keys van ManualOffertePricing, afgeleid van de fallback (één bron). */
const PRICING_KEYS = Object.keys(FALLBACK_PRICING) as Array<keyof ManualOffertePricing>

/**
 * Bouwt een ManualOffertePricing uit een `rule_key → waarde`-map (zoals de
 * pricing_rules-tabel die levert). Per veld terugval op FALLBACK_PRICING.
 *
 * LET OP: deze mapping is de canonieke vertaling tussen de tabel-rule_keys en
 * de dashboard-prijsvorm. Hij wordt hergebruikt door getManualOffertePricing
 * (pricing-queries.ts). De bot heeft een spiegel hiervan (toManualPricingSnapshot).
 */
export function buildPricingFromRuleKeys(
  map: Map<string, number>,
): ManualOffertePricing {
  return {
    reiniging_per_m2: map.get('reinigen_per_m2') ?? FALLBACK_PRICING.reiniging_per_m2,
    reinigen_dagprijs_onder_100m2:
      map.get('reinigen_dagprijs_onder_100m2') ?? FALLBACK_PRICING.reinigen_dagprijs_onder_100m2,
    arbeid_invegen_normaal_per_m2:
      map.get('invegen_arbeid_normaal_per_m2') ?? FALLBACK_PRICING.arbeid_invegen_normaal_per_m2,
    arbeid_invegen_onkruidwerend_per_m2:
      map.get('invegen_arbeid_onkruidwerend_per_m2') ??
      FALLBACK_PRICING.arbeid_invegen_onkruidwerend_per_m2,
    voegzand_normaal_per_zak:
      map.get('voegzand_normaal_per_zak') ?? FALLBACK_PRICING.voegzand_normaal_per_zak,
    voegzand_onkruidwerend_per_zak:
      map.get('voegzand_onkruidwerend_per_zak') ?? FALLBACK_PRICING.voegzand_onkruidwerend_per_zak,
    voegzand_m2_per_zak:
      map.get('voegzand_m2_per_zak') ?? FALLBACK_PRICING.voegzand_m2_per_zak,
    voegzand_onkruidwerend_m2_per_zak:
      map.get('voegzand_onkruidwerend_m2_per_zak') ??
      FALLBACK_PRICING.voegzand_onkruidwerend_m2_per_zak,
    preventieve_onkruid_per_m2:
      map.get('onkruid_per_m2_langer') ?? FALLBACK_PRICING.preventieve_onkruid_per_m2,
    beschermlaag_per_m2:
      map.get('beschermlaag_per_m2') ?? FALLBACK_PRICING.beschermlaag_per_m2,
    plan_4w_per_m2: map.get('onkruid_per_m2_4_weken') ?? FALLBACK_PRICING.plan_4w_per_m2,
    plan_8w_per_m2: map.get('onkruid_per_m2_8_weken') ?? FALLBACK_PRICING.plan_8w_per_m2,
    plan_12w_per_m2: map.get('onkruid_per_m2_12_weken') ?? FALLBACK_PRICING.plan_12w_per_m2,
    plan_16w_per_m2: map.get('onkruid_per_m2_langer') ?? FALLBACK_PRICING.plan_16w_per_m2,
    reiskosten_per_km: map.get('reiskosten_per_km') ?? FALLBACK_PRICING.reiskosten_per_km,
    reiskosten_drempel_km:
      map.get('reiskosten_gratis_tot_km') ?? FALLBACK_PRICING.reiskosten_drempel_km,
    extra_arbeid_per_min:
      map.get('extra_arbeid_per_minuut') ?? FALLBACK_PRICING.extra_arbeid_per_min,
    plantenafscherming_per_rol:
      map.get('planten_afschermen_folie_per_rol') ?? FALLBACK_PRICING.plantenafscherming_per_rol,
  }
}

/** Minimale regel-vorm voor buildOfferteSnapshot (structureel, matcht RegelComputed). */
type SnapshotRuleInput = {
  desc: string
  aantal: number | null
  eenheid: string | null
  prijs: number
  totaal: number
  opmerking?: string | null
}

/**
 * Bouwt het OfferteSnapshot-object dat we bij versturen in
 * `offertes.regels_snapshot` wegschrijven. Mapt de berekende regels naar de
 * bevroren SnapshotRegel-vorm (desc→omschrijving, prijs→stukprijs) en bewaart
 * de gebruikte prijslijst, zodat het concept later exact deze prijzen seedt.
 */
export function buildOfferteSnapshot(args: {
  pricing: ManualOffertePricing
  rules: SnapshotRuleInput[]
  kortingPct: number
  geldigheidDagen?: number
  /** Volledige editor-invoer; meegeven bevriest de werk-invoer voor revert
   *  (schemaVersie 2). Weglaten = legacy snapshot (schemaVersie 1). */
  data?: ManualOfferteData
}): OfferteSnapshot {
  const { pricing, rules, kortingPct, geldigheidDagen, data } = args
  return {
    schemaVersie: data ? 2 : 1,
    pricing,
    kortingPct,
    ...(geldigheidDagen != null ? { geldigheidDagen } : {}),
    ...(data ? { data } : {}),
    regels: rules.map((r, idx) => ({
      omschrijving: r.desc,
      aantal: r.aantal,
      eenheid: r.eenheid,
      stukprijs: r.prijs,
      totaal: Math.round(r.totaal * 100) / 100,
      bron: 'auto_lead' as const,
      volgorde: idx + 1,
      ...(r.opmerking ? { opmerking: r.opmerking } : {}),
    })),
  }
}

/** Eén prijsregel-rij uit de DB (backfill-input). */
type PrijsregelRow = {
  omschrijving: string | null
  aantal: number | null
  eenheid: string | null
  stukprijs: number | null
  totaal: number | null
  bron?: string | null
  volgorde?: number | null
}

/**
 * Herkenningstabel voor de backfill: omschrijving-patroon → prijs-key. Volgorde
 * telt: specifieker patroon vóór generieker (dagprijs vóór generieke reiniging,
 * onkruidwerend vóór normaal). Onherkende regels laten hun key op de live-waarde.
 */
const BACKFILL_HERKENNING: Array<[RegExp, keyof ManualOffertePricing]> = [
  [/reiniging oppervlak \(dagprijs\)/i, 'reinigen_dagprijs_onder_100m2'],
  [/reiniging oppervlak/i, 'reiniging_per_m2'],
  [/invegen onkruidwerend/i, 'arbeid_invegen_onkruidwerend_per_m2'],
  [/invegen normaal/i, 'arbeid_invegen_normaal_per_m2'],
  [/voegzand onkruidwerend/i, 'voegzand_onkruidwerend_per_zak'],
  [/voegzand normaal/i, 'voegzand_normaal_per_zak'],
  [/preventieve onkruid/i, 'preventieve_onkruid_per_m2'],
  [/beschermlaag/i, 'beschermlaag_per_m2'],
  [/afdekfolie/i, 'plantenafscherming_per_rol'],
  [/reiskosten/i, 'reiskosten_per_km'],
]

/**
 * Best-effort backfill: reconstrueert een OfferteSnapshot uit de bestaande
 * prijsregels van een verstuurde offerte. De `stukprijs` per herkende regel IS
 * het bevroren tarief; onherkende regels laten hun prijs-key op de live-waarde.
 * Zo bevriest een bestaande offerte (zonder snapshot) alsnog haar verzonden
 * prijzen, voor zover de regels herkenbaar zijn.
 */
export function reconstructSnapshotFromRegels(
  regels: PrijsregelRow[],
  livePricing: ManualOffertePricing,
  kortingPct = 0,
): OfferteSnapshot {
  const pricing: ManualOffertePricing = { ...livePricing }
  for (const r of regels) {
    const stuk = r.stukprijs
    if (stuk == null || !Number.isFinite(stuk)) continue
    const oms = r.omschrijving ?? ''
    const hit = BACKFILL_HERKENNING.find(([re]) => re.test(oms))
    if (hit) pricing[hit[1]] = stuk
  }
  return {
    schemaVersie: 1,
    pricing,
    kortingPct,
    regels: regels.map((r, idx) => ({
      omschrijving: r.omschrijving ?? 'Regel',
      aantal: r.aantal ?? null,
      eenheid: r.eenheid ?? null,
      stukprijs: r.stukprijs ?? 0,
      totaal: r.totaal ?? 0,
      bron: r.bron === 'manual' ? 'manual' : 'auto_lead',
      volgorde: r.volgorde ?? idx + 1,
    })),
  }
}

/** Minimale offerte-vorm die resolveSeedPricing nodig heeft. */
type SeedOfferte = {
  versie: number
  is_concept: boolean
  regels_snapshot: unknown
}

/**
 * Bepaalt met welke prijslijst de concept-editor geseed moet worden: de
 * bevroren `pricing` uit de snapshot van de laatste VERSTUURDE offerte
 * (is_concept === false, hoogste versie) als die bestaat, anders de live
 * prijslijst. Zo toont een ongewijzigd concept exact de verzonden prijzen.
 */
export function resolveSeedPricing(
  offertes: SeedOfferte[],
  livePricing: ManualOffertePricing,
): ManualOffertePricing {
  const verstuurd = offertes
    .filter((o) => o.is_concept === false)
    .sort((a, b) => b.versie - a.versie)[0]
  if (!verstuurd) return livePricing
  return readSnapshotPricing(verstuurd.regels_snapshot) ?? livePricing
}

/** Type-guard: is dit een plain object (geen array, geen null)? */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Leest `snapshot.pricing` uit een uit de DB gelezen regels_snapshot-waarde.
 * Geeft een gevalideerde ManualOffertePricing terug, of null als er geen
 * (volledige) pricing in zit. Defensief: jsonb uit de DB is `unknown`.
 */
export function readSnapshotPricing(raw: unknown): ManualOffertePricing | null {
  if (!isPlainObject(raw)) return null
  const pricing = (raw as Record<string, unknown>).pricing
  if (!isPlainObject(pricing)) return null
  const out = {} as ManualOffertePricing
  for (const key of PRICING_KEYS) {
    const val = pricing[key as string]
    if (typeof val !== 'number' || !Number.isFinite(val)) return null
    out[key] = val as ManualOffertePricing[typeof key]
  }
  return out
}

/**
 * Leest de bevroren regels uit een regels_snapshot-waarde. Ondersteunt zowel
 * het nieuwe object-formaat ({ regels: [...] }) als het legacy bare-array-
 * formaat. Geeft null als er geen regel-array te vinden is.
 */
export function readSnapshotRegels(raw: unknown): SnapshotRegel[] | null {
  if (Array.isArray(raw)) return raw as SnapshotRegel[]
  if (isPlainObject(raw) && Array.isArray((raw as Record<string, unknown>).regels)) {
    return (raw as Record<string, unknown>).regels as SnapshotRegel[]
  }
  return null
}

/**
 * Leest de bevroren editor-invoer (`snapshot.data`) uit een regels_snapshot-
 * waarde. Aanwezig vanaf schemaVersie 2 (offertes verstuurd ná deze feature).
 * Ontbrekende velden vallen terug op DEFAULTS zodat de uitkomst altijd een
 * volledige ManualOfferteData is. Geeft null als er geen `data`-object in zit
 * (oude/bot-snapshots) → caller valt terug op de live lead-velden.
 */
export function readSnapshotData(raw: unknown): ManualOfferteData | null {
  if (!isPlainObject(raw)) return null
  const data = (raw as Record<string, unknown>).data
  if (!isPlainObject(data)) return null
  return { ...DEFAULTS, ...(data as Partial<ManualOfferteData>) } as ManualOfferteData
}

/**
 * Bepaalt de bevroren editor-invoer waarmee een revert de lead terugzet: de
 * `data` uit de snapshot van de laatste VERSTUURDE offerte (is_concept===false,
 * hoogste versie), of null als die offerte geen schemaVersie-2-snapshot heeft.
 * Spiegel van resolveSeedPricing, maar voor de volledige invoer i.p.v. pricing.
 */
export function resolveSeedData(offertes: SeedOfferte[]): ManualOfferteData | null {
  const verstuurd = offertes
    .filter((o) => o.is_concept === false)
    .sort((a, b) => b.versie - a.versie)[0]
  if (!verstuurd) return null
  return readSnapshotData(verstuurd.regels_snapshot)
}
