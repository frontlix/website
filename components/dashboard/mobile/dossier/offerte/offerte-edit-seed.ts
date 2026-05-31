// Bouwt de begin-state van de mobiele offerte-editor uit echte lead-data:
// bestaande prijsregels → editor-regels (via catalogus-match), korstmos-toeslag,
// korting-prefill en het standaard persoonlijke bericht. Puur, geen React.

import {
  SS_CATALOG_BY_KEY,
  SS_TOESLAG_PRESETS,
  type OfferteLine,
  type OfferteUnit,
  type Toeslag,
  type BtwKey,
} from './offerte-edit-model'

// ── input/output types ──

export type EditorKlant = { naam: string; bedrijf: string; straat: string; pcplaats: string }

export type SeedRegel = {
  omschrijving: string
  aantal: number | null
  eenheid: string | null
  stukprijs: number
}

export type OfferteSeedInput = {
  klant: EditorKlant
  m2: number
  voornaam: string
  korstmos: boolean
  kortingPct: number
  kortingNote: string
  seedRegels: SeedRegel[]
}

export type OfferteSeed = {
  lines: OfferteLine[]
  toeslagen: Toeslag[]
  kortingPct: number
  kortingNote: string
  btwKey: BtwKey
  dagen: number
  bericht: string
}

// ── catalogus-match (keyword-heuristiek) ──
// Mapt een vrije omschrijving naar een catalogus-key; geen match → 'custom'.
// Volgorde van checks is bewust: specifiekere termen (onkruid/normaal) eerst,
// zodat 'invegen onkruidwerend' niet per ongeluk als 'invegen_normaal' eindigt.
export function matchCatalogKey(omschrijving: string): string {
  const s = (omschrijving || '').toLowerCase()

  // Invegen (arbeid): onderscheid normaal vs onkruidwerend.
  if (s.includes('invegen') || s.includes('voegen')) {
    return s.includes('onkruid') ? 'invegen_onkruid' : 'invegen_normaal'
  }
  // Voegzand (materiaal): normaal vs onkruidwerend.
  if (s.includes('voegzand')) {
    return s.includes('onkruid') ? 'voegzand_onkruid' : 'voegzand_normaal'
  }
  // Preventieve onkruidbeheersing (vóór de algemene reiniging-check).
  if (s.includes('preventie')) return 'preventieve_onkruid'
  if (s.includes('beschermlaag') || s.includes('bescherm')) return 'beschermlaag'
  if (s.includes('reiskosten') || s.includes('reiskost')) return 'reiskosten'
  if (s.includes('plant')) return 'planten'

  // Onderhoud → frequentie uit de tekst halen (4/8/12/16 weken).
  if (s.includes('onderhoud')) {
    if (s.includes('16')) return 'onderhoud_16w'
    if (s.includes('12')) return 'onderhoud_12w'
    if (s.includes('8')) return 'onderhoud_8w'
    return 'onderhoud_4w'
  }

  // Reiniging als laatste algemene check (anders zou 'voegen' e.d. al gevangen zijn).
  if (s.includes('reinig')) return 'reiniging'

  return 'custom'
}

// ── standaard persoonlijk bericht (seed) ──
// Schoon Straatje-aanhef met de voornaam (zie spec §6).
function seedBericht(voornaam: string): string {
  return (
    `Beste ${voornaam},\n\n` +
    `Bedankt voor je aanvraag. Hierbij onze offerte voor het reinigen van je oprit en terras.\n` +
    `Heb je vragen of wil je iets aanpassen? Bel of app ons gerust.\n\n` +
    `Met vriendelijke groet,\n` +
    `Schoon Straatje`
  )
}

/**
 * Begin-state uit echte data:
 * - seedRegels.length > 0 → map elke regel naar een OfferteLine (catalogus-match
 *   of custom-fallback). rate = werkelijk geoffreerde stukprijs.
 * - seedRegels.length === 0 → lege lines (gebruiker voegt toe via picker).
 * - Korstmos-toeslag auto-on alleen bij een verse offerte (korstmos && geen
 *   bestaande regels), om dubbeltelling te voorkomen; preset blijft toevoegbaar.
 * - btwKey '21', dagen 14, korting-prefill uit input.
 *
 * Line-ids zijn deterministisch ('l' + index) — nooit uit een klok/random,
 * dat breekt tests en SSR-hydratie.
 */
export function seedOfferteState(input: OfferteSeedInput): OfferteSeed {
  const lines: OfferteLine[] = input.seedRegels.map((r, i) => {
    const id = `l${i}`
    const key = matchCatalogKey(r.omschrijving)
    const cat = SS_CATALOG_BY_KEY[key]

    if (cat) {
      // Catalogus-match: label/unit/area uit catalogus, maar de werkelijk
      // geoffreerde prijs (stukprijs) behouden, niet de catalogus-rate.
      const aantal = r.aantal ?? 0
      return {
        id,
        key,
        label: cat.label,
        unit: cat.unit,
        rate: r.stukprijs,
        area: cat.area,
        m2: cat.area ? aantal : 0,
        qty: cat.area ? 0 : aantal,
        on: true,
        note: '',
        custom: false,
      }
    }

    // Geen match → vrije regel: eenheid uit de prijsregel (of 'post'); area op m².
    const unit = ((r.eenheid as OfferteUnit) || 'post') as OfferteUnit
    const area = r.eenheid === 'm²'
    const aantal = r.aantal ?? 0
    return {
      id,
      key: 'custom',
      label: r.omschrijving,
      unit,
      rate: r.stukprijs,
      area,
      m2: area ? aantal : 0,
      qty: area ? 0 : aantal,
      on: true,
      note: '',
      custom: true,
    }
  })

  // Korstmos-toeslag: alleen automatisch aan bij een verse offerte uit de catalogus.
  // Bestaande prijsregels hebben de 10% mogelijk al in stukprijs verwerkt.
  const korstmosOn = input.korstmos && input.seedRegels.length === 0
  const toeslagen: Toeslag[] = SS_TOESLAG_PRESETS.filter((p) => p.key === 'korstmos').map((p) => ({
    ...p,
    id: 'tkorstmos',
    on: korstmosOn,
  }))

  return {
    lines,
    toeslagen,
    kortingPct: input.kortingPct ?? 0,
    kortingNote: input.kortingNote ?? '',
    btwKey: '21',
    dagen: 14,
    bericht: seedBericht(input.voornaam),
  }
}
