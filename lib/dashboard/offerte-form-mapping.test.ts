import { describe, test, expect } from 'vitest'
import { mapLeadToFormData, buildLeadFieldsFromForm } from './offerte-form-mapping'
import { computeRules, computeTotals } from './manual-offerte-rules'
import type { Lead } from './database.types'

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

describe('mapLeadToFormData — onkruid seeding (live editor toont niet langer EUR 0)', () => {
  test('onkruid-lead (plan_4_weken) seedt onderhoud-subdienst + 4 weken + categorie', () => {
    const data = mapLeadToFormData(
      makeLead({ hoofdcategorie: 'onkruidbeheersing_zakelijk', sub_diensten: ['plan_4_weken'], m2: 88 }),
    )
    expect(data.sub).toContain('onderhoud')
    expect(data.onderhoud_weken).toBe(4)
    expect(data.hoofdcategorie).toContain('onkruidbeheersing')
  })

  test('de live prijsafleiding levert EUR 110 dienst i.p.v. EUR 0', () => {
    const data = mapLeadToFormData(
      makeLead({ hoofdcategorie: 'onkruidbeheersing_zakelijk', sub_diensten: ['plan_4_weken'], m2: 88 }),
    )
    const rules = computeRules(data)
    const totals = computeTotals(rules, data)
    const reiskosten = rules.filter((r) => r.eenheid === 'km').reduce((s, r) => s + r.totaal, 0)
    expect(totals.subtotal - reiskosten).toBe(110)
  })

  test('oprit-lead blijft werken', () => {
    const data = mapLeadToFormData(
      makeLead({ hoofdcategorie: 'oprit_terras_terrein', sub_diensten: ['invegen'], m2: 100 }),
    )
    expect(data.sub).toContain('invegen')
    expect(data.hoofdcategorie).toContain('oprit_terras_terrein')
  })
})

describe('round-trip — een save corrumpeert de onkruid-lead niet', () => {
  test('lead → form → leads-payload behoudt het plan-interval en de bot-categorie', () => {
    const lead = makeLead({
      hoofdcategorie: 'onkruidbeheersing_zakelijk',
      sub_diensten: ['plan_4_weken'],
      m2: 88,
    })
    const data = mapLeadToFormData(lead)
    const payload = buildLeadFieldsFromForm(data, 'test-1', 200.73)
    expect(payload.sub_diensten).toEqual(['plan_4_weken'])
    expect(payload.hoofdcategorie).toBe('onkruidbeheersing_zakelijk')
  })

  test('onkruid-lead met preventieve round-trip behoudt beide bot-keys', () => {
    const lead = makeLead({
      hoofdcategorie: 'onkruidbeheersing_zakelijk',
      sub_diensten: ['plan_4_weken', 'preventieve_onkruidbeheersing'],
      m2: 88,
    })
    const data = mapLeadToFormData(lead)
    const payload = buildLeadFieldsFromForm(data, 'test-1', 300)
    expect(payload.sub_diensten).toEqual(['plan_4_weken', 'preventieve_onkruidbeheersing'])
  })

  test('oprit-offerte round-trip blijft ongewijzigd (characterisatie)', () => {
    const lead = makeLead({
      hoofdcategorie: 'oprit_terras_terrein',
      sub_diensten: ['invegen'],
      m2: 100,
    })
    const data = mapLeadToFormData(lead)
    const payload = buildLeadFieldsFromForm(data, 'test-1', 500)
    expect(payload.sub_diensten).toEqual(['invegen'])
    expect(payload.hoofdcategorie).toBe('oprit_terras_terrein')
  })
})

describe('offerte_prijs_overrides — per-offerte prijs blijft bewaard', () => {
  test('gezette overrides → JSON-kolom en weer terug op de form-data', () => {
    const base = mapLeadToFormData(
      makeLead({ hoofdcategorie: 'oprit_terras_terrein', sub_diensten: ['invegen'], m2: 100 }),
    )
    const data = { ...base, reiskosten_per_km_override: 0.3, onderhoud_per_m2_override: 1.4 }
    const payload = buildLeadFieldsFromForm(data, 'test-1', 500)
    expect(payload.offerte_prijs_overrides).toEqual({
      reiskosten_per_km_override: 0.3,
      onderhoud_per_m2_override: 1.4,
    })
    // Terug inladen: de overrides staan weer op de form-data (blijven dus staan).
    const terug = mapLeadToFormData(
      makeLead({ offerte_prijs_overrides: payload.offerte_prijs_overrides as never }),
    )
    expect(terug.reiskosten_per_km_override).toBe(0.3)
    expect(terug.onderhoud_per_m2_override).toBe(1.4)
  })

  test('geen overrides → kolom blijft null', () => {
    const data = mapLeadToFormData(makeLead({ sub_diensten: ['invegen'], m2: 100 }))
    expect(buildLeadFieldsFromForm(data, 'test-1', 500).offerte_prijs_overrides).toBeNull()
  })

  test('override van 0 blijft 0 (gratis), niet weggefilterd', () => {
    const base = mapLeadToFormData(makeLead({ sub_diensten: ['invegen'], m2: 100 }))
    const payload = buildLeadFieldsFromForm({ ...base, beschermlaag_override: 0 }, 'test-1', 500)
    expect(payload.offerte_prijs_overrides).toEqual({ beschermlaag_override: 0 })
  })
})
