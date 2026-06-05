/**
 * Genereert "nette" integer y-as ticks van 0 t/m max, hoog → laag.
 *
 * - max <= 6: elk heel getal (bv. 3 → [3,2,1,0]), zodat er geen tussenstap
 *   ontbreekt bij kleine lead-aantallen.
 * - groter: een afgeronde stap zodat er ~4-5 ticks zijn.
 *
 * Altijd inclusief 0 en max.
 */
export function axisTicks(max: number): number[] {
  const m = Math.max(0, Math.ceil(max))
  if (m <= 1) return [...new Set([m, 0])]
  if (m <= 6) return Array.from({ length: m + 1 }, (_, i) => m - i)

  const rawStep = m / 4
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const niceStep = Math.max(1, Math.ceil(rawStep / pow) * pow)

  const ticks: number[] = []
  for (let v = 0; v <= m; v += niceStep) ticks.push(v)
  if (ticks[ticks.length - 1] !== m) ticks.push(m)
  return ticks.reverse()
}
