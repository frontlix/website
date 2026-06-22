import { describe, it, expect } from 'vitest'
import {
  readSnapshotPricing,
  readSnapshotRegels,
  buildPricingFromRuleKeys,
  resolveSeedPricing,
  buildOfferteSnapshot,
} from './offerte-snapshot'
import { FALLBACK_PRICING } from './pricing-types'

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
})
