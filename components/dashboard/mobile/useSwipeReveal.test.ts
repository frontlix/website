import { describe, it, expect } from 'vitest'
import { resolveSwipe, REVEAL, THRESHOLD } from './useSwipeReveal'

describe('resolveSwipe', () => {
  it('snap naar +REVEAL bij dx > THRESHOLD', () => {
    expect(resolveSwipe(THRESHOLD + 1)).toBe(REVEAL)
  })
  it('snap naar -REVEAL bij dx < -THRESHOLD', () => {
    expect(resolveSwipe(-THRESHOLD - 1)).toBe(-REVEAL)
  })
  it('snap naar 0 binnen drempel', () => {
    expect(resolveSwipe(THRESHOLD)).toBe(0)
    expect(resolveSwipe(-THRESHOLD)).toBe(0)
    expect(resolveSwipe(0)).toBe(0)
  })

  // Richting-bewust: vanuit een open kaart terugslepen sluit 'm (i.p.v. tikken).
  it('vanuit open-rechts (base=+REVEAL): terugslepen voorbij THRESHOLD sluit', () => {
    expect(resolveSwipe(REVEAL - THRESHOLD - 1, REVEAL)).toBe(0) // ver genoeg terug → dicht
    expect(resolveSwipe(REVEAL, REVEAL)).toBe(REVEAL) // niet bewogen → blijft open
    expect(resolveSwipe(REVEAL - THRESHOLD + 1, REVEAL)).toBe(REVEAL) // net niet ver genoeg
  })
  it('vanuit open-links (base=-REVEAL): terugslepen voorbij THRESHOLD sluit', () => {
    expect(resolveSwipe(-(REVEAL - THRESHOLD) + 1, -REVEAL)).toBe(0)
    expect(resolveSwipe(-REVEAL, -REVEAL)).toBe(-REVEAL)
    expect(resolveSwipe(-(REVEAL - THRESHOLD) - 1, -REVEAL)).toBe(-REVEAL)
  })
})

describe('constanten', () => {
  it('REVEAL=144, THRESHOLD=40', () => {
    expect(REVEAL).toBe(144)
    expect(THRESHOLD).toBe(40)
  })
})
