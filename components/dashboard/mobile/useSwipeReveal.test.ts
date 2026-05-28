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
})

describe('constanten', () => {
  it('REVEAL=144, THRESHOLD=40', () => {
    expect(REVEAL).toBe(144)
    expect(THRESHOLD).toBe(40)
  })
})
