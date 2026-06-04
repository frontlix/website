import { describe, expect, it } from 'vitest'
import { STEP_CONTENT } from './steps-content'

// De koppeling inhoud → scène wordt afgedwongen door TypeScript plus de
// runtime-guard in steps.ts; hier testen we het pure tekstmodel.
describe('STEP_CONTENT', () => {
  it('bevat precies 10 stappen met unieke ids', () => {
    expect(STEP_CONTENT).toHaveLength(10)
    const ids = STEP_CONTENT.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('heeft voor elke stap titel, menuLabel en uitleg', () => {
    for (const step of STEP_CONTENT) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.menuLabel.length).toBeGreaterThan(0)
      expect(step.uitleg.length).toBeGreaterThan(20)
    }
  })

  it('volgt de huisstijl: geen streepjes in zichtbare teksten', () => {
    for (const step of STEP_CONTENT) {
      expect(step.title).not.toMatch(/—|–/)
      expect(step.menuLabel).not.toMatch(/—|–/)
      expect(step.uitleg).not.toMatch(/—|–/)
    }
  })
})
