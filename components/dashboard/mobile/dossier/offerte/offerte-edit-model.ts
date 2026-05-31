// Puur model voor de mobiele offerte-editor (Optie A). Geen React.
// Bevat: types, de echte Schoon Straatje-catalogus (afgeleid uit
// FALLBACK_PRICING zodat tarieven niet kunnen driften), de totaal-formule
// uit de handoff, en geld/datum-helpers (nl-NL, komma-decimaal).

import { FALLBACK_PRICING } from '@/lib/dashboard/pricing-types'

// ── types ──

export type OfferteUnit = 'm²' | 'zak' | 'rol' | 'km' | 'minuut' | 'stuk' | 'm' | 'uur' | 'post'

export type CatalogItem = {
  key: string
  label: string
  unit: OfferteUnit
  rate: number
  area: boolean // true => hoeveelheid = m2; false => hoeveelheid = qty
  defaultQty?: number // voor niet-area regels
}

export type OfferteLine = {
  id: string // stabiele id (bv. `l${n}`)
  key: string // catalogus-key of 'custom'
  label: string
  unit: OfferteUnit
  rate: number
  area: boolean
  m2: number
  qty: number
  on: boolean // uit => telt niet mee, kaart 50% opacity
  note: string // klant-zichtbare notitie
  custom: boolean // vrije regel
}

export type ToeslagMode = 'pct' | 'bedrag'
export type Toeslag = {
  id: string
  key: string
  label: string
  mode: ToeslagMode
  value: number
  on: boolean
}

export type BtwKey = '21' | '9' | '0' | 'verlegd'

export type OfferteTotals = {
  sub0: number
  toeslagRegels: { label: string; bedrag: number }[]
  korting: number
  subNet: number
  btw: number
  totaal: number
}

// ── units (vrije-regel UnitPicker) ──
export const SS_UNITS: OfferteUnit[] = ['m²', 'zak', 'rol', 'km', 'minuut', 'stuk', 'm', 'uur', 'post']

// ── catalogus ──
// Alle `rate`-waarden komen uit FALLBACK_PRICING (geen losse hardcode); een test
// borgt de gelijkheid. Onderhoud-plannen mappen op plan_4w/8w/12w/16w_per_m2.
export const SS_CATALOG: CatalogItem[] = [
  { key: 'reiniging', label: 'Reiniging oppervlak', unit: 'm²', rate: FALLBACK_PRICING.reiniging_per_m2, area: true },
  {
    key: 'invegen_normaal',
    label: 'Invegen normaal voegzand (arbeid)',
    unit: 'm²',
    rate: FALLBACK_PRICING.arbeid_invegen_normaal_per_m2,
    area: true,
  },
  {
    key: 'invegen_onkruid',
    label: 'Invegen onkruidwerend (arbeid)',
    unit: 'm²',
    rate: FALLBACK_PRICING.arbeid_invegen_onkruidwerend_per_m2,
    area: true,
  },
  {
    key: 'voegzand_normaal',
    label: 'Voegzand normaal (15 kg/zak)',
    unit: 'zak',
    rate: FALLBACK_PRICING.voegzand_normaal_per_zak,
    area: false,
    defaultQty: 1,
  },
  {
    key: 'voegzand_onkruid',
    label: 'Voegzand onkruidwerend (15 kg/zak)',
    unit: 'zak',
    rate: FALLBACK_PRICING.voegzand_onkruidwerend_per_zak,
    area: false,
    defaultQty: 1,
  },
  {
    key: 'beschermlaag',
    label: 'Beschermlaag aanbrengen',
    unit: 'm²',
    rate: FALLBACK_PRICING.beschermlaag_per_m2,
    area: true,
  },
  {
    key: 'preventieve_onkruid',
    label: 'Preventieve onkruidbeheersing',
    unit: 'm²',
    rate: FALLBACK_PRICING.preventieve_onkruid_per_m2,
    area: true,
  },
  {
    key: 'onderhoud_4w',
    label: 'Onderhoud (elke 4 weken)',
    unit: 'm²',
    rate: FALLBACK_PRICING.plan_4w_per_m2,
    area: true,
  },
  {
    key: 'onderhoud_8w',
    label: 'Onderhoud (elke 8 weken)',
    unit: 'm²',
    rate: FALLBACK_PRICING.plan_8w_per_m2,
    area: true,
  },
  {
    key: 'onderhoud_12w',
    label: 'Onderhoud (elke 12 weken)',
    unit: 'm²',
    rate: FALLBACK_PRICING.plan_12w_per_m2,
    area: true,
  },
  {
    key: 'onderhoud_16w',
    label: 'Onderhoud (elke 16 weken)',
    unit: 'm²',
    rate: FALLBACK_PRICING.plan_16w_per_m2,
    area: true,
  },
  {
    key: 'planten',
    label: 'Planten afschermen (afdekfolie)',
    unit: 'rol',
    rate: FALLBACK_PRICING.plantenafscherming_per_rol,
    area: false,
    defaultQty: 1,
  },
  {
    key: 'reiskosten',
    label: 'Reiskosten',
    unit: 'km',
    rate: FALLBACK_PRICING.reiskosten_per_km,
    area: false,
    defaultQty: 1,
  },
]

// Lookup-map voor snelle key→item resolutie (seed/picker).
export const SS_CATALOG_BY_KEY: Record<string, CatalogItem> = Object.fromEntries(
  SS_CATALOG.map((c) => [c.key, c]),
)

// ── toeslag-presets ──
// Alleen Korstmos-toeslag 10% (pct); "eigen toeslag" via add (custom % of vast bedrag).
export const SS_TOESLAG_PRESETS: Omit<Toeslag, 'id' | 'on'>[] = [
  { key: 'korstmos', label: 'Korstmos-toeslag', mode: 'pct', value: 10 },
]

// ── BTW ──
export const BTW_OPTIONS: { key: BtwKey; kort: string }[] = [
  { key: '21', kort: '21%' },
  { key: '9', kort: '9%' },
  { key: '0', kort: '0%' },
  { key: 'verlegd', kort: 'Verlegd' },
]

/** BTW-percentage als fractie; 'verlegd' en '0' => 0, anders n/100. */
export function btwRate(k: BtwKey): number {
  return k === 'verlegd' ? 0 : Number(k) / 100
}

/** Label voor de BTW-regel ('BTW 21%' of 'BTW verlegd'). */
export function btwLabel(k: BtwKey): string {
  return k === 'verlegd' ? 'BTW verlegd' : `BTW ${k}%`
}

// ── regel-bedragen ──

/** Hoeveelheid van een regel: m² bij area-regel, anders qty. */
export function lineQty(l: OfferteLine): number {
  return l.area ? l.m2 : l.qty
}

/** Regelbedrag: uitgeschakelde regels tellen niet mee (0). */
export function lineAmount(l: OfferteLine): number {
  return l.on ? lineQty(l) * l.rate : 0
}

/** Rond af op centen (2 decimalen) — voorkomt float-staarten op geld-regels. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Totaal-formule (exact uit de handoff):
 *   sub0    = Σ lineAmount over on-regels
 *   toeslag = pct ? sub0 * value/100 : value (vast)
 *   subNa   = sub0 + Σ toeslagen
 *   korting = subNa * kortingPct/100
 *   subNet  = subNa - korting
 *   btw     = subNet * btwRate
 *   totaal  = subNet + btw
 */
export function offerteTotals(
  lines: OfferteLine[],
  toeslagen: Toeslag[],
  kortingPct: number,
  btwKey: BtwKey,
): OfferteTotals {
  const sub0 = lines.reduce((s, l) => s + lineAmount(l), 0)
  // Actieve toeslagen → label (met % achtervoegsel bij pct) + berekend bedrag.
  // Pct-bedragen op centen afronden: een geld-regel kan geen float-staart hebben
  // (333 × 10% levert in JS 33.300000000000004; round2 maakt dat netjes 33,30).
  const toeslagRegels = toeslagen
    .filter((t) => t.on)
    .map((t) => ({
      label: t.label + (t.mode === 'pct' ? ` (${t.value}%)` : ''),
      bedrag: t.mode === 'pct' ? round2(sub0 * (t.value / 100)) : t.value,
    }))
  const tsom = toeslagRegels.reduce((s, x) => s + x.bedrag, 0)
  const subNa = sub0 + tsom
  // Geld-bedragen op centen afronden zodat float-staarten (bv. 352,17 × 0,21 =
  // 73.9557000…000007) niet doorsijpelen in korting/BTW/totaal. Elke stap rondt
  // af op de uitkomst van de vorige zodat de regels onderling optellen.
  const korting = round2(subNa * (kortingPct / 100))
  const subNet = round2(subNa - korting)
  const btw = round2(subNet * btwRate(btwKey))
  const totaal = round2(subNet + btw)
  return { sub0, toeslagRegels, korting, subNet, btw, totaal }
}

// ── geld + datum ──

/** '€1.234,56' — nl-NL, altijd 2 decimalen (komma als decimaalteken). */
export function eur(n: number): string {
  return '€' + (n || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** '€1.234' — afgerond op hele euro's. */
export function eur0(n: number): string {
  return '€' + Math.round(n || 0).toLocaleString('nl-NL')
}

// Maand-afkortingen voor fmtDatum (nl-NL, 3 letters).
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

/** Nieuwe Date, `d` dagen na `base` (laat `base` zelf ongemoeid). */
export function addDays(base: Date, d: number): Date {
  const x = new Date(base)
  x.setDate(x.getDate() + d)
  return x
}

/** '14 jun 2026' — dag + maand-afkorting + jaar. */
export function fmtDatum(d: Date): string {
  return `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`
}

/** '2026-06-14' — ISO-datum (lokale velden), voor <input type="date">. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
