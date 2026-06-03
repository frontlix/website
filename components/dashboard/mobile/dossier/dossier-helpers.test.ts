import { describe, it, expect } from 'vitest'
import { dossEur, initials, factStrip } from './dossier-helpers'
import { DOSS_LEAD } from './dossier-mock'

describe('dossEur', () => {
  it('formats euro with nl-NL comma decimals', () => {
    expect(dossEur(1871.57)).toBe('€ 1.871,57')
    expect(dossEur(17)).toBe('€ 17,00')
  })
})
describe('initials', () => {
  it('takes up to 2 uppercase initials', () => {
    expect(initials('Jeroen de Vries')).toBe('JD')
    expect(initials('Anna')).toBe('A')
    expect(initials('')).toBe('L')
  })
})
describe('factStrip', () => {
  it('builds the 4 KPI facts from the lead', () => {
    expect(factStrip(DOSS_LEAD)).toEqual([
      { v: '145 m²', l: 'Oppervlak' },
      { v: '4', l: "Foto's" },
      { v: '€ 1.872', l: 'Offerte' },
      { v: '8 min', l: 'Binnen' },
    ])
  })
  it('shows, for a null offerte price', () => {
    expect(factStrip({ ...DOSS_LEAD, prijs: null })[2]).toEqual({ v: '—', l: 'Offerte' })
  })
})
