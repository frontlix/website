import { describe, it, expect } from 'vitest'
import { computeRules, computeTotals } from './manual-offerte-rules'
import { DEFAULTS, type ManualOfferteData } from './manual-offerte-types'
import { FALLBACK_PRICING } from './pricing-types'

function makeData(over: Partial<ManualOfferteData>): ManualOfferteData {
  return { ...DEFAULTS, ...over }
}

// Regressietests voor twee bugs die de app-offerte deden afwijken van de
// gemailde offerte: (1) een Invegen-opmerking belandde onder de Voegzand-regel,
// (2) de afdekfolie-default week af van de bot (2 i.p.v. 1 rol).

describe('opmerking-plaatsing', () => {
  it('een Invegen-opmerking komt onder de Invegen-regel, NIET de losse Voegzand-regel', () => {
    const data = makeData({
      sub: ['invegen'],
      m2: 50,
      voegzand_normaal_actief: true,
      voegzand_normaal_m2: 50,
      voegzand_normaal_zakken: 4,
      regel_opmerkingen: {
        // De editor slaat de Invegen-checkbox-opmerking op onder deze sleutel.
        voegzand_normaal: { tekst: 'goed dat je dit doet', zichtbaar: true },
      },
    })
    const rules = computeRules(data)
    const invegen = rules.find((r) => r.desc === 'Invegen normaal voegzand excl voegzand')
    const voegzand = rules.find((r) => r.desc.startsWith('Voegzand normaal'))

    expect(invegen).toBeTruthy()
    expect(voegzand).toBeTruthy()
    // Onder de Invegen-arbeidsregel (de EERSTE regel van het onderdeel).
    expect(invegen?.opmerking).toBe('goed dat je dit doet')
    // En NIET onder de losse voegzand-productregel die erna komt.
    expect(voegzand?.opmerking).toBeUndefined()
  })
})

describe('afdekfolie planten', () => {
  it('default is 1 rol (gelijk aan de bot), niet 2', () => {
    const data = makeData({
      sub: ['invegen'],
      m2: 50,
      planten_afschermen_actief: true,
      // planten_afschermen_rollen komt uit DEFAULTS en moet 1 zijn.
    })
    const rules = computeRules(data)
    const folie = rules.find((r) => r.desc === 'Afdekfolie planten')
    expect(folie).toBeTruthy()
    expect(folie?.aantal).toBe(1)
    expect(folie?.totaal).toBe(folie!.prijs) // 1 × stukprijs
  })
})

describe('Reiniging-regel staat los van invegen (gelijk aan de bot)', () => {
  it('oprit-lead met alleen preventieve onkruid + beschermlaag (GEEN invegen) krijgt toch de Reiniging-regel', () => {
    const data = makeData({
      hoofdcategorie: ['oprit_terras_terrein'],
      sub: ['preventieve_onkruid', 'beschermlaag'],
      m2: 150,
    })
    const rules = computeRules(data)
    // Sinds de staffel: dagprijs (eerste 100 m²) + losse meerprijs-regel boven 100.
    const dagprijs = rules.find((r) => r.desc === 'Reiniging oppervlak (dagprijs)')
    expect(dagprijs).toBeTruthy()
    const boven = rules.find((r) => r.desc === 'Reiniging oppervlak (boven 100 m²)')
    expect(boven?.aantal).toBe(50) // 150 - 100 = de m² bóven de drempel
  })

  it('voegzand-product zonder invegen-sub komt toch op de offerte', () => {
    const data = makeData({
      hoofdcategorie: ['oprit_terras_terrein'],
      sub: ['beschermlaag'], // geen invegen
      m2: 150,
      voegzand_normaal_actief: true,
      voegzand_normaal_zakken: 3,
      voegzand_normaal_prijs: 2.9,
    })
    const rules = computeRules(data)
    expect(rules.find((r) => r.desc.startsWith('Voegzand normaal'))).toBeTruthy()
  })
})

describe('Reiniging staffel: dagprijs (eerste 100 m²) + meerprijs boven 100', () => {
  const oprit = (m2: number) =>
    computeRules(
      makeData({ hoofdcategorie: ['oprit_terras_terrein'], sub: ['beschermlaag'], m2 }),
      FALLBACK_PRICING,
    )
  const reinigingTotaal = (m2: number) =>
    oprit(m2)
      .filter((r) => r.desc.startsWith('Reiniging'))
      .reduce((s, r) => s + r.totaal, 0)

  it('≤ 100 m² = alleen de vaste dagprijs, geen meerprijs-regel', () => {
    const rules = oprit(100)
    expect(rules.find((r) => r.desc === 'Reiniging oppervlak (dagprijs)')?.totaal).toBe(
      FALLBACK_PRICING.reinigen_dagprijs_onder_100m2,
    )
    expect(rules.find((r) => r.desc === 'Reiniging oppervlak (boven 100 m²)')).toBeUndefined()
    expect(reinigingTotaal(100)).toBe(FALLBACK_PRICING.reinigen_dagprijs_onder_100m2)
  })

  it('105 m² = dagprijs + 5 m² × per-m², en de meerprijs telt alleen de m² boven 100', () => {
    const rules = oprit(105)
    const boven = rules.find((r) => r.desc === 'Reiniging oppervlak (boven 100 m²)')!
    expect(boven.aantal).toBe(5)
    expect(boven.totaal).toBeCloseTo(5 * FALLBACK_PRICING.reiniging_per_m2, 2)
    expect(reinigingTotaal(105)).toBeCloseTo(
      FALLBACK_PRICING.reinigen_dagprijs_onder_100m2 + 5 * FALLBACK_PRICING.reiniging_per_m2,
      2,
    )
  })

  it('geen sprong op de grens: 101 m² is duurder dan 100 m² (was eerder goedkoper)', () => {
    expect(reinigingTotaal(101)).toBeGreaterThan(reinigingTotaal(100))
  })
})

describe('korstmos-toeslag berekent zoals de bot', () => {
  it('toeslag = 10% van ALLEEN de Reiniging-regel, niet van alle diensten', () => {
    const data = makeData({
      hoofdcategorie: ['oprit_terras_terrein'],
      sub: ['preventieve_onkruid', 'beschermlaag'],
      m2: 150,
      korstmos: 'ja',
    })
    const rules = computeRules(data)
    const totals = computeTotals(rules, data)
    const reinigingTotaal = rules
      .filter((r) => r.desc.startsWith('Reiniging'))
      .reduce((s, r) => s + r.totaal, 0)
    const alleDiensten = rules
      .filter((r) => r.eenheid !== 'km')
      .reduce((s, r) => s + r.totaal, 0)
    // Exact 10% van de Reiniging-regels (zoals de bot, die alleen die regels ×1.10 doet).
    expect(totals.korstmosToeslag).toBeCloseTo(Math.round(reinigingTotaal * 0.1 * 100) / 100, 2)
    // En NIET 10% over preventieve + beschermlaag erbij (dat zou hoger zijn).
    expect(totals.korstmosToeslag).toBeLessThan(Math.round(alleDiensten * 0.1 * 100) / 100)
  })

  it('korstmos = nee → geen toeslag', () => {
    const data = makeData({
      hoofdcategorie: ['oprit_terras_terrein'],
      sub: ['preventieve_onkruid', 'beschermlaag'],
      m2: 150,
      korstmos: 'nee',
    })
    const totals = computeTotals(computeRules(data), data)
    expect(totals.korstmosToeslag).toBe(0)
  })

  it('elk regel-totaal en de eindtotalen zijn op 2 decimalen afgerond (geen centen-drift)', () => {
    const data = makeData({
      hoofdcategorie: ['oprit_terras_terrein'],
      sub: ['preventieve_onkruid', 'beschermlaag'],
      m2: 113,
      afstand_km: 171.5, // levert reiskosten met gebroken km → afronding nodig
    })
    const rules = computeRules(data)
    const totals = computeTotals(rules, data)
    for (const r of rules) {
      expect(r.totaal).toBe(Math.round(r.totaal * 100) / 100)
    }
    expect(totals.total).toBe(Math.round(totals.total * 100) / 100)
    expect(totals.btw).toBe(Math.round(totals.btw * 100) / 100)
  })
})
