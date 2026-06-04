import { describe, expect, it } from 'vitest'
import { isComplete, phaseDuration, remainingAfter } from './timeline'

describe('phaseDuration', () => {
  it('geeft de duur van een geldige fase', () => {
    expect(phaseDuration([500, 800], 0)).toBe(500)
    expect(phaseDuration([500, 800], 1)).toBe(800)
  })

  it('geeft null buiten de tijdlijn (eindstand of ongeldig)', () => {
    expect(phaseDuration([500, 800], 2)).toBeNull()
    expect(phaseDuration([500, 800], -1)).toBeNull()
    expect(phaseDuration([], 0)).toBeNull()
  })
})

describe('isComplete', () => {
  it('is true zodra alle fases doorlopen zijn', () => {
    expect(isComplete(2, 2)).toBe(true)
    expect(isComplete(3, 2)).toBe(true)
  })

  it('is false zolang er fases over zijn', () => {
    expect(isComplete(0, 2)).toBe(false)
    expect(isComplete(1, 2)).toBe(false)
  })
})

describe('remainingAfter', () => {
  it('trekt verstreken tijd af van de wachttijd', () => {
    expect(remainingAfter(1000, 5000, 5400)).toBe(600)
  })

  it('komt nooit onder nul', () => {
    expect(remainingAfter(1000, 5000, 7000)).toBe(0)
  })
})
