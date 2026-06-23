import { describe, it, expect } from 'vitest'
import { buildSentOffertePdfModel, HEROPGEMAAKT_NOTE } from './sent-offerte-pdf-model'
import { DEFAULTS } from '@/lib/dashboard/manual-offerte-types'
import { FALLBACK_PRICING } from '@/lib/dashboard/pricing-types'

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
  it('mapt snapshot-regels naar RegelComputed, gesorteerd op volgorde (niet heropgemaakt)', () => {
    const m = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot, totaal_incl: 1000, korting_pct: 10, versie: 3, aangemaakt_op: '2026-05-10T10:00:00Z' },
      baseData, leadId: 'abc1234', pricing: FALLBACK_PRICING,
    })!
    expect(m.reconstructed).toBe(false)
    expect(m.rules.map((r) => r.desc)).toEqual(['Invegen', 'Reiniging'])
    expect(m.rules[0]).toMatchObject({ desc: 'Invegen', aantal: 100, eenheid: 'm²', prijs: 4.5, totaal: 450 })
    expect(m.data.naam).toBe('Jeroen de Vries')
    expect(m.geldigheidDagen).toBe(21)
  })

  it('maakt het eindbedrag leidend en laat de totalen optellen', () => {
    const m = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot, totaal_incl: 1000, korting_pct: 10, versie: 3, aangemaakt_op: '2026-05-10T10:00:00Z' },
      baseData, leadId: 'abc1234', pricing: FALLBACK_PRICING,
    })!
    const totalExcl = 1000 / 1.21
    expect(m.totals.subtotal).toBeCloseTo(845, 5)
    expect(m.totals.total).toBeCloseTo(totalExcl, 5)
    expect(m.totals.btw).toBeCloseTo(1000 - totalExcl, 5)
    expect(m.totals.discount).toBe(10)
    expect(m.totals.subtotal + m.totals.korstmosToeslag - m.totals.kortingBedrag).toBeCloseTo(m.totals.total, 5)
    expect(m.totals.total + m.totals.btw).toBeCloseTo(1000, 5)
  })

  it('ondersteunt het legacy bare-array snapshot-formaat', () => {
    const m = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot.regels, totaal_incl: 900, korting_pct: null, versie: 1, aangemaakt_op: null },
      baseData, leadId: 'abc1234', pricing: FALLBACK_PRICING,
    })!
    expect(m.reconstructed).toBe(false)
    expect(m.rules).toHaveLength(2)
    expect(m.totals.discount).toBe(0)
    expect(m.geldigheidDagen).toBe(14)
  })

  it('maakt een oude offerte ZONDER snapshot heropgemaakt aan uit lead + prijslijst', () => {
    const oudeLead = {
      ...DEFAULTS,
      naam: 'Fahim Razavy',
      m2: 200,
      hoofdcategorie: ['oprit_terras_terrein'] as ('oprit_terras_terrein')[],
      sub: ['invegen'] as ('invegen')[],
      reinigen_actief: true,
    }
    const m = buildSentOffertePdfModel({
      offerte: { regels_snapshot: null, totaal_incl: 1448.64, korting_pct: 15, versie: 1, aangemaakt_op: '2026-06-21T08:57:23Z' },
      baseData: oudeLead, leadId: '1782032055615-92210', pricing: FALLBACK_PRICING,
    })!
    expect(m.reconstructed).toBe(true)
    expect(m.rules.length).toBeGreaterThan(0)
    // eindbedrag blijft het echte verzonden bedrag
    expect(m.totals.total + m.totals.btw).toBeCloseTo(1448.64, 4)
    expect(m.totals.discount).toBe(15)
    // waarschuwingsnotitie staat vooraan in de PDF-toelichting
    expect(m.data.notitie.startsWith(HEROPGEMAAKT_NOTE)).toBe(true)
  })

  it('geeft null als er geen snapshot is EN heropmaken geen regels oplevert', () => {
    const leegLead = {
      ...DEFAULTS,
      reinigen_actief: false,
      sub: [] as never[],
      hoofdcategorie: [] as never[],
      m2: 0,
      afstand_km: 0,
      voegzand_normaal_actief: false,
      voegzand_onkruidwerend_actief: false,
      planten_afschermen_actief: false,
      extra_arbeid_minuten: 0,
      extra_arbeid_personen: 0,
      groene_aanslag: 'nee' as const,
      korstmos: 'nee' as const,
    }
    expect(
      buildSentOffertePdfModel({
        offerte: { regels_snapshot: null, totaal_incl: 0, korting_pct: null, versie: 1, aangemaakt_op: null },
        baseData: leegLead, leadId: 'abc', pricing: FALLBACK_PRICING,
      }),
    ).toBeNull()
  })

  it('gebruikt offertenummer van de rij als die er is, anders afgeleid van jaar+leadId', () => {
    const metNr = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot, totaal_incl: 1000, korting_pct: 0, versie: 3, aangemaakt_op: '2026-05-10T10:00:00Z', offertenummer: 'SS-2026-051' },
      baseData, leadId: 'abc1234', pricing: FALLBACK_PRICING,
    })!
    expect(metNr.offerteNummer).toBe('SS-2026-051')
    const afgeleid = buildSentOffertePdfModel({
      offerte: { regels_snapshot: objSnapshot, totaal_incl: 1000, korting_pct: 0, versie: 3, aangemaakt_op: '2026-05-10T10:00:00Z' },
      baseData, leadId: 'lead-9921', pricing: FALLBACK_PRICING,
    })!
    expect(afgeleid.offerteNummer).toBe('2026-9921')
  })
})
