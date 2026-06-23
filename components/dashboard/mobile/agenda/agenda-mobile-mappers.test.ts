import { describe, it, expect } from 'vitest'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import type { ExternalEvent } from '@/lib/dashboard/external-events-queries'
import {
  amsterdamTime,
  amsterdamDayKey,
  addMinutes,
  appointmentAdres,
  buildMobileWeekDays,
  mapAppointmentsToAgendaEvents,
  mapExternalEventToAgendaEvent,
  mapExternalEventsToAgendaEvents,
} from './agenda-mobile-mappers'

function ext(over: Partial<ExternalEvent>): ExternalEvent {
  return {
    google_event_id: 'g1',
    summary: 'Tandarts',
    start_at: '2026-05-13T07:00:00.000Z', // 09:00 Amsterdam (CEST)
    end_at: '2026-05-13T08:30:00.000Z', // 10:30 Amsterdam
    all_day: false,
    ...over,
  }
}

// Minimale Appointment-factory voor de tests (alleen velden die de mapper raakt).
// `over` is bewust losjes getypeerd zodat we ook randgevallen (bv. ontbrekend
// tijdstip) kunnen forceren die het strikte Appointment-type niet toelaat.
function appt(over: Record<string, unknown>): Appointment {
  return {
    lead_id: 'L1',
    naam: 'Test',
    telefoon: null,
    afspraak_geboekt_op: '2026-05-13T07:00:00.000Z',
    dashboard_status: null,
    status: null,
    plaats: null,
    postcode: null,
    straat: null,
    huisnummer: null,
    m2: null,
    afstand_km: null,
    hoofdcategorie: null,
    lat: null,
    lng: null,
    ...over,
  } as unknown as Appointment
}

describe('amsterdamTime / amsterdamDayKey', () => {
  it('rekent UTC om naar Amsterdam-tijd (CEST = UTC+2 in mei)', () => {
    expect(amsterdamTime('2026-05-13T07:00:00.000Z')).toBe('09:00')
  })
  it('schuift de dagkey door bij late UTC-avond', () => {
    expect(amsterdamDayKey('2026-05-13T22:30:00.000Z')).toBe('2026-05-14')
  })
})

describe('addMinutes', () => {
  it('telt minuten op', () => {
    expect(addMinutes('09:00', 90)).toBe('10:30')
  })
  it('clampt op 23:59', () => {
    expect(addMinutes('23:30', 90)).toBe('23:59')
  })
})

describe('appointmentAdres', () => {
  it('combineert straat + huisnummer + plaats', () => {
    expect(appointmentAdres({ straat: 'Kerkstraat', huisnummer: '8', plaats: 'Bilthoven' })).toBe(
      'Kerkstraat 8 · Bilthoven',
    )
  })
  it('valt terug op, bij ontbrekende delen', () => {
    expect(appointmentAdres({ straat: null, huisnummer: null, plaats: null })).toBe('—')
  })
})

describe('mapAppointmentsToAgendaEvents', () => {
  it('mapt een afspraak naar een AgendaEvent met geschatte eindtijd', () => {
    const now = new Date('2026-05-13T06:00:00.000Z') // ruim vóór de afspraak
    const [ev] = mapAppointmentsToAgendaEvents(
      [appt({ lead_id: 'L9', naam: 'Marieke', m2: 62, hoofdcategorie: 'oprit' })],
      now,
    )
    expect(ev.id).toBe('L9')
    expect(ev.lead).toBe('L9')
    expect(ev.kind).toBe('klus')
    expect(ev.start).toBe('09:00')
    // Een klus beslaat de hele werkdag: van de starttijd tot 17:00.
    expect(ev.end).toBe('17:00')
    expect(ev.date).toBe('2026-05-13')
    expect(ev.m2).toBe(62)
    expect(ev.dienst).toBe('oprit')
    expect(ev.current).toBe(false)
  })

  it('markeert current wanneer NU binnen [start, einde werkdag] valt', () => {
    // 07:00 UTC = 09:00 Amsterdam; werkdag-eind 17:00 → duur 8 uur.
    const startIso = '2026-05-13T07:00:00.000Z'
    const during = new Date(new Date(startIso).getTime() + 30 * 60_000) // 09:30, binnen
    const after = new Date(new Date(startIso).getTime() + (8 * 60 + 5) * 60_000) // 17:05, na
    expect(mapAppointmentsToAgendaEvents([appt({ afspraak_geboekt_op: startIso })], during)[0].current).toBe(true)
    expect(mapAppointmentsToAgendaEvents([appt({ afspraak_geboekt_op: startIso })], after)[0].current).toBe(false)
  })

  it('negeert afspraken zonder tijdstip en sorteert op datum+tijd', () => {
    const now = new Date('2026-05-13T06:00:00.000Z')
    const out = mapAppointmentsToAgendaEvents(
      [
        appt({ lead_id: 'late', afspraak_geboekt_op: '2026-05-13T10:00:00.000Z' }),
        appt({ lead_id: 'none', afspraak_geboekt_op: null }),
        appt({ lead_id: 'early', afspraak_geboekt_op: '2026-05-13T07:00:00.000Z' }),
      ],
      now,
    )
    expect(out.map((e) => e.id)).toEqual(['early', 'late'])
  })
})

describe('mapExternalEventToAgendaEvent', () => {
  it('mapt naar een read-only eigen event zonder lead, met ext-id', () => {
    const ev = mapExternalEventToAgendaEvent(ext({}))
    expect(ev.id).toBe('ext-g1')
    expect(ev.kind).toBe('eigen')
    expect(ev.lead).toBeUndefined()
    expect(ev.naam).toBe('Tandarts')
    expect(ev.start).toBe('09:00')
    expect(ev.end).toBe('10:30')
    expect(ev.date).toBe('2026-05-13')
  })

  it('valt terug op een nette naam zonder summary', () => {
    expect(mapExternalEventToAgendaEvent(ext({ summary: null })).naam).toBe('Google-afspraak')
  })

  it('zonder eindtijd is end gelijk aan start', () => {
    const ev = mapExternalEventToAgendaEvent(ext({ end_at: null }))
    expect(ev.end).toBe(ev.start)
  })

  it('sorteert meerdere events op datum + tijd', () => {
    const out = mapExternalEventsToAgendaEvents([
      ext({ google_event_id: 'b', start_at: '2026-05-13T10:00:00.000Z' }),
      ext({ google_event_id: 'a', start_at: '2026-05-13T07:00:00.000Z' }),
    ])
    expect(out.map((e) => e.id)).toEqual(['ext-a', 'ext-b'])
  })
})

describe('buildMobileWeekDays', () => {
  it('bouwt ma–zo vanaf de maandag-key', () => {
    const days = buildMobileWeekDays('2026-05-11')
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual({ date: '2026-05-11', wday: 'ma', day: 11 })
    expect(days[6]).toEqual({ date: '2026-05-17', wday: 'zo', day: 17 })
  })
})
