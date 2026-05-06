import { describe, it, expect } from 'vitest'
import {
  parsePeriod,
  periodToRange,
  periodLabel,
} from './period'

describe('parsePeriod', () => {
  it('returnt deze-maand als default', () => {
    expect(parsePeriod({})).toBe('deze-maand')
  })

  it('parseert geldige period-keys', () => {
    expect(parsePeriod({ period: 'deze-week' })).toBe('deze-week')
    expect(parsePeriod({ period: 'deze-maand' })).toBe('deze-maand')
    expect(parsePeriod({ period: 'dit-kwartaal' })).toBe('dit-kwartaal')
    expect(parsePeriod({ period: 'dit-jaar' })).toBe('dit-jaar')
    expect(parsePeriod({ period: 'all-time' })).toBe('all-time')
  })

  it('valt terug op deze-maand bij ongeldige waarde', () => {
    expect(parsePeriod({ period: 'gibberish' })).toBe('deze-maand')
  })
})

describe('periodToRange', () => {
  // Vaste referentie-datum: dinsdag 5 mei 2026 14:00 UTC
  const NOW = new Date('2026-05-05T14:00:00Z')

  it('deze-week: vanaf maandag 00:00', () => {
    expect(periodToRange('deze-week', NOW).from).toBe('2026-05-04')
  })

  it('deze-maand: vanaf 1e van maand', () => {
    expect(periodToRange('deze-maand', NOW).from).toBe('2026-05-01')
  })

  it('dit-kwartaal: vanaf 1 april (Q2)', () => {
    expect(periodToRange('dit-kwartaal', NOW).from).toBe('2026-04-01')
  })

  it('dit-jaar: vanaf 1 januari', () => {
    expect(periodToRange('dit-jaar', NOW).from).toBe('2026-01-01')
  })

  it('all-time: from is null', () => {
    expect(periodToRange('all-time', NOW).from).toBeNull()
  })

  it('to is altijd het nu-tijdstip als ISO', () => {
    const range = periodToRange('deze-maand', NOW)
    expect(range.to).toBe(NOW.toISOString())
  })

  it('Q1: dit-kwartaal vanaf 1 januari', () => {
    const feb = new Date('2026-02-15T12:00:00Z')
    expect(periodToRange('dit-kwartaal', feb).from).toBe('2026-01-01')
  })

  it('Q3: dit-kwartaal vanaf 1 juli', () => {
    const aug = new Date('2026-08-15T12:00:00Z')
    expect(periodToRange('dit-kwartaal', aug).from).toBe('2026-07-01')
  })

  it('Q4: dit-kwartaal vanaf 1 oktober', () => {
    const dec = new Date('2026-12-15T12:00:00Z')
    expect(periodToRange('dit-kwartaal', dec).from).toBe('2026-10-01')
  })

  it('zondag: deze-week pakt vorige maandag', () => {
    const sun = new Date('2026-05-10T12:00:00Z')
    expect(periodToRange('deze-week', sun).from).toBe('2026-05-04')
  })

  it('maandag: deze-week pakt diezelfde maandag', () => {
    const mon = new Date('2026-05-04T12:00:00Z')
    expect(periodToRange('deze-week', mon).from).toBe('2026-05-04')
  })
})

describe('periodLabel', () => {
  it('returnt menselijke label per key', () => {
    expect(periodLabel('deze-week')).toBe('Deze week')
    expect(periodLabel('deze-maand')).toBe('Deze maand')
    expect(periodLabel('dit-kwartaal')).toBe('Dit kwartaal')
    expect(periodLabel('dit-jaar')).toBe('Dit jaar')
    expect(periodLabel('all-time')).toBe('All-time')
  })
})
