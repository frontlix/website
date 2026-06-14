import { describe, it, expect } from 'vitest'
import { renderOffertePDFHtml, type OffertePDFData } from './pdf-template'

// Regressietest: de offerte-PDF toont de keurmerken (Kwaliteitsvakman in de
// header, BesteVakmanInDeBuurt.nl in de footer) zodra de assets aanwezig zijn.

function baseData(over: Partial<OffertePDFData>): OffertePDFData {
  return {
    klantNaam: 'Test Klant',
    klantBedrijf: null,
    klantStraat: 'Straat',
    klantHuisnummer: '1',
    klantPostcode: '1234 AB',
    klantPlaats: 'Plaats',
    klantEmail: '',
    klantTelefoon: '',
    factuurStraat: null,
    factuurHuisnummer: null,
    factuurPostcode: null,
    factuurPlaats: null,
    offertenummer: 'SS-2026-001',
    vandaag: new Date('2026-06-14'),
    geldigheidDagen: 21,
    betaaltermijnDagen: 14,
    hoofdcategorieLabels: ['Oprit'],
    subDienstenLabels: ['Invegen'],
    m2: 120,
    regels: [{ omschrijving: 'Reiniging oppervlak', aantal: 120, eenheid: 'm²', stukprijs: 3.95, totaal: 474 }],
    subtotaalExcl: 474,
    kortingPercentage: 0,
    kortingBedrag: 0,
    kortingOmschrijving: null,
    totaalExcl: 474,
    btwPercentage: 21,
    btwBedrag: 99.54,
    totaalIncl: 573.54,
    toelichting: null,
    logoBase64: null,
    badgeBase64: 'data:image/png;base64,AAAA',
    keurmerkBase64: 'data:image/png;base64,BBBB',
    besteVakmanBase64: 'data:image/png;base64,CCCC',
    bedrijf: {
      bedrijfsnaam: 'Schoon Straatje',
      adres: null,
      postcode: null,
      plaats: null,
      offerte_geldigheid_dagen: 21,
      offerte_btw_tarief: 21,
      offerte_betaaltermijn_dagen: 14,
    },
    ...over,
  }
}

describe('offerte-PDF keurmerken', () => {
  it('toont Keurmerk Kwaliteitsvakman + BesteVakmanInDeBuurt.nl als de assets er zijn', () => {
    const html = renderOffertePDFHtml(baseData({}))
    expect(html).toContain('alt="Keurmerk Kwaliteitsvakman"')
    expect(html).toContain('data:image/png;base64,BBBB')
    expect(html).toContain('class="footer-badge"')
    expect(html).toContain('alt="Geverifieerd door BesteVakmanInDeBuurt.nl"')
    expect(html).toContain('data:image/png;base64,CCCC')
  })

  it('rendert netjes zonder keurmerken (assets ontbreken → null)', () => {
    const html = renderOffertePDFHtml(baseData({ keurmerkBase64: null, besteVakmanBase64: null }))
    // De CSS-klassen staan altijd in de <style>; we checken dat de IMG-tags
    // (alt-teksten) niet gerenderd zijn als de assets ontbreken.
    expect(html).not.toContain('alt="Keurmerk Kwaliteitsvakman"')
    expect(html).not.toContain('alt="Geverifieerd door BesteVakmanInDeBuurt.nl"')
  })
})
