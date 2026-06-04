/**
 * Pure helpers voor scène-tijdlijnen, los van React getest.
 * Een scène is een rij fases met een duur in ms; fase-index ===
 * durations.length betekent: eindstand bereikt.
 */

/** Duur (ms) van fase `phase`, of null buiten de tijdlijn. */
export function phaseDuration(durations: readonly number[], phase: number): number | null {
  if (phase < 0 || phase >= durations.length) return null
  return durations[phase]
}

/** True zodra de eindstand is bereikt. */
export function isComplete(phase: number, total: number): boolean {
  return phase >= total
}

/** Resterende wachttijd van een fase na een pauze. */
export function remainingAfter(wait: number, startedAt: number, now: number): number {
  return Math.max(0, wait - (now - startedAt))
}
