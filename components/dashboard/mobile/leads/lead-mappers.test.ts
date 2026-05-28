import { describe, it, expect } from 'vitest'
import { leadStage, mapLeadToCard, type RawLead } from './lead-mappers'

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
  it('onderhandelen → review', () => expect(leadStage({ ...base, gesprek_fase: 'onderhandelen' })).toBe('review'))
  it('offerte_besproken → uit', () => expect(leadStage({ ...base, gesprek_fase: 'offerte_besproken' })).toBe('uit'))
  it('afspraak_bevestigd → gepland', () => expect(leadStage({ ...base, gesprek_fase: 'afspraak_bevestigd' })).toBe('gepland'))
  it('info_verzamelen/default → gesprek', () => expect(leadStage(base)).toBe('gesprek'))
})
describe('mapLeadToCard', () => {
  const now = new Date('2026-05-28T12:00:00Z').getTime()
  it('dienst joint hoofdcategorie + sub_diensten', () => expect(mapLeadToCard(base, now).dienst).toBe('Oprit · invegen + beschermlaag'))
  it('kanaal whatsapp → wa', () => expect(mapLeadToCard(base, now).bron).toBe('wa'))
  it('kanaal web → form', () => expect(mapLeadToCard({ ...base, kanaal: 'web' }, now).bron).toBe('form'))
  it('binnen via shortTimeAgo', () => expect(mapLeadToCard(base, now).binnen).toBe('2m'))
  it('urgent als pending_eigenaar_review', () => expect(mapLeadToCard({ ...base, pending_eigenaar_review: true }, now).urgent).toBe(true))
})
