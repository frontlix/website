/**
 * Google Calendar wrapper voor de afspraak-agent.
 *
 * Vereiste env vars (eenmalig opgezet via scripts/google-oauth-setup.mjs):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN     ← persistent, hoeft nooit te worden ververst
 *   GOOGLE_CALENDAR_ID       ← optioneel, default 'primary'
 *
 * Beschikbaarheidsregels (Frontlix privé agenda):
 *   maandag    13:00 - 20:00
 *   dinsdag    09:00 - 20:00
 *   woensdag   09:00 - 20:00
 *   donderdag  13:00 - 20:00
 *   vrijdag    13:00 - 20:00
 *   zaterdag   09:00 - 20:00
 *   zondag     09:00 - 20:00
 *
 * Slot-duur: 30 minuten.
 */

import { google } from 'googleapis'
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz'
import { addMinutes, addDays, startOfDay } from 'date-fns'

export const TIMEZONE = 'Europe/Amsterdam'
export const SLOT_DURATION_MIN = 30

/** day-of-week (0=zo, 1=ma ... 6=za) → start/end uur in lokale tijd */
const AVAILABILITY: Record<number, { start: number; end: number } | null> = {
  0: { start: 9, end: 20 },   // zo
  1: { start: 13, end: 20 },  // ma
  2: { start: 9, end: 20 },   // di
  3: { start: 9, end: 20 },   // wo
  4: { start: 13, end: 20 },  // do
  5: { start: 13, end: 20 },  // vr
  6: { start: 9, end: 20 },   // za
}

export interface FreeSlot {
  /** UTC start van de slot */
  startUtc: Date
  /** UTC einde van de slot */
  endUtc: Date
  /** Mens-leesbare label in NL tijdzone, bv. "ma 14 apr 14:00" */
  label: string
  /** ISO string voor latere lookup / matching met klantkeuze */
  iso: string
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Calendar env variabelen ontbreken (GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN)')
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:8080')
  oauth.setCredentials({ refresh_token: refreshToken })
  return oauth
}

function getCalendarClient() {
  return google.calendar({ version: 'v3', auth: getOAuthClient() })
}

/**
 * Haal alle vrije slots op binnen [rangeStart, rangeEnd] die voldoen aan
 * de beschikbaarheidsregels en geen overlap hebben met bestaande events.
 *
 * @param rangeStart UTC start
 * @param rangeEnd   UTC einde
 * @param maxSlots   max aantal te returnen slots (default 20)
 */
export async function getFreeSlots(
  rangeStart: Date,
  rangeEnd: Date,
  maxSlots = 20
): Promise<FreeSlot[]> {
  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

  // 1) Haal busy-tijden uit Google Calendar
  const fb = await calendar.freebusy.query({
    requestBody: {
      timeMin: rangeStart.toISOString(),
      timeMax: rangeEnd.toISOString(),
      timeZone: TIMEZONE,
      items: [{ id: calendarId }],
    },
  })
  const busyRanges = (fb.data.calendars?.[calendarId]?.busy ?? []).map((b) => ({
    start: new Date(b.start!),
    end: new Date(b.end!),
  }))

  // 2) Genereer alle kandidaat-slots binnen de beschikbaarheidsregels
  const slots: FreeSlot[] = []
  const now = new Date()
  // Begin de zoektocht ten vroegste 1 uur vanaf nu (geen "over 5 minuten" voorstellen)
  const earliest = new Date(now.getTime() + 60 * 60 * 1000)

  // Itereer per dag binnen de range (in NL tijdzone)
  let cursor = startOfDay(toZonedTime(rangeStart, TIMEZONE))
  const endCursor = startOfDay(toZonedTime(rangeEnd, TIMEZONE))

  while (cursor <= endCursor && slots.length < maxSlots) {
    const dow = cursor.getDay()
    const window = AVAILABILITY[dow]
    if (window) {
      // Bouw alle slots voor deze dag
      for (let hour = window.start; hour < window.end; hour++) {
        for (let minute = 0; minute < 60; minute += SLOT_DURATION_MIN) {
          // Maak een lokaal datetime in NL → converteer naar UTC voor opslag
          const localDt = new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate(),
            hour,
            minute,
            0,
            0
          )
          const startUtc = fromZonedTime(localDt, TIMEZONE)
          const endUtc = addMinutes(startUtc, SLOT_DURATION_MIN)

          // Skip als in het verleden of te vroeg
          if (startUtc < earliest) continue
          if (startUtc < rangeStart || endUtc > rangeEnd) continue

          // Skip als overlap met busy
          const conflict = busyRanges.some(
            (b) => startUtc < b.end && endUtc > b.start
          )
          if (conflict) continue

          slots.push({
            startUtc,
            endUtc,
            label: formatTz(startUtc, "EEE d MMM HH:mm", { timeZone: TIMEZONE }),
            iso: startUtc.toISOString(),
          })

          if (slots.length >= maxSlots) break
        }
        if (slots.length >= maxSlots) break
      }
    }
    cursor = addDays(cursor, 1)
  }

  return slots
}

export interface CreateEventInput {
  startUtc: Date
  endUtc: Date
  summary: string
  description?: string
  /** Email van de klant — wordt als attendee toegevoegd zodat hij ook een Google invite krijgt */
  attendeeEmail?: string
}

export interface CreateEventResult {
  eventId: string
  htmlLink: string
}

/** Maak een Google Calendar event aan en returnt het event ID */
export async function createEvent(input: CreateEventInput): Promise<CreateEventResult> {
  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startUtc.toISOString(), timeZone: TIMEZONE },
      end: { dateTime: input.endUtc.toISOString(), timeZone: TIMEZONE },
      ...(input.attendeeEmail
        ? { attendees: [{ email: input.attendeeEmail }] }
        : {}),
    },
    sendUpdates: input.attendeeEmail ? 'all' : 'none',
  })

  return {
    eventId: res.data.id || '',
    htmlLink: res.data.htmlLink || '',
  }
}
