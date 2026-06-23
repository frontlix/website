import { describe, it, expect } from 'vitest'
import { buildSentOffertePdfModel } from './sent-offerte-pdf-model'
import { DEFAULTS } from '@/lib/dashboard/manual-offerte-types'

const baseData = { ...DEFAULTS, naam: 'Jeroen de Vries', email: 'j@x.nl' }

const objSnapshot = {
  schemaVersie: 1,
  pricing: {},
  kortingPct: 10,
  geldigheidDagen: 21,
  regels: [
    { omschrijving: 'Reiniging', aantal: 100, eenheid: 'm²', stukprijs: 3.95, totaal: 395, volgorde: 2 },
    { omschrijving: 'Invegen', aantal: 100, eenheid: 'm²', stukprijs: 4.5, totaal: 450, volgorde: 1 },
  ],
}

describe('buildSentOffertePdfModel', () => {
  it('mapt snapshot-regels naar RegelComputed, gesorteerd op volgorde', () => {
    const m = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot, totaal_incl: 1000, korting_pct: 10, versie: 3, aangemaakt_op: '2026-05-10T10:00:00Z' },
      baseData, leadId: 'abc1234',
    })!
    expect(m.rules.map((r) => r.desc)).toEqual(['Invegen', 'Reiniging'])
    expect(m.rules[0]).toMatchObject({ desc: 'Invegen', aantal: 100, eenheid: 'm²', prijs: 4.5, totaal: 450 })
    expect(m.data.naam).toBe('Jeroen de Vries')
    expect(m.geldigheidDagen).toBe(21)
  })

  it('maakt het eindbedrag leidend en laat de totalen optellen', () => {
    // subtotaal = 845; totaal_incl = 1000 => totaalExcl = 1000/1.21
    const m = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot, totaal_incl: 1000, korting_pct: 10, versie: 3, aangemaakt_op: '2026-05-10T10:00:00Z' },
      baseData, leadId: 'abc1234',
    })!
    const totalExcl = 1000 / 1.21
    expect(m.totals.subtotal).toBeCloseTo(845, 5)
    expect(m.totals.total).toBeCloseTo(totalExcl, 5)
    expect(m.totals.btw).toBeCloseTo(1000 - totalExcl, 5)
    expect(m.totals.discount).toBe(10)
    // subtotal + korstmosToeslag - kortingBedrag === total (excl)
    expect(m.totals.subtotal + m.totals.korstmosToeslag - m.totals.kortingBedrag).toBeCloseTo(m.totals.total, 5)
    // het getoonde totaal incl. BTW reconstrueert exact het opgeslagen bedrag
    expect(m.totals.total + m.totals.btw).toBeCloseTo(1000, 5)
  })

  it('ondersteunt het legacy bare-array snapshot-formaat', () => {
    const m = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot.regels, totaal_incl: 900, korting_pct: null, versie: 1, aangemaakt_op: null },
      baseData, leadId: 'abc1234',
    })!
    expect(m.rules).toHaveLength(2)
    expect(m.totals.discount).toBe(0)
    expect(m.geldigheidDagen).toBe(14) // fallback, legacy array heeft geen geldigheidDagen
  })

  it('geeft null als er geen bruikbare snapshot is', () => {
    expect(buildSentOffertePdfModel({ offerte: { regels_snapshot: null, totaal_incl: 0, korting_pct: null, versie: 1, aangemaakt_op: null }, baseData, leadId: 'abc' })).toBeNull()
    expect(buildSentOffertePdfModel({ offerte: { regels_snapshot: { regels: [] }, totaal_incl: 0, korting_pct: null, versie: 1, aangemaakt_op: null }, baseData, leadId: 'abc' })).toBeNull()
  })

  it('gebruikt offertenummer van de rij als die er is, anders afgeleid van jaar+leadId', () => {
    const metNr = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot, totaal_incl: 1000, korting_pct: 0, versie: 3, aangemaakt_op: '2026-05-10T10:00:00Z', offertenummer: 'SS-2026-051' },
      baseData, leadId: 'abc1234',
    })!
    expect(metNr.offerteNummer).toBe('SS-2026-051')
    const afgeleid = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot, totaal_incl: 1000, korting_pct: 0, versie: 3, aangemaakt_op: '2026-05-10T10:00:00Z' },
      baseData, leadId: 'lead-9921',
    })!
    expect(afgeleid.offerteNummer).toBe('2026-9921')
  })
})
