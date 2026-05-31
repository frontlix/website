import { describe, it, expect } from 'vitest'
import { FALLBACK_PRICING } from '@/lib/dashboard/pricing-types'
import {
  SS_CATALOG,
  offerteTotals,
  btwRate,
  btwLabel,
  lineQty,
  lineAmount,
  eur,
  eur0,
  addDays,
  fmtDatum,
  isoDate,
  type OfferteLine,
  type Toeslag,
} from './offerte-edit-model'

// Minimale line-factory: alleen velden die de totals-formule raakt expliciet.
function line(over: Partial<OfferteLine>): OfferteLine {
  return {
    id: 'l0',
    key: 'reiniging',
    label: 'Reiniging oppervlak',
    unit: 'm²',
    rate: 3.95,
    area: true,
    m2: 0,
    qty: 0,
    on: true,
    note: '',
    custom: false,
    ...over,
  }
}

function toeslag(over: Partial<Toeslag>): Toeslag {
  return { id: 't0', key: 'korstmos', label: 'Korstmos-toeslag', mode: 'pct', value: 10, on: true, ...over }
}

describe('lineQty / lineAmount', () => {
  it('area-regel gebruikt m², overige qty', () => {
    expect(lineQty(line({ area: true, m2: 80, qty: 99 }))).toBe(80)
    expect(lineQty(line({ area: false, m2: 99, qty: 2 }))).toBe(2)
  })
  it('uitgeschakelde regel telt niet mee', () => {
    expect(lineAmount(line({ area: true, m2: 80, rate: 3.95, on: false }))).toBe(0)
    expect(lineAmount(line({ area: true, m2: 80, rate: 3.95, on: true }))).toBeCloseTo(316, 5)
  })
})

describe('btwRate / btwLabel', () => {
  it('verlegd en 0 => 0; anders n/100', () => {
    expect(btwRate('21')).toBeCloseTo(0.21, 5)
    expect(btwRate('9')).toBeCloseTo(0.09, 5)
    expect(btwRate('0')).toBe(0)
    expect(btwRate('verlegd')).toBe(0)
  })
  it('labels', () => {
    expect(btwLabel('21')).toBe('BTW 21%')
    expect(btwLabel('verlegd')).toBe('BTW verlegd')
  })
})

describe('offerteTotals', () => {
  // Representatieve case: één area-regel + één qty-regel, een actieve pct-toeslag,
  // een vast-bedrag toeslag, 10% korting. BTW 21% vs verlegd (0).
  const lines: OfferteLine[] = [
    line({ id: 'l0', area: true, m2: 80, rate: 3.95 }), // 316,00
    line({ id: 'l1', key: 'planten', area: false, qty: 2, rate: 8.5 }), // 17,00
  ]
  const toeslagen: Toeslag[] = [
    toeslag({ id: 't0', mode: 'pct', value: 10, on: true }), // 33,30 (10% van 333)
    toeslag({ id: 't1', key: 'voorrij', label: 'Voorrijkosten', mode: 'bedrag', value: 25, on: true }), // 25,00
  ]

  it('rekent sub0, toeslagen, korting en btw 21% exact', () => {
    const t = offerteTotals(lines, toeslagen, 10, '21')
    expect(t.sub0).toBeCloseTo(333, 5)
    expect(t.toeslagRegels).toHaveLength(2)
    expect(t.toeslagRegels[0]).toEqual({ label: 'Korstmos-toeslag (10%)', bedrag: 33.3 })
    expect(t.toeslagRegels[1]).toEqual({ label: 'Voorrijkosten', bedrag: 25 })
    // subNa = 333 + 58,30 = 391,30 ; korting 10% = 39,13 ; subNet = 352,17
    expect(t.korting).toBeCloseTo(39.13, 5)
    expect(t.subNet).toBeCloseTo(352.17, 5)
    // btw = round2(352,17 × 0,21) = 73,96 ; totaal = round2(352,17 + 73,96) = 426,13.
    // Geld kent maximaal 2 decimalen; offerteTotals rondt elke geld-regel op centen af.
    expect(t.btw).toBeCloseTo(73.96, 2)
    expect(t.totaal).toBeCloseTo(426.13, 2)
  })

  it('btw verlegd => 0 btw, totaal == subNet', () => {
    const t = offerteTotals(lines, toeslagen, 10, 'verlegd')
    expect(t.btw).toBe(0)
    expect(t.totaal).toBeCloseTo(352.17, 5)
  })

  it('uitgeschakelde toeslag telt niet mee', () => {
    const t = offerteTotals(lines, [toeslag({ on: false })], 0, '21')
    expect(t.toeslagRegels).toHaveLength(0)
    expect(t.sub0).toBeCloseTo(333, 5)
    expect(t.totaal).toBeCloseTo(333 * 1.21, 5)
  })
})

describe('SS_CATALOG ↔ FALLBACK_PRICING', () => {
  // Borgt dat geen enkel catalogus-tarief kan driften van de fallback-constants.
  const RATE_FIELD: Record<string, keyof typeof FALLBACK_PRICING> = {
    reiniging: 'reiniging_per_m2',
    invegen_normaal: 'arbeid_invegen_normaal_per_m2',
    invegen_onkruid: 'arbeid_invegen_onkruidwerend_per_m2',
    voegzand_normaal: 'voegzand_normaal_per_zak',
    voegzand_onkruid: 'voegzand_onkruidwerend_per_zak',
    beschermlaag: 'beschermlaag_per_m2',
    preventieve_onkruid: 'preventieve_onkruid_per_m2',
    onderhoud_4w: 'plan_4w_per_m2',
    onderhoud_8w: 'plan_8w_per_m2',
    onderhoud_12w: 'plan_12w_per_m2',
    onderhoud_16w: 'plan_16w_per_m2',
    planten: 'plantenafscherming_per_rol',
    reiskosten: 'reiskosten_per_km',
  }

  it('elke catalogus-rate == het matchende FALLBACK_PRICING-veld', () => {
    for (const item of SS_CATALOG) {
      const field = RATE_FIELD[item.key]
      expect(field, `geen mapping voor catalogus-key '${item.key}'`).toBeDefined()
      expect(item.rate).toBe(FALLBACK_PRICING[field])
    }
  })

  it('dekt alle catalogus-keys (geen ongedekte regel)', () => {
    const covered = Object.keys(RATE_FIELD).sort()
    const catKeys = SS_CATALOG.map((c) => c.key).sort()
    expect(catKeys).toEqual(covered)
  })
})

describe('geld-helpers', () => {
  it('eur — nl-NL, 2 decimalen, komma', () => {
    expect(eur(1234.56)).toBe('€1.234,56')
    expect(eur(0)).toBe('€0,00')
  })
  it('eur0 — afgerond op hele euro', () => {
    expect(eur0(1234.56)).toBe('€1.235')
    expect(eur0(0)).toBe('€0')
  })
})

describe('datum-helpers', () => {
  it('addDays laat de basis ongemoeid', () => {
    const base = new Date(2026, 4, 31) // 31 mei 2026
    const out = addDays(base, 14)
    expect(isoDate(out)).toBe('2026-06-14')
    expect(isoDate(base)).toBe('2026-05-31') // basis niet gemuteerd
  })
  it('fmtDatum gebruikt nl-NL maand-afkorting', () => {
    expect(fmtDatum(new Date(2026, 5, 14))).toBe('14 jun 2026')
    expect(fmtDatum(new Date(2026, 0, 1))).toBe('1 jan 2026')
  })
  it('isoDate zero-pad maand en dag', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
