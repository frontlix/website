import { describe, it, expect } from 'vitest'
import {
  formatEuro,
  formatDateNL,
  formatDateTimeNL,
  formatRelative,
  dashboardStatusLabel,
  gesprekFaseLabel,
} from './format'

describe('formatEuro', () => {
  it('formateert numeric naar euro met komma als decimaalscheider', () => {
    expect(formatEuro(1234.5)).toBe('€ 1.234,50')
    expect(formatEuro(0)).toBe('€ 0,00')
    expect(formatEuro(99.99)).toBe('€ 99,99')
  })
  it('null/undefined → em-dash', () => {
    expect(formatEuro(null)).toBe('—')
    expect(formatEuro(undefined)).toBe('—')
  })
})

describe('formatDateNL', () => {
  it('formateert ISO-datum naar dd-mm-yyyy', () => {
    expect(formatDateNL('2026-04-23T10:30:00Z')).toBe('23-04-2026')
  })
  it('null/undefined → em-dash', () => {
    expect(formatDateNL(null)).toBe('—')
  })
})

describe('formatDateTimeNL', () => {
  it('formateert ISO-datetime naar dd-mm-yyyy HH:mm', () => {
    const result = formatDateTimeNL('2026-04-23T10:30:00Z')
    expect(result).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/)
  })
})

describe('formatRelative', () => {
  it('returnt "zojuist" voor minder dan een minuut geleden', () => {
    const now = new Date()
    expect(formatRelative(now.toISOString())).toBe('zojuist')
  })
  it('returnt "X min geleden" voor recente events', () => {
    const fiveMin = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatRelative(fiveMin)).toMatch(/^\d+ min geleden$/)
  })
  it('null → em-dash', () => {
    expect(formatRelative(null)).toBe('—')
  })
})

describe('dashboardStatusLabel', () => {
  it('mapt status-keys naar leesbare labels', () => {
    expect(dashboardStatusLabel('open')).toBe('Open')
    expect(dashboardStatusLabel('opgevolgd')).toBe('Opgevolgd')
    expect(dashboardStatusLabel('afgehandeld')).toBe('Afgehandeld')
    expect(dashboardStatusLabel('no_show')).toBe('No-show')
    expect(dashboardStatusLabel('geen_interesse')).toBe('Geen interesse')
    expect(dashboardStatusLabel('archief')).toBe('Archief')
  })
  it('null → "Geen status"', () => {
    expect(dashboardStatusLabel(null)).toBe('Geen status')
  })
})

describe('gesprekFaseLabel', () => {
  it('mapt fase-keys naar Nederlandse labels', () => {
    expect(gesprekFaseLabel('info_verzamelen')).toBe('Info verzamelen')
    expect(gesprekFaseLabel('offerte_besproken')).toBe('Offerte besproken')
    expect(gesprekFaseLabel('onderhandelen')).toBe('Onderhandelen')
    expect(gesprekFaseLabel('datum_kiezen')).toBe('Datum kiezen')
    expect(gesprekFaseLabel('afspraak_bevestigd')).toBe('Afspraak bevestigd')
  })
})
