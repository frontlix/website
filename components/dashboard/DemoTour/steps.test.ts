import { describe, expect, it } from 'vitest'
import { STEP_CONTENT } from './steps-content'

// De koppeling inhoud → scène wordt afgedwongen door TypeScript plus de
// runtime-guard in steps.ts; hier testen we het pure tekstmodel.
describe('STEP_CONTENT', () => {
  it('bevat 11 hoofdstukken: welkom, 9 tour-stappen en een slot', () => {
    expect(STEP_CONTENT).toHaveLength(11)
    expect(STEP_CONTENT[0].kind).toBe('welcome')
    expect(STEP_CONTENT[STEP_CONTENT.length - 1].kind).toBe('outro')
    expect(STEP_CONTENT.filter((s) => s.kind === 'tour')).toHaveLength(9)
    const ids = STEP_CONTENT.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('heeft voor elk hoofdstuk titel, menuLabel, uitleg en een duur', () => {
    for (const step of STEP_CONTENT) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.menuLabel.length).toBeGreaterThan(0)
      expect(step.uitleg.length).toBeGreaterThan(20)
      expect(step.durSec).toBeGreaterThan(0)
    }
  })

  it('geeft elke tour-stap minstens twee bullets, welkom en slot geen', () => {
    for (const step of STEP_CONTENT) {
      if (step.kind === 'tour') {
        expect(step.bullets.length).toBeGreaterThanOrEqual(2)
      } else {
        expect(step.bullets).toHaveLength(0)
      }
    }
  })

  it('volgt de huisstijl: geen streepjes in zichtbare teksten', () => {
    for (const step of STEP_CONTENT) {
      for (const tekst of [step.title, step.menuLabel, step.uitleg, ...step.bullets]) {
        expect(tekst).not.toMatch(/—|–/)
      }
    }
  })
})
