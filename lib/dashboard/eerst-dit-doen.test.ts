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

describe('eerst-dit-doen klus-afronden', () => {
  it('levert een klus_afronden-actie bij een voorbije afspraak + open lead', () => {
    const acties = deriveActions([lead({ afspraak_datum: '2020-01-01', dashboard_status: 'open' })])
    expect(acties[0]?.kind).toBe('klus_afronden')
    expect(acties[0]?.title).toMatch(/ging 'ie door/i)
    expect(acties[0]?.tone).toBe('warm')
    expect(acties[0]?.urgency).toBe(70)
  })
  it('geen klus_afronden-actie als de toggle uit staat (klusStatusMelden=false)', () => {
    const acties = deriveActions(
      [lead({ afspraak_datum: '2020-01-01', dashboard_status: 'open' })],
      5,
      undefined,
      false,
    )
    expect(acties.find((a) => a.kind === 'klus_afronden')).toBeUndefined()
  })
  it('geen klus_afronden-actie bij een toekomstige afspraak', () => {
    const acties = deriveActions([lead({ afspraak_datum: '2999-01-01', dashboard_status: 'open' })])
    expect(acties.find((a) => a.kind === 'klus_afronden')).toBeUndefined()
  })
  it('geen klus_afronden-actie als de lead al is afgehandeld', () => {
    const acties = deriveActions([lead({ afspraak_datum: '2020-01-01', dashboard_status: 'afgehandeld' })])
    expect(acties.find((a) => a.kind === 'klus_afronden')).toBeUndefined()
  })
  it('geen klus_afronden-actie als de klus al geblokkeerd is (die actie wint)', () => {
    const acties = deriveActions([
      lead({ afspraak_datum: '2020-01-01', dashboard_status: 'open', klus_geblokkeerd: true }),
    ])
    expect(acties[0]?.kind).toBe('klus_geblokkeerd')
    expect(acties.find((a) => a.kind === 'klus_afronden')).toBeUndefined()
  })
})
