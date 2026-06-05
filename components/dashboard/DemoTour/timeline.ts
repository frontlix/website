/** Pure tijdlijn-helpers voor de rondleiding, los van React getest. */

/**
 * Cumulatieve starttijden van hoofdstukken: [0, d0, d0+d1, ...].
 * Het laatste element is de totale duur van de hele video.
 */
export function cumulativeStarts(durations: readonly number[]): number[] {
  const starts = [0]
  for (const d of durations) starts.push(starts[starts.length - 1] + d)
  return starts
}
