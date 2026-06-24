import { describe, it, expect } from 'vitest'
import { buildAfspraakInfo, type AfspraakLeadFields } from './afspraak-info'

const base: AfspraakLeadFields = {
  naam: 'Jeroen de Vries',
  bedrijfsnaam: null,
  afspraak_datum: '2026-06-26',
  afspraak_starttijd: '10:00:00',
  afspraak_geboekt_op: null,
  hoofdcategorie: 'oprit_terras_terrein',
  sub_diensten: ['invegen'],
  m2: 145,
  straat: 'Lindenlaan',
  huisnummer: '14',
  postcode: '2611 AB',
  plaats: 'Delft',
  telefoon: '06 24 96 52 70',
  afstand_km: 18,
  groene_aanslag: 'ja',
  planten_afschermen: 'nee',
}

describe('buildAfspraakInfo notities', () => {
  it('is een lege lijst zonder notities-argument', () => {
    expect(buildAfspraakInfo(base).notities).toEqual([])
  })

  it('neemt de meegegeven notities over, getrimd en zonder lege regels', () => {
    const info = buildAfspraakInfo(base, ['  Poort linksachter  ', '', '   ', 'Hond in de tuin'])
    expect(info.notities).toEqual(['Poort linksachter', 'Hond in de tuin'])
  })
})
