// MOCK v1 — vervang door getAppointmentsForRange in de functionele pass

export type AgendaEventKind = 'plaatsbezoek' | 'klus' | 'bel' | 'eigen'

export interface AgendaEvent {
  id: string
  kind: AgendaEventKind
  naam: string
  adres: string
  start: string        // 'HH:MM'
  end: string          // 'HH:MM'
  date: string         // 'YYYY-MM-DD'
  m2?: number
  prijs?: number
  dienst?: string
  klant?: string
  lead?: string        // leadId
  materialen?: string[]
  current?: boolean    // live / bezig event
  done?: boolean       // afgehandeld (dashboard_status === 'afgehandeld')
}

// ── Kind mapping: handoff tone-field → typed kind ─────────────────────────
// AgendaShared used ev.tone: green → klus, blue → plaatsbezoek, amber → bel/eigen
// We use a proper kind discriminant instead.

/** The event that is currently live ("bezig"). */
export const NOW_ID = 'C1'

export const AG_EVENTS: AgendaEvent[] = [
  // Maandag 11 mei
  {
    id: 'A1',
    date: '2026-05-11',
    start: '09:00',
    end: '10:30',
    kind: 'plaatsbezoek',
    naam: 'Thomas Wilms',
    adres: 'Wassenaar',
    m2: 220,
    dienst: 'Oprit + tuin',
    lead: 'L-2083',
  },
  {
    id: 'A2',
    date: '2026-05-11',
    start: '13:30',
    end: '17:00',
    kind: 'klus',
    naam: 'Familie de Wit',
    adres: 'Den Haag',
    m2: 95,
    dienst: 'Invegen + beschermlaag',
    lead: 'L-2076',
  },

  // Dinsdag 12 mei
  {
    id: 'B1',
    date: '2026-05-12',
    start: '08:00',
    end: '11:30',
    kind: 'klus',
    naam: 'VVE Stadshof',
    adres: 'Zeist',
    m2: 480,
    dienst: 'Onkruidbeheersing',
    lead: 'L-2081',
  },
  {
    id: 'B2',
    date: '2026-05-12',
    start: '10:00',
    end: '10:30',
    kind: 'bel',
    naam: 'Offerte review-call',
    adres: 'Telefonisch',
    dienst: 'Bouwbedrijf Korstmos',
  },

  // Woensdag 13 mei — vandaag, 3 stops; C1 is live
  {
    id: 'C1',
    date: '2026-05-13',
    start: '09:00',
    end: '12:00',
    kind: 'klus',
    naam: 'Marieke v.d. Heijden',
    adres: 'Wilhelminapark 12 · Utrecht',
    m2: 62,
    dienst: 'Invegen',
    lead: 'L-2085',
    current: true,
  },
  {
    id: 'C2',
    date: '2026-05-13',
    start: '13:00',
    end: '15:30',
    kind: 'klus',
    naam: 'Familie Bakker',
    adres: 'Kerkstraat 8 · Bilthoven',
    m2: 90,
    dienst: 'Korstmos-toeslag',
    lead: 'L-2084',
  },
  {
    id: 'C3',
    date: '2026-05-13',
    start: '16:00',
    end: '17:00',
    kind: 'plaatsbezoek',
    naam: 'VVE De Linde',
    adres: 'Stadshof 1-24 · Zeist',
    m2: 120,
    dienst: 'Tuinpaden',
    lead: 'L-2088',
  },

  // Donderdag 14 mei
  {
    id: 'D1',
    date: '2026-05-14',
    start: '10:00',
    end: '11:00',
    kind: 'plaatsbezoek',
    naam: 'VVE Stadshof intake',
    adres: 'Rotterdam',
    m2: 480,
    dienst: 'Onkruidbeheersing',
    lead: 'L-2081',
  },
  {
    id: 'D2',
    date: '2026-05-14',
    start: '13:00',
    end: '14:00',
    kind: 'eigen',
    naam: 'Inkoop voegzand',
    adres: 'Bouwmaat · Biervliet',
    dienst: 'Materiaal',
  },

  // Vrijdag 15 mei — lange dag
  {
    id: 'E1',
    date: '2026-05-15',
    start: '08:30',
    end: '14:30',
    kind: 'klus',
    naam: 'Sandra Janssen',
    adres: 'Pijnacker',
    m2: 156,
    dienst: 'Invegen + beschermlaag',
    lead: 'L-2082',
  },
  {
    id: 'E2',
    date: '2026-05-15',
    start: '15:30',
    end: '16:15',
    kind: 'plaatsbezoek',
    naam: 'Peter Hofstra',
    adres: 'Utrecht',
    m2: 70,
    dienst: 'Buiten radius — check',
    lead: 'L-2080',
  },

  // Zaterdag 16 — leeg
  // Zondag 17  — leeg
]

// ── Week days strip data ───────────────────────────────────────────────────
export interface AgendaWeekDay {
  date: string   // 'YYYY-MM-DD'
  wday: string   // 'ma' | 'di' | …
  day: number
}

export const AG_TODAY_DATE = '2026-05-13'

export const AG_WEEK_DAYS: AgendaWeekDay[] = [
  { date: '2026-05-11', wday: 'ma', day: 11 },
  { date: '2026-05-12', wday: 'di', day: 12 },
  { date: '2026-05-13', wday: 'wo', day: 13 },
  { date: '2026-05-14', wday: 'do', day: 14 },
  { date: '2026-05-15', wday: 'vr', day: 15 },
  { date: '2026-05-16', wday: 'za', day: 16 },
  { date: '2026-05-17', wday: 'zo', day: 17 },
]

// ── Day grouping helper ───────────────────────────────────────────────────
/** Return events for a specific date, sorted by start time. */
export function eventsOnDate(date: string): AgendaEvent[] {
  return AG_EVENTS
    .filter((e) => e.date === date)
    .sort((a, b) => a.start.localeCompare(b.start))
}

/** Group all AG_EVENTS by date, returning entries sorted chronologically. */
export function groupEventsByDate(): Array<{ date: string; events: AgendaEvent[] }> {
  const map = new Map<string, AgendaEvent[]>()
  for (const ev of AG_EVENTS) {
    if (!map.has(ev.date)) map.set(ev.date, [])
    map.get(ev.date)!.push(ev)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => ({ date, events: events.sort((a, b) => a.start.localeCompare(b.start)) }))
}
