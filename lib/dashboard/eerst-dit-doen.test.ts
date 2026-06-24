import { describe, it, expect } from 'vitest'
import { deriveActions } from './eerst-dit-doen'
import type { LeadListItem } from './lead-queries'

function lead(overrides: Partial<LeadListItem>): LeadListItem {
  return {
    lead_id: 'L1', naam: 'Test', bedrijfsnaam: null, telefoon: null, email: null,
    straat: null, huisnummer: null, postcode: null, plaats: 'Goes',
    hoofdcategorie: 'oprit_terras_terrein', sub_diensten: null, m2: null, totaal_prijs: 300,
    afstand_km: null, status: 'info_compleet', gesprek_fase: 'offerte_besproken',
    dashboard_status: 'open', bron: null, afspraak_datum: null, afspraak_starttijd: null,
    aangemaakt: '2026-06-01T10:00:00Z', bijgewerkt: '2026-06-01T10:00:00Z', kanaal: 'wa',
    pending_eigenaar_review: null, klus_geblokkeerd: null, offerte_pending_sinds: null,
    offerte_verstuurd: null, offerte_verstuurd_op: null, akkoord_op: null,
    eigenaar_overgenomen: false,
    ...overrides,
  } as LeadListItem
}

describe('eerst-dit-doen hand-over', () => {
  it('levert een handover-actie bij eigenaar_overgenomen=true', () => {
    const acties = deriveActions([lead({ eigenaar_overgenomen: true })])
    expect(acties[0]?.kind).toBe('handover')
    expect(acties[0]?.title).toMatch(/zelf overnemen/i)
  })
  it('geen handover-actie als de lead is afgehandeld', () => {
    const acties = deriveActions([lead({ eigenaar_overgenomen: true, dashboard_status: 'afgehandeld' })])
    expect(acties.find((a) => a.kind === 'handover')).toBeUndefined()
  })
})
