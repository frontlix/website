/**
 * Smoke test voor de Google Calendar koppeling.
 * Haalt de eerstvolgende 5 vrije slots op uit de gekoppelde agenda
 * en print ze in de terminal.
 *
 * Run: node scripts/test-google-calendar.mjs
 */

import { readFileSync } from 'node:fs'
import { google } from 'googleapis'

// Mini .env.local parser
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')]
    })
)

const clientId = env.GOOGLE_CLIENT_ID
const clientSecret = env.GOOGLE_CLIENT_SECRET
const refreshToken = env.GOOGLE_REFRESH_TOKEN
const calendarId = env.GOOGLE_CALENDAR_ID || 'primary'

if (!clientId || !clientSecret || !refreshToken) {
  console.error('❌ Missing GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN in .env.local')
  process.exit(1)
}

console.log(`📅 Testing Google Calendar koppeling`)
console.log(`   Calendar ID: ${calendarId}\n`)

const oauth = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:8080')
oauth.setCredentials({ refresh_token: refreshToken })

const calendar = google.calendar({ version: 'v3', auth: oauth })

// Step 1: ping de calendar metadata
try {
  const meta = await calendar.calendars.get({ calendarId })
  console.log(`✅ Calendar gevonden: "${meta.data.summary}"`)
  console.log(`   Tijdzone: ${meta.data.timeZone}\n`)
} catch (err) {
  console.error(`❌ Calendar metadata ophalen mislukt:`, err.message || err)
  process.exit(1)
}

// Step 2: haal vrije slots op via freebusy + beschikbaarheidsregels
const TIMEZONE = 'Europe/Amsterdam'
const SLOT_DURATION_MIN = 30
const AVAILABILITY = {
  0: { start: 9, end: 20 },
  1: { start: 13, end: 20 },
  2: { start: 9, end: 20 },
  3: { start: 9, end: 20 },
  4: { start: 13, end: 20 },
  5: { start: 13, end: 20 },
  6: { start: 9, end: 20 },
}

const now = new Date()
const rangeEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

const fb = await calendar.freebusy.query({
  requestBody: {
    timeMin: now.toISOString(),
    timeMax: rangeEnd.toISOString(),
    timeZone: TIMEZONE,
    items: [{ id: calendarId }],
  },
})
const busy = (fb.data.calendars?.[calendarId]?.busy ?? []).map((b) => ({
  start: new Date(b.start),
  end: new Date(b.end),
}))
console.log(`📊 Busy events in komende 14 dagen: ${busy.length}\n`)

const slots = []
const earliest = new Date(now.getTime() + 60 * 60 * 1000)
const cursor = new Date(now)
cursor.setHours(0, 0, 0, 0)
const endCursor = new Date(rangeEnd)
endCursor.setHours(0, 0, 0, 0)

while (cursor <= endCursor && slots.length < 5) {
  const dow = cursor.getDay()
  const window = AVAILABILITY[dow]
  if (window) {
    for (let hour = window.start; hour < window.end; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_DURATION_MIN) {
        const start = new Date(cursor)
        start.setHours(hour, minute, 0, 0)
        const end = new Date(start.getTime() + SLOT_DURATION_MIN * 60 * 1000)

        if (start < earliest) continue
        if (start < now || end > rangeEnd) continue

        const conflict = busy.some((b) => start < b.end && end > b.start)
        if (conflict) continue

        slots.push({ start, end })
        if (slots.length >= 5) break
      }
      if (slots.length >= 5) break
    }
  }
  cursor.setDate(cursor.getDate() + 1)
}

console.log(`🟢 Eerstvolgende ${slots.length} vrije slots:\n`)
const fmt = new Intl.DateTimeFormat('nl-NL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIMEZONE,
})
slots.forEach((s, i) => {
  console.log(`   ${i + 1}. ${fmt.format(s.start)}`)
})

console.log('\n✅ Google Calendar koppeling werkt!')
