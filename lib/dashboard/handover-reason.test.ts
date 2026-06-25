import { describe, it, expect } from 'vitest'
import { handoverReason } from './handover-reason'

const grenzen = { radiusMaxKm: 50, minM2BuitenStraal: 200 }

describe('handoverReason', () => {
  it('geeft lege regels bij een niet-hand-over-lead', () => {
    expect(handoverReason({ eigenaar_overgenomen: false, status: 'nieuw', afstand_km: 80, m2: 50 }, grenzen))
      .toEqual({ adresSub: null, oppervlakteSub: null })
  })
  it('te ver + te klein: beide regels', () => {
    const r = handoverReason({ eigenaar_overgenomen: true, afstand_km: 80, m2: 50 }, grenzen)
    expect(r.adresSub).toBe('Te ver, buiten je werkstraal (50 km)')
    expect(r.oppervlakteSub).toBe('Te klein, onder 200 m²')
  })
  it('alleen te ver: adres gevuld, oppervlakte null', () => {
    const r = handoverReason({ eigenaar_overgenomen: true, afstand_km: 80, m2: 500 }, grenzen)
    expect(r.adresSub).toBe('Te ver, buiten je werkstraal (50 km)')
    expect(r.oppervlakteSub).toBeNull()
  })
  it('alleen te klein: oppervlakte gevuld, adres null', () => {
    const r = handoverReason({ eigenaar_overgenomen: true, afstand_km: 10, m2: 50 }, grenzen)
    expect(r.adresSub).toBeNull()
    expect(r.oppervlakteSub).toBe('Te klein, onder 200 m²')
  })
  it('hand-over zonder overschrijding: neutrale fallback', () => {
    const r = handoverReason({ status: 'handoff', afstand_km: 10, m2: 500 }, grenzen)
    expect(r.adresSub).toBe('Bot heeft dit gesprek overgedragen')
    expect(r.oppervlakteSub).toBeNull()
  })
  it('hand-over met ontbrekende afstand/m2: neutrale fallback', () => {
    const r = handoverReason({ eigenaar_overgenomen: true, afstand_km: null, m2: null }, grenzen)
    expect(r.adresSub).toBe('Bot heeft dit gesprek overgedragen')
    expect(r.oppervlakteSub).toBeNull()
  })
})
