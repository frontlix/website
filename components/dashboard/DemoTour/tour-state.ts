/** Pure navigatie-state van de tour: huidige stap + bezochte stappen. */

export type TourState = {
  stepIndex: number
  /** per stap: heeft de gebruiker hem gezien (vinkjes in het menu) */
  visited: readonly boolean[]
}

export function createTourState(totalSteps: number): TourState {
  return {
    stepIndex: 0,
    visited: Array.from({ length: totalSteps }, (_, i) => i === 0),
  }
}

export function goToStep(state: TourState, index: number): TourState {
  if (index < 0 || index >= state.visited.length || index === state.stepIndex) return state
  return {
    stepIndex: index,
    visited: state.visited.map((v, i) => v || i === index),
  }
}

export function nextStep(state: TourState): TourState {
  return goToStep(state, state.stepIndex + 1)
}

export function prevStep(state: TourState): TourState {
  return goToStep(state, state.stepIndex - 1)
}

export function isLastStep(state: TourState): boolean {
  return state.stepIndex === state.visited.length - 1
}
