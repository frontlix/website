import { describe, it, expect } from 'vitest'
import { toOffertePdfData } from './offerte-pdf-data'
import { DEFAULTS } from '@/lib/dashboard/manual-offerte-types'

const data = {
  ...DEFAULTS,
  naam: 'Jeroen de Vries',
  bedrijf: 'De Vries Tuinen',
  straat: 'Lindenlaan',
  huisnummer: '14',
  postcode: '2611 AB',
  plaats: 'Delft',
  email: 'j@x.nl',
  telefoon: '0612345678',
  m2: 145,
  sub: ['invegen'] as ('invegen')[],
  factuur_zelfde: true,
  korting_omschrijving: 'Buurtkorting',
}
const rules = [
  { desc: 'Reiniging', aantal: 145, eenheid: 'm²', prijs: 3.95, totaal: 572.75 },
  { desc: 'Invegen', aantal: 145, eenheid: 'm²', prijs: 4.5, totaal: 652.5 },
]
const totals = { subtotal: 1225.25, korstmosToeslag: 0, kortingBedrag: 25.25, discount: 2, total: 1200, btw: 252 }

describe('toOffertePdfData', () => {
  it('bouwt het OffertePdfData-contract uit model + meta', () => {
    const d = toOffertePdfData({
      data, rules, totals,
      nr: '2026-0014', datum: '10-05-2026', geldigTot: '31-05-2026',
      effectiveKortingPct: 2, toelichting: 'Bedankt!',
    })
    expect(d.nr).toBe('2026-0014')
    expect(d.dienst).toBe('Reinigen en invegen')
    expect(d.klant).toMatchObject({ naam: 'Jeroen de Vries', bedrijf: 'De Vries Tuinen', straat: 'Lindenlaan 14', pcplaats: '2611 AB Delft' })
    expect(d.regels[0]).toMatchObject({ omschrijving: 'Reiniging', aantalLabel: '145 m²', stukprijs: 3.95, totaal: 572.75 })
    expect(d.subtotaal).toBe(1225.25)
    expect(d.kortingPct).toBe(2)
    expect(d.kortingBedrag).toBe(25.25)
    expect(d.totaalExcl).toBe(1200)
    expect(d.btwBedrag).toBe(252)
    expect(d.totaalIncl).toBe(1452)
    expect(d.toelichting).toBe('Bedankt!')
  })

  it('toont een korstmos-toeslag-regel als die er is', () => {
    const d = toOffertePdfData({
      data, rules,
      totals: { ...totals, korstmosToeslag: 120 },
      nr: 'x', datum: 'x', geldigTot: 'x', effectiveKortingPct: 0,
    })
    expect(d.toeslagen).toEqual([{ label: 'Korstmos-toeslag (10%)', bedrag: 120 }])
  })
})
