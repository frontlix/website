import { describe, test, expect } from 'vitest'
import { leadStatusMeta, headerStatusMeta } from './lead-status-meta'

describe('leadStatusMeta — pijplijn-status (leads.status)', () => {
  test('info_compleet → "Klaar voor offerte" (amber)', () => {
    expect(leadStatusMeta('info_compleet')).toEqual({ label: 'Klaar voor offerte', tone: 'amber' })
  })
  test('offerte_verstuurd → "Offerte verstuurd" (amber)', () => {
    expect(leadStatusMeta('offerte_verstuurd')).toEqual({ label: 'Offerte verstuurd', tone: 'amber' })
  })
  test('null → neutraal streepje (gray)', () => {
    expect(leadStatusMeta(null)).toEqual({ label: '—', tone: 'gray' })
  })
  test('onbekende status → gehumaniseerd label (gray)', () => {
    expect(leadStatusMeta('iets_raars')).toEqual({ label: 'iets raars', tone: 'gray' })
  })
})

describe('headerStatusMeta — detailkop-badge (Bug A)', () => {
  test('geen handmatige owner-status → spiegelt de pijplijn-status i.p.v. "In gesprek"', () => {
    // Dit is de bug: concept-offerte klaar, status=info_compleet, maar de kop
    // toonde "In gesprek" (uit dashboard_status=null).
    expect(headerStatusMeta({ status: 'info_compleet', dashboard_status: null })).toEqual({
      label: 'Klaar voor offerte',
      tone: 'amber',
    })
  })
  test('dashboard_status "open" telt als geen handmatige keuze → pijplijn-status', () => {
    expect(headerStatusMeta({ status: 'offerte_verstuurd', dashboard_status: 'open' })).toEqual({
      label: 'Offerte verstuurd',
      tone: 'amber',
    })
  })
  test('handmatige owner-follow-up (afgehandeld) wint van de pijplijn-status', () => {
    expect(headerStatusMeta({ status: 'offerte_verstuurd', dashboard_status: 'afgehandeld' })).toEqual({
      label: 'Afgehandeld',
      tone: 'green',
    })
  })
  test('nieuwe lead zonder owner-status → "Nieuw"', () => {
    expect(headerStatusMeta({ status: 'nieuw', dashboard_status: null })).toEqual({
      label: 'Nieuw',
      tone: 'blue',
    })
  })
})
