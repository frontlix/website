import { describe, it, expect } from 'vitest'
import { durStr, minutesBetween, slotConflict } from './agenda-mobile-helpers'

describe('minutesBetween / durStr', () => {
  it('computes minutes between HH:MM times', () => {
    expect(minutesBetween('09:00', '12:45')).toBe(225)
    expect(minutesBetween('10:00', '10:30')).toBe(30)
  })
  it('formats a duration as "Xu Ym" / "Ym"', () => {
    expect(durStr('09:00', '12:45')).toBe('3u 45m')
    expect(durStr('10:00', '10:30')).toBe('30m')
    expect(durStr('09:00', '11:00')).toBe('2u')
  })
})

describe('slotConflict', () => {
  // A new slot starting at `start` lasting `durMin` conflicts if it overlaps any busy [s,e).
  const busy = [{ start: '10:00', end: '11:30' }]
  it('detects an overlap', () => {
    expect(slotConflict('09:30', 180, busy)).toEqual({ conflict: true, with: busy[0] })
  })
  it('no conflict when the slot ends before a busy block', () => {
    expect(slotConflict('08:00', 60, busy)).toEqual({ conflict: false })
  })
  it('no conflict when the slot starts after a busy block', () => {
    expect(slotConflict('12:00', 60, busy)).toEqual({ conflict: false })
  })
})
