import { describe, it, expect } from 'vitest'
import {
  readSnapshotPricing,
  readSnapshotRegels,
  readSnapshotData,
  buildPricingFromRuleKeys,
  resolveSeedPricing,
  resolveSeedData,
  buildOfferteSnapshot,
  reconstructSnapshotFromRegels,
} from './offerte-snapshot'
import { FALLBACK_PRICING } from './pricing-types'
import { DEFAULTS } from './manual-offerte-types'

describe('readSnapshotPricing', () => {
  it('geeft pricing terug uit een geldig snapshot-object', () => {
    const snap = {
      schemaVersie: 1,
      pricing: { ...FALLBACK_PRICING, reiniging_per_m2: 9.99 },
      regels: [],
      kortingPct: 0,
    }
    const out = readSnapshotPricing(snap)
    expect(out?.reiniging_per_m2).toBe(9.99)
    // overige velden ongemoeid t.o.v. de fallback
    expect(out?.voegzand_m2_per_zak).toBe(FALLBACK_PRICING.voegzand_m2_per_zak)
  })

  it('geeft null bij null, array of onvolledige pricing', () => {
    expect(readSnapshotPricing(null)).toBeNull()
    expect(readSnapshotPricing([])).toBeNull() // legacy bare-array heeft geen pricing
    expect(readSnapshotPricing({ pricing: { reiniging_per_m2: 1 } })).toBeNull() // mist velden
    expect(
      readSnapshotPricing({ pricing: { ...FALLBACK_PRICING, reiniging_per_m2: 'x' } }),
    ).toBeNull() // niet-numeriek veld
  })
})

describe('readSnapshotRegels', () => {
  const regel = {
    omschrijving: 'Reiniging oppervlak (dagprijs)',
    aantal: 1,
    eenheid: 'dag',
    stukprijs: 395,
    totaal: 395,
    volgorde: 1,
  }

  it('geeft regels uit het nieuwe object-formaat', () => {
    const snap = { schemaVersie: 1, pricing: FALLBACK_PRICING, regels: [regel], kortingPct: 0 }
    expect(readSnapshotRegels(snap)).toEqual([regel])
  })

  it('geeft de bare array bij het legacy-formaat', () => {
    expect(readSnapshotRegels([regel])).toEqual([regel])
  })

  it('geeft null bij rommel', () => {
    expect(readSnapshotRegels(null)).toBeNull()
    expect(readSnapshotRegels({ geen: 'regels' })).toBeNull()
  })
})

describe('buildPricingFromRuleKeys', () => {
  it('mapt rule_keys op de dashboard-prijsvorm', () => {
    const map = new Map<string, number>([
      ['reinigen_per_m2', 4.2],
      ['invegen_arbeid_normaal_per_m2', 1.1],
      ['onkruid_per_m2_langer', 4.5],
      ['planten_afschermen_folie_per_rol', 8.5],
      ['reiskosten_gratis_tot_km', 50],
    ])
    const p = buildPricingFromRuleKeys(map)
    expect(p.reiniging_per_m2).toBe(4.2)
    expect(p.arbeid_invegen_normaal_per_m2).toBe(1.1)
    expect(p.preventieve_onkruid_per_m2).toBe(4.5)
    expect(p.plan_16w_per_m2).toBe(4.5)
    expect(p.plantenafscherming_per_rol).toBe(8.5)
    expect(p.reiskosten_drempel_km).toBe(50)
  })

  it('valt per veld terug op FALLBACK_PRICING bij een lege map', () => {
    const p = buildPricingFromRuleKeys(new Map())
    expect(p).toEqual(FALLBACK_PRICING)
  })
})

describe('resolveSeedPricing', () => {
  const live = { ...FALLBACK_PRICING, reiniging_per_m2: 5.25 }

  function offerte(over: Record<string, unknown>) {
    return { versie: 1, is_concept: false, regels_snapshot: null, ...over } as any
  }

  it('seedt uit de snapshot van de laatste verstuurde offerte', () => {
    const offertes = [
      offerte({
        versie: 1,
        is_concept: false,
        regels_snapshot: {
          schemaVersie: 1,
          pricing: { ...FALLBACK_PRICING, reiniging_per_m2: 7.77 },
          regels: [],
          kortingPct: 0,
        },
      }),
    ]
    expect(resolveSeedPricing(offertes, live).reiniging_per_m2).toBe(7.77)
  })

  it('kiest de hoogste verstuurde versie, negeert het concept', () => {
    const offertes = [
      offerte({ versie: 3, is_concept: true, regels_snapshot: null }), // concept negeren
      offerte({
        versie: 2,
        is_concept: false,
        regels_snapshot: {
          schemaVersie: 1,
          pricing: { ...FALLBACK_PRICING, reiniging_per_m2: 2.22 },
          regels: [],
          kortingPct: 0,
        },
      }),
      offerte({
        versie: 1,
        is_concept: false,
        regels_snapshot: {
          schemaVersie: 1,
          pricing: { ...FALLBACK_PRICING, reiniging_per_m2: 1.11 },
          regels: [],
          kortingPct: 0,
        },
      }),
    ]
    expect(resolveSeedPricing(offertes, live).reiniging_per_m2).toBe(2.22)
  })

  it('valt terug op live pricing zonder bruikbare snapshot', () => {
    expect(resolveSeedPricing([offerte({ regels_snapshot: null })], live).reiniging_per_m2).toBe(5.25)
    expect(resolveSeedPricing([], live).reiniging_per_m2).toBe(5.25)
  })
})

describe('buildOfferteSnapshot', () => {
  const rules = [
    { desc: 'Reiniging oppervlak (dagprijs)', aantal: 1, eenheid: 'dag', prijs: 395, totaal: 395 },
    { desc: 'Preventieve onkruidbeheersing', aantal: 90, eenheid: 'm²', prijs: 4.5, totaal: 405.001 },
  ]

  it('bouwt een snapshot met pricing, kortingPct en gemapte regels', () => {
    const snap = buildOfferteSnapshot({
      pricing: FALLBACK_PRICING,
      rules,
      kortingPct: 10,
      geldigheidDagen: 14,
    })
    expect(snap.schemaVersie).toBe(1)
    expect(snap.pricing).toEqual(FALLBACK_PRICING)
    expect(snap.kortingPct).toBe(10)
    expect(snap.geldigheidDagen).toBe(14)
    expect(snap.regels).toHaveLength(2)
    // desc → omschrijving, prijs → stukprijs, totaal afgerond, volgorde oplopend
    expect(snap.regels[0]).toMatchObject({
      omschrijving: 'Reiniging oppervlak (dagprijs)',
      stukprijs: 395,
      bron: 'auto_lead',
      volgorde: 1,
    })
    expect(snap.regels[1].totaal).toBe(405) // 405.001 afgerond op 2 decimalen
    expect(snap.regels[1].volgorde).toBe(2)
  })

  it('laat geldigheidDagen weg als die niet is meegegeven', () => {
    const snap = buildOfferteSnapshot({ pricing: FALLBACK_PRICING, rules: [], kortingPct: 0 })
    expect(snap.geldigheidDagen).toBeUndefined()
  })

  // De seed (resolveSeedPricing) moet de pricing exact kunnen teruglezen.
  it('produceert een snapshot die readSnapshotPricing accepteert', () => {
    const snap = buildOfferteSnapshot({ pricing: FALLBACK_PRICING, rules, kortingPct: 0 })
    expect(readSnapshotPricing(snap)).toEqual(FALLBACK_PRICING)
  })

  it('zonder data → schemaVersie 1 en geen data-veld', () => {
    const snap = buildOfferteSnapshot({ pricing: FALLBACK_PRICING, rules, kortingPct: 0 })
    expect(snap.schemaVersie).toBe(1)
    expect(snap.data).toBeUndefined()
  })

  it('met data → schemaVersie 2 en de invoer bevroren', () => {
    const data = { ...DEFAULTS, m2: 44, afstand_km: 171 }
    const snap = buildOfferteSnapshot({ pricing: FALLBACK_PRICING, rules, kortingPct: 0, data })
    expect(snap.schemaVersie).toBe(2)
    expect(snap.data?.m2).toBe(44)
    expect(snap.data?.afstand_km).toBe(171)
  })
})

describe('readSnapshotData', () => {
  it('leest de bevroren invoer en vult ontbrekende velden met DEFAULTS', () => {
    // Snapshot met een PARTIELE data (alleen m2 + afstand) → de rest valt op DEFAULTS.
    const snap = { schemaVersie: 2, pricing: FALLBACK_PRICING, regels: [], kortingPct: 0, data: { m2: 44, afstand_km: 171 } }
    const out = readSnapshotData(snap)
    expect(out?.m2).toBe(44)
    expect(out?.afstand_km).toBe(171)
    // ontbrekend veld → DEFAULTS-waarde
    expect(out?.onderhoud_weken).toBe(DEFAULTS.onderhoud_weken)
  })

  it('geeft null bij een snapshot zonder data-veld (schemaVersie 1 / bot)', () => {
    expect(readSnapshotData({ schemaVersie: 1, pricing: FALLBACK_PRICING, regels: [], kortingPct: 0 })).toBeNull()
    expect(readSnapshotData(null)).toBeNull()
    expect(readSnapshotData([])).toBeNull()
  })

  it('round-trip: buildOfferteSnapshot(data) → readSnapshotData geeft dezelfde invoer', () => {
    const data = { ...DEFAULTS, m2: 88, afstand_km: 12, korting_percentage: 15 }
    const snap = buildOfferteSnapshot({ pricing: FALLBACK_PRICING, rules: [], kortingPct: 15, data })
    const out = readSnapshotData(snap)
    expect(out).toEqual(data)
  })
})

describe('resolveSeedData', () => {
  function offerte(over: Record<string, unknown>) {
    return { versie: 1, is_concept: false, regels_snapshot: null, ...over } as any
  }

  it('geeft de bevroren invoer van de laatste verstuurde offerte', () => {
    const offertes = [
      offerte({ versie: 3, is_concept: true, regels_snapshot: { schemaVersie: 2, data: { m2: 999 } } }), // concept negeren
      offerte({
        versie: 2,
        is_concept: false,
        regels_snapshot: { schemaVersie: 2, pricing: FALLBACK_PRICING, regels: [], kortingPct: 0, data: { m2: 44 } },
      }),
    ]
    expect(resolveSeedData(offertes)?.m2).toBe(44)
  })

  it('geeft null als de verstuurde offerte geen data-snapshot heeft (oud/bot)', () => {
    const offertes = [offerte({ versie: 1, is_concept: false, regels_snapshot: { schemaVersie: 1, pricing: FALLBACK_PRICING, regels: [], kortingPct: 0 } })]
    expect(resolveSeedData(offertes)).toBeNull()
  })

  it('geeft null zonder verstuurde offerte', () => {
    expect(resolveSeedData([])).toBeNull()
    expect(resolveSeedData([offerte({ is_concept: true })])).toBeNull()
  })
})

describe('reconstructSnapshotFromRegels (backfill)', () => {
  // Live prijslijst staat op 5,25 (de afwijking), maar de verzonden regels
  // bevatten de bevroren 4,50.
  const live = {
    ...FALLBACK_PRICING,
    reiniging_per_m2: 5.25,
    preventieve_onkruid_per_m2: 5.25,
    reinigen_dagprijs_onder_100m2: 395,
  }

  it('reconstrueert de bevroren pricing uit herkende regels', () => {
    const rows = [
      { omschrijving: 'Reiniging oppervlak (dagprijs)', aantal: 1, eenheid: 'dag', stukprijs: 395, totaal: 395, volgorde: 1 },
      { omschrijving: 'Invegen normaal voegzand excl voegzand', aantal: 90, eenheid: 'm²', stukprijs: 0.9, totaal: 81, volgorde: 2 },
      { omschrijving: 'Preventieve onkruidbeheersing', aantal: 90, eenheid: 'm²', stukprijs: 4.5, totaal: 405, volgorde: 3 },
      { omschrijving: 'Afdekfolie planten', aantal: 2, eenheid: 'rol', stukprijs: 8.5, totaal: 17, volgorde: 4 },
      { omschrijving: 'Reiskosten (157 km enkele reis, retour)', aantal: 163.8, eenheid: 'km', stukprijs: 0.23, totaal: 37.67, volgorde: 5 },
    ]
    const snap = reconstructSnapshotFromRegels(rows, live, 0)
    // Bevroren tarieven, niet de live 5,25.
    expect(snap.pricing.reinigen_dagprijs_onder_100m2).toBe(395)
    expect(snap.pricing.arbeid_invegen_normaal_per_m2).toBe(0.9)
    expect(snap.pricing.preventieve_onkruid_per_m2).toBe(4.5)
    expect(snap.pricing.plantenafscherming_per_rol).toBe(8.5)
    expect(snap.pricing.reiskosten_per_km).toBe(0.23)
    expect(snap.regels).toHaveLength(5)
    expect(readSnapshotPricing(snap)).not.toBeNull()
  })

  it('laat onherkende prijs-keys ongemoeid op de live-waarde', () => {
    const rows = [
      { omschrijving: 'Een of andere maatwerkregel', aantal: 1, eenheid: 'st', stukprijs: 99, totaal: 99, volgorde: 1 },
    ]
    const snap = reconstructSnapshotFromRegels(rows, live, 0)
    expect(snap.pricing.reiniging_per_m2).toBe(5.25) // ongewijzigd
    expect(snap.regels).toHaveLength(1)
    expect(snap.regels[0].omschrijving).toBe('Een of andere maatwerkregel')
  })

  it('neemt het kortingspercentage over', () => {
    const snap = reconstructSnapshotFromRegels([], live, 12.5)
    expect(snap.kortingPct).toBe(12.5)
  })
})
