import { describe, it, expect } from 'vitest'
import {
  amsterdamParts,
  amsterdamStartOfDayIso,
  amsterdamStartOfWeekIso,
  amsterdamStartOfMonthIso,
  amsterdamStartOfQuarterIso,
  amsterdamStartOfYearIso,
  amsterdamStartOfPrevMonthIso,
  amsterdamDayKey,
} from './amsterdam-time'

// dinsdag 5 mei 2026 14:00 UTC = 16:00 Amsterdam (CEST, +2)
const ZOMER = new Date('2026-05-05T14:00:00Z')
// donderdag 15 jan 2026 12:00 UTC = 13:00 Amsterdam (CET, +1)
const WINTER = new Date('2026-01-15T12:00:00Z')

describe('amsterdamParts', () => {
  it('geeft de Amsterdam-wandklok-datum + weekdag', () => {
    expect(amsterdamParts(ZOMER)).toEqual({ year: 2026, month: 5, day: 5, weekday: 2 })
  })
  it('rolt over de UTC-dag als het in NL al de volgende dag is', () => {
    // 31 mei 22:30 UTC = 1 juni 00:30 Amsterdam (CEST)
    expect(amsterdamParts(new Date('2026-05-31T22:30:00Z')).day).toBe(1)
    expect(amsterdamParts(new Date('2026-05-31T22:30:00Z')).month).toBe(6)
  })
})

describe('start-of-period (zomer, CEST +2)', () => {
  it('maand: 1 mei 00:00 NL = 30 apr 22:00 UTC', () => {
    expect(amsterdamStartOfMonthIso(ZOMER)).toBe('2026-04-30T22:00:00.000Z')
  })
  it('week: maandag 4 mei 00:00 NL = 3 mei 22:00 UTC', () => {
    expect(amsterdamStartOfWeekIso(ZOMER)).toBe('2026-05-03T22:00:00.000Z')
  })
  it('week vanaf zondag pakt de vorige maandag', () => {
    const zondag = new Date('2026-05-10T12:00:00Z')
    expect(amsterdamStartOfWeekIso(zondag)).toBe('2026-05-03T22:00:00.000Z')
  })
  it('kwartaal: 1 apr 00:00 NL = 31 mrt 22:00 UTC (Q2)', () => {
    expect(amsterdamStartOfQuarterIso(ZOMER)).toBe('2026-03-31T22:00:00.000Z')
  })
  it('vorige maand: 1 apr 00:00 NL = 31 mrt 22:00 UTC', () => {
    expect(amsterdamStartOfPrevMonthIso(ZOMER)).toBe('2026-03-31T22:00:00.000Z')
  })
  it('dag: 5 mei 00:00 NL = 4 mei 22:00 UTC', () => {
    expect(amsterdamStartOfDayIso(ZOMER)).toBe('2026-05-04T22:00:00.000Z')
  })
})

describe('start-of-period (winter, CET +1)', () => {
  it('maand: 1 jan 00:00 NL = 31 dec 23:00 UTC', () => {
    expect(amsterdamStartOfMonthIso(WINTER)).toBe('2025-12-31T23:00:00.000Z')
  })
  it('jaar: 1 jan 00:00 NL = 31 dec 23:00 UTC', () => {
    expect(amsterdamStartOfYearIso(WINTER)).toBe('2025-12-31T23:00:00.000Z')
  })
  it('vorige maand: 1 dec 00:00 NL = 30 nov 23:00 UTC', () => {
    expect(amsterdamStartOfPrevMonthIso(WINTER)).toBe('2025-11-30T23:00:00.000Z')
  })
})

describe('amsterdamDayKey', () => {
  it('zomer: 31 mei 22:30 UTC valt op NL-dag 1 juni', () => {
    expect(amsterdamDayKey(new Date('2026-05-31T22:30:00Z'))).toBe('2026-06-01')
  })
  it('winter: 31 jan 23:30 UTC valt op NL-dag 1 februari', () => {
    expect(amsterdamDayKey(new Date('2026-01-31T23:30:00Z'))).toBe('2026-02-01')
  })
})
