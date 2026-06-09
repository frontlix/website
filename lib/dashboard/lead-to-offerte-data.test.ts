import { describe, test, expect } from 'vitest'
import { leadToOfferteData } from './lead-to-offerte-data'
import { computeRules, computeTotals } from './manual-offerte-rules'
import type { Lead } from './database.types'

/**
 * Minimale lead-row-factory: leadToOfferteData null-coalesct vrijwel alle
 * velden, dus we hoeven alleen de velden te zetten waar de test op leunt.
 */
function makeLead(overrides: Partial<Lead>): Lead {
  return {
    lead_id: 'test-1',
    naam: 'Test',
    sub_diensten: [],
    hoofdcategorie: null,
    m2: 0,
    afstand_km: 0,
    ...overrides,
  } as unknown as Lead
}

describe('leadToOfferteData — bestaand gedrag (oprit/terras blijft werken)', () => {
  test('oprit-lead met invegen behoudt de invegen-subdienst', () => {
    const data = leadToOfferteData(
      makeLead({ hoofdcategorie: 'oprit_terras_terrein', sub_diensten: ['invegen'], m2: 100 }),
    )
    expect(data.sub).toContain('invegen')
  })
})

describe('leadToOfferteData — onkruidbeheersing (de bug)', () => {
  test('bot onkruid-lead (plan_4_weken) mapt naar onderhoud-subdienst + 4 weken', () => {
    const data = leadToOfferteData(
      makeLead({
        hoofdcategorie: 'onkruidbeheersing_zakelijk',
        sub_diensten: ['plan_4_weken'],
        m2: 88,
      }),
    )
    expect(data.sub).toContain('onderhoud')
    expect(data.onderhoud_weken).toBe(4)
    expect(data.hoofdcategorie).toContain('onkruidbeheersing')
  })

  test.each([
    ['plan_4_weken', 4],
    ['plan_8_weken', 8],
    ['plan_12_weken', 12],
    ['plan_16_weken', 16],
  ] as const)('plan-key %s mapt naar %i weken', (planKey, weken) => {
    const data = leadToOfferteData(
      makeLead({ hoofdcategorie: 'onkruidbeheersing_zakelijk', sub_diensten: [planKey], m2: 50 }),
    )
    expect(data.onderhoud_weken).toBe(weken)
  })

  test('onkruid-lead zonder herkende plan-key valt terug op hoogste tarief (16 weken / langer)', () => {
    const data = leadToOfferteData(
      makeLead({ hoofdcategorie: 'onkruidbeheersing_zakelijk', sub_diensten: [], m2: 50 }),
    )
    expect(data.sub).toContain('onderhoud')
    expect(data.onderhoud_weken).toBe(16)
  })

  test('bot-naam preventieve_onkruidbeheersing vertaalt naar dashboard preventieve_onkruid', () => {
    const data = leadToOfferteData(
      makeLead({
        hoofdcategorie: 'onkruidbeheersing_zakelijk',
        sub_diensten: ['plan_8_weken', 'preventieve_onkruidbeheersing'],
        m2: 60,
      }),
    )
    expect(data.sub).toContain('preventieve_onkruid')
  })
})

describe('onkruid offerte end-to-end prijs (de €0 verdwijnt)', () => {
  test('computeRules levert een dienst-regel van €110 voor 88 m² × plan_4_weken i.p.v. €0', () => {
    const data = leadToOfferteData(
      makeLead({
        hoofdcategorie: 'onkruidbeheersing_zakelijk',
        sub_diensten: ['plan_4_weken'],
        m2: 88,
      }),
    )
    const rules = computeRules(data)
    const dienstRegel = rules.find((r) => r.eenheid === 'm²')
    expect(dienstRegel).toBeDefined()
    expect(dienstRegel!.totaal).toBe(110)

    const totals = computeTotals(rules, data)
    const reiskosten = rules.filter((r) => r.eenheid === 'km').reduce((s, r) => s + r.totaal, 0)
    const diensten = totals.subtotal - reiskosten
    expect(diensten).toBe(110)
  })
})
