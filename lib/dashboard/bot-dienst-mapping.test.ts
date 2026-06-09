import { describe, test, expect } from 'vitest'
import {
  mapBotSubDiensten,
  mapBotHoofdcategorie,
  onderhoudWekenToPlanKey,
  dashboardHoofdcategorieToDb,
  dashboardSubDienstenToDb,
} from './bot-dienst-mapping'

describe('mapBotSubDiensten — bot-keys → dashboard-subdiensten', () => {
  test('plan_4_weken → onderhoud-subdienst + 4 weken', () => {
    expect(mapBotSubDiensten(['plan_4_weken'], 'onkruidbeheersing_zakelijk')).toEqual({
      sub: ['onderhoud'],
      onderhoudWeken: 4,
    })
  })
  test('oprit-subdiensten blijven 1-op-1 (geen onderhoud)', () => {
    expect(mapBotSubDiensten(['invegen', 'beschermlaag'], 'oprit_terras_terrein')).toEqual({
      sub: ['invegen', 'beschermlaag'],
      onderhoudWeken: null,
    })
  })
  test('onkruid-lead zonder plan-key → onderhoud + hoogste tarief (16 weken)', () => {
    expect(mapBotSubDiensten([], 'onkruidbeheersing_zakelijk')).toEqual({
      sub: ['onderhoud'],
      onderhoudWeken: 16,
    })
  })
  test('bot-naam preventieve_onkruidbeheersing → dashboard preventieve_onkruid', () => {
    const { sub } = mapBotSubDiensten(['preventieve_onkruidbeheersing'], 'oprit_terras_terrein')
    expect(sub).toContain('preventieve_onkruid')
  })
  test('null sub_diensten op een niet-onkruid lead → lege set', () => {
    expect(mapBotSubDiensten(null, null)).toEqual({ sub: [], onderhoudWeken: null })
  })
})

describe('mapBotHoofdcategorie — DB-waarde → dashboard-union', () => {
  test('onkruidbeheersing_zakelijk → onkruidbeheersing', () => {
    expect(mapBotHoofdcategorie('onkruidbeheersing_zakelijk')).toEqual(['onkruidbeheersing'])
  })
  test('beide → beide categorieen', () => {
    expect(mapBotHoofdcategorie('beide')).toEqual(['oprit_terras_terrein', 'onkruidbeheersing'])
  })
  test('onbekend → lege array', () => {
    expect(mapBotHoofdcategorie('iets_raars')).toEqual([])
  })
})

describe('reverse-encoders — dashboard → DB (round-trip-veilig)', () => {
  test('onderhoudWekenToPlanKey', () => {
    expect(onderhoudWekenToPlanKey(4)).toBe('plan_4_weken')
    expect(onderhoudWekenToPlanKey(12)).toBe('plan_12_weken')
  })
  test('dashboardHoofdcategorieToDb → bot-waarde', () => {
    expect(dashboardHoofdcategorieToDb(['onkruidbeheersing'])).toBe('onkruidbeheersing_zakelijk')
    expect(dashboardHoofdcategorieToDb(['oprit_terras_terrein'])).toBe('oprit_terras_terrein')
    expect(dashboardHoofdcategorieToDb(['oprit_terras_terrein', 'onkruidbeheersing'])).toBe('beide')
    expect(dashboardHoofdcategorieToDb([])).toBe('oprit_terras_terrein')
  })
  test('dashboardSubDienstenToDb her-encodeert onderhoud naar de plan-key', () => {
    expect(dashboardSubDienstenToDb(['onderhoud'], 4)).toEqual(['plan_4_weken'])
    expect(dashboardSubDienstenToDb(['invegen'], 8)).toEqual(['invegen'])
  })
  test('dashboardSubDienstenToDb her-encodeert preventieve naar de bot-naam', () => {
    // Symmetrisch met mapBotSubDiensten: anders herkent de bot de preventieve-
    // regel niet meer na een dashboard-save (de bot leest preventieve_onkruidbeheersing).
    expect(dashboardSubDienstenToDb(['preventieve_onkruid'], 8)).toEqual([
      'preventieve_onkruidbeheersing',
    ])
    expect(dashboardSubDienstenToDb(['onderhoud', 'preventieve_onkruid'], 4)).toEqual([
      'plan_4_weken',
      'preventieve_onkruidbeheersing',
    ])
  })
})
