import { describe, it, expect } from 'vitest'
import { mapLeadDetailToDossier } from './dossier-mappers'

function detailFor(leadOverrides: Record<string, unknown>) {
  return {
    lead: {
      lead_id: 'L1', naam: 'Test', plaats: 'Goes', telefoon: null, email: null, bedrijfsnaam: null,
      straat: 'Straat', huisnummer: '1', postcode: '4330', kanaal: 'wa', hoofdcategorie: 'oprit_terras_terrein',
      sub_diensten: [], m2: 50, afstand_km: 80, lat: null, lng: null, totaal_prijs: null,
      status: 'info_compleet', eigenaar_overgenomen: true, dashboard_status: 'open', gesprek_fase: 'info_verzamelen',
      aangemaakt: '2026-06-01T10:00:00Z', offerte_geldigheid_dagen: 14,
      ...leadOverrides,
    },
    offertes: [], prijsregels: [], fotos: [], berichten: [], notes: [], statusHistory: [],
  } as never
}

describe('mobiel dossier hand-over-reden', () => {
  const grenzen = { radiusMaxKm: 50, minM2BuitenStraal: 200 }
  it('zet de reden-teksten bij een hand-over-lead', () => {
    const d = mapLeadDetailToDossier(detailFor({}), undefined, grenzen)
    expect(d.handoverReden.adresSub).toBe('Te ver, buiten je werkstraal (50 km)')
    expect(d.handoverReden.oppervlakteSub).toBe('Te klein, onder 200 m²')
  })
  it('laat een gewone lead leeg', () => {
    const d = mapLeadDetailToDossier(detailFor({ eigenaar_overgenomen: false, afstand_km: 10 }), undefined, grenzen)
    expect(d.handoverReden.adresSub).toBeNull()
    expect(d.handoverReden.oppervlakteSub).toBeNull()
  })
})
