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
  // dinsdag 5 mei 2026 14:00 UTC (= 16:00 Amsterdam, CEST). Periode-grenzen
  // liggen in NL-tijd, dus 'from' = UTC-instant van NL-middernacht
  // (zomer/CEST = -2u, winter/CET = -1u t.o.v. de kalenderdatum).
  const NOW = new Date('2026-05-05T14:00:00Z')

  it('deze-week: maandag 00:00 NL', () => {
    expect(periodToRange('deze-week', NOW).from).toBe('2026-05-03T22:00:00.000Z')
  })

  it('deze-maand: 1e van maand 00:00 NL', () => {
    expect(periodToRange('deze-maand', NOW).from).toBe('2026-04-30T22:00:00.000Z')
  })

  it('dit-kwartaal: 1 april 00:00 NL (Q2)', () => {
    expect(periodToRange('dit-kwartaal', NOW).from).toBe('2026-03-31T22:00:00.000Z')
  })

  it('dit-jaar: 1 januari 00:00 NL', () => {
    expect(periodToRange('dit-jaar', NOW).from).toBe('2025-12-31T23:00:00.000Z')
  })

  it('all-time: from is null', () => {
    expect(periodToRange('all-time', NOW).from).toBeNull()
  })

  it('to is altijd het nu-tijdstip als ISO', () => {
    const range = periodToRange('deze-maand', NOW)
    expect(range.to).toBe(NOW.toISOString())
  })

  it('Q1: dit-kwartaal vanaf 1 januari (winter/CET)', () => {
    const feb = new Date('2026-02-15T12:00:00Z')
    expect(periodToRange('dit-kwartaal', feb).from).toBe('2025-12-31T23:00:00.000Z')
  })

  it('Q3: dit-kwartaal vanaf 1 juli', () => {
    const aug = new Date('2026-08-15T12:00:00Z')
    expect(periodToRange('dit-kwartaal', aug).from).toBe('2026-06-30T22:00:00.000Z')
  })

  it('Q4: dit-kwartaal vanaf 1 oktober', () => {
    const dec = new Date('2026-12-15T12:00:00Z')
    expect(periodToRange('dit-kwartaal', dec).from).toBe('2026-09-30T22:00:00.000Z')
  })

  it('zondag: deze-week pakt vorige maandag', () => {
    const sun = new Date('2026-05-10T12:00:00Z')
    expect(periodToRange('deze-week', sun).from).toBe('2026-05-03T22:00:00.000Z')
  })

  it('maandag: deze-week pakt diezelfde maandag', () => {
    const mon = new Date('2026-05-04T12:00:00Z')
    expect(periodToRange('deze-week', mon).from).toBe('2026-05-03T22:00:00.000Z')
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
