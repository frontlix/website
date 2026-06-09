/**
 * De agenda-weergave plaatst een afspraak op de DATUM van de afspraak zelf,
 * niet op het moment waarop hij geboekt werd. De echte afspraak staat in de
 * leads-tabel als `afspraak_datum` (YYYY-MM-DD) + `afspraak_starttijd` (HH:MM),
 * beide als lokale (Europe/Amsterdam) wandklok-waarden. Dit is precies wat ook
 * naar Google Agenda gaat.
 *
 * De rest van de agenda-code rekent met één UTC ISO-timestamp per afspraak
 * (via `toAmsterdamDayKey` / `amsterdamTime`). Deze helper zet de lokale
 * datum+tijd om naar die UTC ISO-timestamp, DST-correct (CEST/CET), zodat de
 * weergave-laag onveranderd blijft werken.
 */

const AMS_TZ = 'Europe/Amsterdam'

/** Standaard-starttijd als een afspraak (nog) geen tijd heeft: begin werkdag. */
export const DEFAULT_START_TIME = '08:00'

/**
 * Offset (in ms) van Europe/Amsterdam t.o.v. UTC op het gegeven UTC-moment.
 * Positief in de zomer (CEST = +2u), kleiner in de winter (CET = +1u).
 */
function amsterdamOffsetMs(utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: AMS_TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(new Date(utcMs))
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  // Sommige Node-versies geven '24' voor middernacht; normaliseer naar '00'.
  const hour = map.hour === '24' ? '00' : map.hour
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second),
  )
  return asUtc - utcMs
}

/**
 * Zet een lokale (Amsterdam) afspraakdatum + starttijd om naar een UTC
 * ISO-timestamp. `datum` = 'YYYY-MM-DD', `starttijd` = 'HH:MM' (of null →
 * DEFAULT_START_TIME). Geeft null terug als de datum ontbreekt/ongeldig is.
 *
 * Voorbeeld (zomer, CEST): ('2026-06-11', '08:00') → '2026-06-11T06:00:00.000Z'
 * Voorbeeld (winter, CET):  ('2026-01-15', '08:00') → '2026-01-15T07:00:00.000Z'
 */
export function appointmentInstantIso(
  datum: string | null | undefined,
  starttijd: string | null | undefined,
): string | null {
  if (!datum) return null
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(datum)
  if (!dateMatch) return null
  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])

  const timeStr = starttijd && /^\d{1,2}:\d{2}/.test(starttijd) ? starttijd : DEFAULT_START_TIME
  const [h, m] = timeStr.split(':').map(Number)

  // Interpreteer de wandklok-waarde eerst alsof het UTC was, bepaal de
  // Amsterdam-offset op dat moment en corrigeer. Eén verfijning dekt de
  // DST-overgangen (de offset rond de gok is op een paar uur na correct).
  const wallAsUtc = Date.UTC(year, month - 1, day, h, m)
  const guessOffset = amsterdamOffsetMs(wallAsUtc)
  let utcMs = wallAsUtc - guessOffset
  const refinedOffset = amsterdamOffsetMs(utcMs)
  if (refinedOffset !== guessOffset) {
    utcMs = wallAsUtc - refinedOffset
  }
  return new Date(utcMs).toISOString()
}
