import type { Appointment } from './agenda-queries'
import { toAmsterdamDayKey } from './calendar'
import { formatHHmm, formatM2 } from './agenda-event'

/**
 * Helpers voor de routekaart-view. Groepeert afspraken per dag, kent
 * elke dag een kleur toe, en bepaalt schematische pin-coördinaten op
 * basis van postcode-cijfer (geen geocoding nodig — alleen voor
 * visuele indicatie binnen de NL-blob op de SVG).
 */

export type RouteDay = {
  dayKey: string
  label: string // "woensdag 13 mei"
  shortLabel: string // "wo 13"
  color: string
  totalKm: number
  stops: RouteStop[]
}

export type RouteStop = {
  lead_id: string
  naam: string
  plaats: string | null
  m2Label: string | null
  tijd: string
  dagKey: string
  pinIndex: number
  /** Echte WGS84-coordinaten (uit `leads.lat`/`lng`). Null als nog niet gegeocodeerd. */
  lat: number | null
  lng: number | null
  /** Coordinaten binnen 0–100 viewBox van de schematische NL-kaart. */
  x: number
  y: number
}

/**
 * Vaste kleur-volgorde per dag-positie (1e dag met afspraken = blauw,
 * 2e dag = oranje, etc.) — matches het design.
 */
const DAY_COLORS = ['#1a56ff', '#f59e0b', '#16a34a', '#dc2626', '#7c3aed'] as const

/**
 * Schematische coördinaten per postcode-cijfer in 0–100 viewBox.
 * Niet geografisch precies — alleen om pins binnen de NL-blob te plaatsen.
 */
const POSTCODE_COORDS: Record<string, { x: number; y: number }> = {
  '1': { x: 55, y: 28 }, // Amsterdam / NH
  '2': { x: 38, y: 38 }, // Haarlem / Den Haag
  '3': { x: 50, y: 48 }, // Rotterdam / Utrecht
  '4': { x: 35, y: 62 }, // Zeeland / W-Brabant
  '5': { x: 60, y: 70 }, // Brabant
  '6': { x: 75, y: 58 }, // Limburg / Gelderland
  '7': { x: 78, y: 38 }, // Overijssel
  '8': { x: 65, y: 18 }, // Friesland / Flevoland
  '9': { x: 82, y: 22 }, // Groningen / Drenthe
}

const BASE_COORDS = { x: 30, y: 88 } // Bierbliet / Zuid-West NL als thuis-basis

function pickColor(index: number): string {
  return DAY_COLORS[index % DAY_COLORS.length]
}

function jitter(seed: string, range: number): number {
  // Eenvoudige hash → kleine offset, zodat 2 pins op dezelfde postcode
  // niet exact overlappen.
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return ((h % 1000) / 1000 - 0.5) * range * 2
}

function postcodeRegion(postcode: string | null): { x: number; y: number } {
  if (!postcode) return { x: 50, y: 50 }
  const digit = postcode.trim().charAt(0)
  return POSTCODE_COORDS[digit] ?? { x: 50, y: 50 }
}

function shortWeekday(date: Date): string {
  return date
    .toLocaleDateString('nl-NL', { weekday: 'short', timeZone: 'Europe/Amsterdam' })
    .replace('.', '')
}

function longDate(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Amsterdam',
  })
}

/**
 * Groepeer appointments per dag-key, sorteer dagen chronologisch,
 * en bouw een RouteDay met stops + km-totaal per dag.
 */
export function buildRouteDays(appointments: Appointment[]): RouteDay[] {
  const byDay = new Map<string, Appointment[]>()
  for (const a of appointments) {
    if (!a.afspraak_geboekt_op) continue
    const key = toAmsterdamDayKey(a.afspraak_geboekt_op)
    const list = byDay.get(key) ?? []
    list.push(a)
    byDay.set(key, list)
  }

  const dayKeys = [...byDay.keys()].sort()
  return dayKeys.map((dayKey, dayIdx) => {
    const dayApts = (byDay.get(dayKey) ?? []).sort((a, b) =>
      (a.afspraak_geboekt_op ?? '').localeCompare(b.afspraak_geboekt_op ?? ''),
    )
    const color = pickColor(dayIdx)
    // Round trip schatting: 2× afstand_km per stop (heen + terug naar basis
    // is een grove benadering; in realiteit zou een routing-engine de
    // exacte volgorde uitrekenen).
    const totalKm = dayApts.reduce(
      (sum, a) => sum + (a.afstand_km ? a.afstand_km * 2 : 0),
      0,
    )
    const stops: RouteStop[] = dayApts.map((a) => {
      const region = postcodeRegion(a.postcode)
      return {
        lead_id: a.lead_id,
        naam: a.naam,
        plaats: a.plaats,
        m2Label: formatM2(a.m2),
        tijd: a.afspraak_geboekt_op ? formatHHmm(a.afspraak_geboekt_op) : '',
        dagKey: dayKey,
        pinIndex: dayIdx + 1,
        lat: a.lat ?? null,
        lng: a.lng ?? null,
        x: clamp(region.x + jitter(`${a.lead_id}x`, 4), 10, 90),
        y: clamp(region.y + jitter(`${a.lead_id}y`, 4), 10, 90),
      }
    })

    // Parse YYYY-MM-DD → Date in NL-tijd
    const [y, m, d] = dayKey.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d, 12))

    return {
      dayKey,
      label: longDate(date),
      shortLabel: `${shortWeekday(date)} ${date.getUTCDate()}`,
      color,
      totalKm: Math.round(totalKm),
      stops,
    }
  })
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export const BASE_COORD = BASE_COORDS
