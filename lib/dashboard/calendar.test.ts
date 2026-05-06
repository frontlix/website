import { describe, it, expect } from 'vitest'
import {
  parseMonthParam,
  getMonthGrid,
  toAmsterdamDayKey,
  buildAppointmentsByDay,
} from './calendar'

describe('parseMonthParam', () => {
  const NOW = new Date('2026-05-05T14:00:00Z')

  it('returnt huidige maand bij geen param', () => {
    expect(parseMonthParam({}, NOW)).toEqual({ year: 2026, month: 5 })
  })

  it('parseert geldige YYYY-MM', () => {
    expect(parseMonthParam({ month: '2026-03' }, NOW)).toEqual({ year: 2026, month: 3 })
    expect(parseMonthParam({ month: '2025-12' }, NOW)).toEqual({ year: 2025, month: 12 })
  })

  it('valt terug op huidige maand bij ongeldig formaat', () => {
    expect(parseMonthParam({ month: 'abc' }, NOW)).toEqual({ year: 2026, month: 5 })
    expect(parseMonthParam({ month: '2026-13' }, NOW)).toEqual({ year: 2026, month: 5 })
    expect(parseMonthParam({ month: '2026-00' }, NOW)).toEqual({ year: 2026, month: 5 })
    expect(parseMonthParam({ month: '26-05' }, NOW)).toEqual({ year: 2026, month: 5 })
  })
})

describe('getMonthGrid', () => {
  it('mei 2026: start op maandag 27 april (leading), eind op zondag 31 mei = 35 cellen', () => {
    const grid = getMonthGrid(2026, 5)
    expect(grid.cells).toHaveLength(35)
    expect(grid.cells[0].dateKey).toBe('2026-04-27')
    expect(grid.cells[0].isCurrentMonth).toBe(false)
    expect(grid.cells[4].dateKey).toBe('2026-05-01')
    expect(grid.cells[4].isCurrentMonth).toBe(true)
    expect(grid.cells[34].dateKey).toBe('2026-05-31')
    expect(grid.cells[34].isCurrentMonth).toBe(true)
  })

  it('februari 2025 (28 dagen, start zaterdag): 35 cellen', () => {
    const grid = getMonthGrid(2025, 2)
    expect(grid.cells).toHaveLength(35)
    expect(grid.cells[0].dateKey).toBe('2025-01-27')
    expect(grid.cells[5].dateKey).toBe('2025-02-01')
  })

  it('maart 2026 (start zondag): 42 cellen (6 rijen)', () => {
    const grid = getMonthGrid(2026, 3)
    expect(grid.cells).toHaveLength(42)
    expect(grid.cells[0].dateKey).toBe('2026-02-23')
    expect(grid.cells[6].dateKey).toBe('2026-03-01')
  })

  it('schrikkeljaar februari 2024 heeft 29 dagen', () => {
    const grid = getMonthGrid(2024, 2)
    const lastInMonth = [...grid.cells].reverse().find((c) => c.isCurrentMonth)
    expect(lastInMonth?.dateKey).toBe('2024-02-29')
  })

  it('markeert vandaag wanneer in zicht', () => {
    const today = new Date('2026-05-15T12:00:00Z')
    const grid = getMonthGrid(2026, 5, today)
    const todayCell = grid.cells.find((c) => c.dateKey === '2026-05-15')
    expect(todayCell?.isToday).toBe(true)
  })

  it('markeert toDate als past wanneer dateKey < today', () => {
    const today = new Date('2026-05-15T12:00:00Z')
    const grid = getMonthGrid(2026, 5, today)
    const earlyCell = grid.cells.find((c) => c.dateKey === '2026-05-10')
    expect(earlyCell?.isPast).toBe(true)
    const lateCell = grid.cells.find((c) => c.dateKey === '2026-05-20')
    expect(lateCell?.isPast).toBe(false)
  })

  it('returnt monthLabel als "mei 2026"', () => {
    const grid = getMonthGrid(2026, 5)
    expect(grid.monthLabel).toBe('mei 2026')
  })

  it('prevMonth en nextMonth crossen jaargrens correct', () => {
    const dec = getMonthGrid(2026, 12)
    expect(dec.prevMonth).toEqual({ year: 2026, month: 11 })
    expect(dec.nextMonth).toEqual({ year: 2027, month: 1 })

    const jan = getMonthGrid(2027, 1)
    expect(jan.prevMonth).toEqual({ year: 2026, month: 12 })
    expect(jan.nextMonth).toEqual({ year: 2027, month: 2 })
  })
})

describe('toAmsterdamDayKey', () => {
  it('UTC midden op de dag → zelfde dag in NL', () => {
    expect(toAmsterdamDayKey('2026-05-05T12:00:00Z')).toBe('2026-05-05')
  })

  it('UTC laat in de avond → volgende dag in NL (zomertijd CEST = UTC+2)', () => {
    expect(toAmsterdamDayKey('2026-05-05T23:00:00Z')).toBe('2026-05-06')
  })

  it('UTC vroeg op de dag in wintertijd (CET = UTC+1)', () => {
    expect(toAmsterdamDayKey('2026-01-15T00:30:00Z')).toBe('2026-01-15')
  })
})

describe('buildAppointmentsByDay', () => {
  it('groepeert appointments op dag-key', () => {
    const appointments = [
      { lead_id: 'L1', afspraak_geboekt_op: '2026-05-05T10:00:00Z', naam: 'Jan' },
      { lead_id: 'L2', afspraak_geboekt_op: '2026-05-05T15:00:00Z', naam: 'Piet' },
      { lead_id: 'L3', afspraak_geboekt_op: '2026-05-06T09:00:00Z', naam: 'Roos' },
    ] as never

    const map = buildAppointmentsByDay(appointments)
    expect(map.get('2026-05-05')).toHaveLength(2)
    expect(map.get('2026-05-06')).toHaveLength(1)
    expect(map.get('2026-05-07')).toBeUndefined()
  })

  it('sorteert appointments per dag op tijd ASC', () => {
    const appointments = [
      { lead_id: 'L2', afspraak_geboekt_op: '2026-05-05T15:00:00Z', naam: 'Piet' },
      { lead_id: 'L1', afspraak_geboekt_op: '2026-05-05T10:00:00Z', naam: 'Jan' },
    ] as never

    const map = buildAppointmentsByDay(appointments)
    const day = map.get('2026-05-05')!
    expect(day[0].lead_id).toBe('L1')
    expect(day[1].lead_id).toBe('L2')
  })
})
