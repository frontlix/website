import { describe, expect, it } from 'vitest'
import { DEMO_TOUR_STEPS } from './steps'

describe('DEMO_TOUR_STEPS', () => {
  it('bevat precies 10 stappen met unieke ids', () => {
    expect(DEMO_TOUR_STEPS).toHaveLength(10)
    const ids = DEMO_TOUR_STEPS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('heeft voor elke stap titel, menuLabel, uitleg en een scène', () => {
    for (const step of DEMO_TOUR_STEPS) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.menuLabel.length).toBeGreaterThan(0)
      expect(step.uitleg.length).toBeGreaterThan(20)
      expect(typeof step.Scene).toBe('function')
    }
  })

  it('volgt de huisstijl: geen streepjes in zichtbare teksten', () => {
    for (const step of DEMO_TOUR_STEPS) {
      expect(step.title).not.toMatch(/—|–/)
      expect(step.menuLabel).not.toMatch(/—|–/)
      expect(step.uitleg).not.toMatch(/—|–/)
    }
  })
})
