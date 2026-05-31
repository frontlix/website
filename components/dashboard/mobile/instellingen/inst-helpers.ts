import type { InstSection } from './instellingen-mock'

const OPENING_DEMO: Record<string, string> = {
  '{voornaam}': 'Jeroen', '{bedrijf}': 'Schoon Straatje', '{bot_naam}': 'Surface',
  '{hoofddienst}': 'oprit', '{m2}': '145', '{plaats}': 'Delft',
}

/**
 * Vult de variabelen in voor de WA-preview. `overrides` mag de demo-waardes
 * vervangen door echte tenant-data (bv. {bedrijf} en {bot_naam}); de overige
 * variabelen blijven demo-voorbeelden omdat ze per lead verschillen.
 */
export function fillOpening(txt: string, overrides: Record<string, string> = {}): string {
  const map = { ...OPENING_DEMO, ...overrides }
  return Object.entries(map).reduce((a, [k, v]) => a.split(k).join(v), txt)
}

/** Afgerond %-verschil van cur t.o.v. base (0 als base 0). */
export function deltaPct(cur: number, base: number): number {
  if (base === 0) return 0
  return Math.round(((cur - base) / base) * 100)
}

/** Prijs ±step, gesnapt op 2 decimalen, niet onder 0. */
export function stepPrice(current: number, step: number, dir: 1 | -1): number {
  return Math.max(0, +(current + dir * step).toFixed(2))
}

/** Hub-zoekfilter op label of subtitel (case-insensitive). */
export function matchSections(sections: InstSection[], q: string): InstSection[] {
  const needle = q.toLowerCase()
  return sections.filter(
    (s) => s.l.toLowerCase().includes(needle) || s.s.toLowerCase().includes(needle),
  )
}
