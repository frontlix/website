import { describe, it, expect, vi, afterEach } from 'vitest'
import { currentMondayKey, shiftWeekKey } from './agenda-week'

describe('currentMondayKey', () => {
  afterEach(() => vi.useRealTimers())

  it('geeft op zondag de maandag ervoor (ISO-week ma–zo)', () => {
    // Zondag 31 mei 2026 → maandag = 25 mei 2026
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 31, 12, 0, 0))
    expect(currentMondayKey()).toBe('2026-05-25')
  })

  it('geeft op de maandag zelf diezelfde dag', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 25, 9, 0, 0))
    expect(currentMondayKey()).toBe('2026-05-25')
  })

  it('accepteert een expliciete datum (woensdag 3 jun 2026 → ma 1 jun)', () => {
    expect(currentMondayKey(new Date(2026, 5, 3, 8, 0, 0))).toBe('2026-06-01')
  })
})

describe('shiftWeekKey', () => {
  it('schuift een week vooruit', () => {
    expect(shiftWeekKey('2026-05-25', 1)).toBe('2026-06-01')
  })
  it('schuift een week terug', () => {
    expect(shiftWeekKey('2026-05-25', -1)).toBe('2026-05-18')
  })
})
