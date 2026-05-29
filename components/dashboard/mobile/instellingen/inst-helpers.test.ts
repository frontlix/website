import { describe, it, expect } from 'vitest'
import { fillOpening, deltaPct, stepPrice, matchSections } from './inst-helpers'
import { INST_ALL } from './instellingen-mock'

describe('fillOpening', () => {
  it('substitutes every demo variable', () => {
    expect(fillOpening('Hoi {voornaam} van {bedrijf}')).toBe('Hoi Jeroen van Schoon Straatje')
  })
  it('leaves unknown placeholders untouched', () => {
    expect(fillOpening('x {onbekend}')).toBe('x {onbekend}')
  })
})

describe('deltaPct', () => {
  it('rounds the percent change vs base', () => {
    expect(deltaPct(4.5, 3.95)).toBe(14)
    expect(deltaPct(3.95, 3.95)).toBe(0)
    expect(deltaPct(3.0, 4.0)).toBe(-25)
  })
})

describe('stepPrice', () => {
  it('steps by the item step, snaps to 2 decimals, floors at 0', () => {
    expect(stepPrice(3.95, 0.05, 1)).toBe(4.0)
    expect(stepPrice(0.05, 0.05, -1)).toBe(0)
    expect(stepPrice(0, 0.05, -1)).toBe(0)
  })
})

describe('matchSections', () => {
  it('filters by label or subtitle, case-insensitive', () => {
    expect(matchSections(INST_ALL, 'prijz').map((s) => s.k)).toEqual(['prijzen'])
    expect(matchSections(INST_ALL, 'WHATSAPP').map((s) => s.k)).toEqual(['opening'])
    expect(matchSections(INST_ALL, '').length).toBe(INST_ALL.length)
  })
})
