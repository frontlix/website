import { describe, it, expect } from 'vitest'
import { computeRules } from './manual-offerte-rules'
import { DEFAULTS, type ManualOfferteData } from './manual-offerte-types'

function makeData(over: Partial<ManualOfferteData>): ManualOfferteData {
  return { ...DEFAULTS, ...over }
}

// Regressietests voor twee bugs die de app-offerte deden afwijken van de
// gemailde offerte: (1) een Invegen-opmerking belandde onder de Voegzand-regel,
// (2) de afdekfolie-default week af van de bot (2 i.p.v. 1 rol).

describe('opmerking-plaatsing', () => {
  it('een Invegen-opmerking komt onder de Invegen-regel, NIET de losse Voegzand-regel', () => {
    const data = makeData({
      sub: ['invegen'],
      m2: 50,
      voegzand_normaal_actief: true,
      voegzand_normaal_m2: 50,
      voegzand_normaal_zakken: 4,
      regel_opmerkingen: {
        // De editor slaat de Invegen-checkbox-opmerking op onder deze sleutel.
        voegzand_normaal: { tekst: 'goed dat je dit doet', zichtbaar: true },
      },
    })
    const rules = computeRules(data)
    const invegen = rules.find((r) => r.desc === 'Invegen normaal voegzand excl voegzand')
    const voegzand = rules.find((r) => r.desc.startsWith('Voegzand normaal'))

    expect(invegen).toBeTruthy()
    expect(voegzand).toBeTruthy()
    // Onder de Invegen-arbeidsregel (de EERSTE regel van het onderdeel).
    expect(invegen?.opmerking).toBe('goed dat je dit doet')
    // En NIET onder de losse voegzand-productregel die erna komt.
    expect(voegzand?.opmerking).toBeUndefined()
  })
})

describe('afdekfolie planten', () => {
  it('default is 1 rol (gelijk aan de bot), niet 2', () => {
    const data = makeData({
      sub: ['invegen'],
      m2: 50,
      planten_afschermen_actief: true,
      // planten_afschermen_rollen komt uit DEFAULTS en moet 1 zijn.
    })
    const rules = computeRules(data)
    const folie = rules.find((r) => r.desc === 'Afdekfolie planten')
    expect(folie).toBeTruthy()
    expect(folie?.aantal).toBe(1)
    expect(folie?.totaal).toBe(folie!.prijs) // 1 × stukprijs
  })
})
