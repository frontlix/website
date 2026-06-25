import { describe, it, expect } from 'vitest'
import { leadStage, mapLeadToCard, type RawLead } from './lead-mappers'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'

const base: RawLead = {
  lead_id: 'L-1', naam: 'Jan de Vries', plaats: 'Delft', m2: 145,
  hoofdcategorie: 'Oprit', sub_diensten: ['invegen', 'beschermlaag'],
  totaal_prijs: null, gesprek_fase: 'info_verzamelen', dashboard_status: 'open',
  bron: 'whatsapp', kanaal: 'whatsapp', afspraak_datum: null, afspraak_starttijd: null,
  aangemaakt: '2026-05-28T11:58:00Z', bijgewerkt: '2026-05-28T11:58:00Z',
  pending_eigenaar_review: false, klus_geblokkeerd: false,
} as RawLead

describe('leadStage', () => {
  it('afgehandeld → klaar (wint van fase)', () => {
    expect(leadStage({ ...base, dashboard_status: 'afgehandeld', gesprek_fase: 'datum_kiezen' })).toBe('klaar')
  })
  it('onderhandelen → uit (offerte is al verstuurd, klant onderhandelt)', () => expect(leadStage({ ...base, gesprek_fase: 'onderhandelen' })).toBe('uit'))
  it('pending_eigenaar_review → review (wacht op jouw goedkeuring vóór verzending)', () => expect(leadStage({ ...base, pending_eigenaar_review: true })).toBe('review'))
  it('heeft_wachtende_offerte → review (offerte wacht op goedkeuring, ook zonder pending_eigenaar_review)', () => expect(leadStage({ ...base, heeft_wachtende_offerte: true })).toBe('review'))
  it('offerte_besproken → uit', () => expect(leadStage({ ...base, gesprek_fase: 'offerte_besproken' })).toBe('uit'))
  it('afspraak_bevestigd → gepland', () => expect(leadStage({ ...base, gesprek_fase: 'afspraak_bevestigd' })).toBe('gepland'))
  it('info_verzamelen/default → gesprek', () => expect(leadStage(base)).toBe('gesprek'))
})
describe('mapLeadToCard', () => {
  const now = new Date('2026-05-28T12:00:00Z').getTime()
  it('dienst joint hoofdcategorie + sub_diensten', () => expect(mapLeadToCard(base, now).dienst).toBe('Oprit · invegen + beschermlaag'))
  it('kanaal whatsapp → wa', () => expect(mapLeadToCard(base, now).bron).toBe('wa'))
  it('kanaal web → form', () => expect(mapLeadToCard({ ...base, kanaal: 'web' }, now).bron).toBe('form'))
  it('binnen via shortTimeAgo (fallback aangemaakt)', () => expect(mapLeadToCard(base, now).binnen).toBe('2m'))
  it('binnen gebruikt laatste klant-interactie als die is meegegeven', () =>
    // aangemaakt 11:58 (2m), maar laatste inkomende bericht 11:59 (1m) → 1m
    expect(mapLeadToCard(base, now, '2026-05-28T11:59:00Z').binnen).toBe('1m'))
  it('binnen negeert bijgewerkt (eigenaar-acties mogen niet tellen)', () =>
    // bijgewerkt 'nu', maar geen klant-interactie → toont binnenkomst (2m), niet 'nu'
    expect(mapLeadToCard({ ...base, bijgewerkt: '2026-05-28T12:00:00Z' }, now, null).binnen).toBe('2m'))
  it('urgent als pending_eigenaar_review', () => expect(mapLeadToCard({ ...base, pending_eigenaar_review: true }, now).urgent).toBe(true))
  it('urgent als heeft_wachtende_offerte', () => expect(mapLeadToCard({ ...base, heeft_wachtende_offerte: true }, now).urgent).toBe(true))
})

function baseLead(overrides: Partial<LeadListItem>): LeadListItem {
  return {
    lead_id: 'L1', naam: 'Test', bedrijfsnaam: null, telefoon: null, email: null,
    straat: null, huisnummer: null, postcode: null, plaats: 'Goes',
    hoofdcategorie: null, sub_diensten: null, m2: null, totaal_prijs: null,
    afstand_km: null, status: 'in_gesprek', gesprek_fase: 'info_verzamelen',
    dashboard_status: 'open', bron: null, afspraak_datum: null, afspraak_starttijd: null,
    aangemaakt: '2026-06-01T10:00:00Z', bijgewerkt: '2026-06-01T10:00:00Z', kanaal: 'wa',
    pending_eigenaar_review: null, klus_geblokkeerd: null, offerte_pending_sinds: null,
    offerte_verstuurd: null, offerte_verstuurd_op: null, akkoord_op: null,
    eigenaar_overgenomen: false,
    ...overrides,
  } as LeadListItem
}

describe('mobiele kaart hand-over', () => {
  it('zet handover=true bij eigenaar_overgenomen', () => {
    expect(mapLeadToCard(baseLead({ eigenaar_overgenomen: true })).handover).toBe(true)
  })
  it('zet handover=true bij status=handoff', () => {
    expect(mapLeadToCard(baseLead({ status: 'handoff' })).handover).toBe(true)
  })
  it('handover=false bij een normale lead', () => {
    expect(mapLeadToCard(baseLead({})).handover).toBe(false)
  })
})
