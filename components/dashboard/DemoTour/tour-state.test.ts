import { describe, expect, it } from 'vitest'
import { createTourState, goToStep, isLastStep, nextStep, prevStep } from './tour-state'

describe('createTourState', () => {
  it('start op stap 0 met alleen stap 0 als bezocht', () => {
    const s = createTourState(3)
    expect(s.stepIndex).toBe(0)
    expect(s.visited).toEqual([true, false, false])
  })
})

describe('goToStep', () => {
  it('springt naar een stap en markeert die als bezocht', () => {
    const s = goToStep(createTourState(3), 2)
    expect(s.stepIndex).toBe(2)
    expect(s.visited).toEqual([true, false, true])
  })

  it('negeert ongeldige indexen en de huidige stap', () => {
    const s = createTourState(3)
    expect(goToStep(s, -1)).toBe(s)
    expect(goToStep(s, 3)).toBe(s)
    expect(goToStep(s, 0)).toBe(s)
  })
})

describe('nextStep / prevStep', () => {
  it('navigeert vooruit en achteruit binnen de grenzen', () => {
    let s = createTourState(3)
    s = nextStep(s)
    expect(s.stepIndex).toBe(1)
    s = prevStep(s)
    expect(s.stepIndex).toBe(0)
    expect(prevStep(s).stepIndex).toBe(0)
  })

  it('houdt eerder bezochte stappen bezocht', () => {
    let s = nextStep(nextStep(createTourState(3)))
    s = prevStep(s)
    expect(s.visited).toEqual([true, true, true])
  })
})

describe('isLastStep', () => {
  it('herkent de laatste stap', () => {
    const s = goToStep(createTourState(3), 2)
    expect(isLastStep(s)).toBe(true)
    expect(isLastStep(createTourState(3))).toBe(false)
  })
})
