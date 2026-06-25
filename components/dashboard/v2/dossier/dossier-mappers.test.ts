import { describe, it, expect } from 'vitest'
import { mapLeadDetailToV2Lead, mapLeadDetailToDossierData } from './dossier-mappers'

// Minimale LeadDetail-stub; alleen de velden die mapLeadDetailToV2Lead leest.
function detailStub(leadOverrides: Record<string, unknown>) {
  return {
    lead: {
      lead_id: 'L1', naam: 'Test', plaats: 'Goes', hoofdcategorie: null,
      totaal_prijs: null, bron: 'whatsapp', kanaal: 'wa', aangemaakt: '2026-06-01T10:00:00Z',
      dashboard_status: 'open', gesprek_fase: 'info_verzamelen', pending_eigenaar_review: null,
      status: 'info_compleet', eigenaar_overgenomen: false, ...leadOverrides,
    },
    offertes: [],
  } as never
}

describe('dossier-kop hand-over', () => {
  it('toont "Zelf overnemen" + hot bij eigenaar_overgenomen=true', () => {
    const v2 = mapLeadDetailToV2Lead(detailStub({ eigenaar_overgenomen: true }))
    expect(v2.status).toBe('Zelf overnemen')
    expect(v2.statusKind).toBe('hot')
  })
  it('toont de gewone status bij een normale lead', () => {
    const v2 = mapLeadDetailToV2Lead(detailStub({}))
    expect(v2.status).not.toBe('Zelf overnemen')
  })
})

function detailFor(leadOverrides: Record<string, unknown>) {
  return {
    lead: {
      lead_id: 'L1', naam: 'Test', plaats: 'Goes', telefoon: null, email: null, bedrijfsnaam: null,
      straat: 'Straat', huisnummer: '1', postcode: '4330', kanaal: 'wa', bron: 'whatsapp',
      hoofdcategorie: 'oprit_terras_terrein', sub_diensten: [], m2: 50, afstand_km: 80, lat: null, lng: null,
      status: 'info_compleet', eigenaar_overgenomen: true, dashboard_status: 'open', gesprek_fase: 'info_verzamelen',
      pending_eigenaar_review: null, aangemaakt: '2026-06-01T10:00:00Z', offerte_geldigheid_dagen: 14,
      ...leadOverrides,
    },
    offertes: [], prijsregels: [], fotos: [], berichten: [], notes: [], statusHistory: [],
  } as never
}

describe('dossier hand-over-reden', () => {
  const grenzen = { radiusMaxKm: 50, minM2BuitenStraal: 200 }
  it('toont rode te-ver + te-klein regels bij een hand-over-lead', () => {
    const d = mapLeadDetailToDossierData(detailFor({}), undefined, undefined, grenzen)
    const adres = d.klant.find((r) => r.label === 'Adres')
    const opp = d.werk.find((r) => r.label === 'Oppervlakte')
    expect(adres?.sub).toBe('Te ver, buiten je werkstraal (50 km)')
    expect(adres?.tone).toBe('warn')
    expect(opp?.sub).toBe('Te klein, onder 200 m²')
    expect(opp?.tone).toBe('warn')
  })
  it('laat een gewone lead ongemoeid (geen reden-tone)', () => {
    const d = mapLeadDetailToDossierData(detailFor({ eigenaar_overgenomen: false, afstand_km: 10 }), undefined, undefined, grenzen)
    const adres = d.klant.find((r) => r.label === 'Adres')
    expect(adres?.tone).toBeFalsy()
  })
})
