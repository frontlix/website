import { describe, it, expect } from 'vitest'
import { appointmentInstantIso, DEFAULT_START_TIME } from './appointment-instant'
import { toAmsterdamDayKey } from './calendar'
import { amsterdamTime } from '@/components/dashboard/mobile/agenda/agenda-mobile-mappers'

describe('appointmentInstantIso', () => {
  it('zet een zomer-afspraak (CEST, +2u) correct om naar UTC', () => {
    // 11 juni 08:00 Amsterdam = 06:00 UTC
    expect(appointmentInstantIso('2026-06-11', '08:00')).toBe('2026-06-11T06:00:00.000Z')
  })

  it('zet een winter-afspraak (CET, +1u) correct om naar UTC', () => {
    // 15 januari 08:00 Amsterdam = 07:00 UTC
    expect(appointmentInstantIso('2026-01-15', '08:00')).toBe('2026-01-15T07:00:00.000Z')
  })

  it('blijft consistent terug-leesbaar: dag-key en tijd matchen de invoer', () => {
    const iso = appointmentInstantIso('2026-06-11', '14:30')!
    expect(toAmsterdamDayKey(iso)).toBe('2026-06-11')
    expect(amsterdamTime(iso)).toBe('14:30')
  })

  it('valt terug op de standaard-starttijd als er geen tijd is', () => {
    const withNull = appointmentInstantIso('2026-06-11', null)!
    const withDefault = appointmentInstantIso('2026-06-11', DEFAULT_START_TIME)!
    expect(withNull).toBe(withDefault)
    expect(amsterdamTime(withNull)).toBe(DEFAULT_START_TIME)
  })

  it('geeft null als de datum ontbreekt of ongeldig is', () => {
    expect(appointmentInstantIso(null, '08:00')).toBeNull()
    expect(appointmentInstantIso('', '08:00')).toBeNull()
    expect(appointmentInstantIso('geen-datum', '08:00')).toBeNull()
  })

  it('accepteert een volledige timestamp in afspraak_datum en pakt de datum', () => {
    const iso = appointmentInstantIso('2026-06-11', '09:15')!
    expect(toAmsterdamDayKey(iso)).toBe('2026-06-11')
    expect(amsterdamTime(iso)).toBe('09:15')
  })
})
