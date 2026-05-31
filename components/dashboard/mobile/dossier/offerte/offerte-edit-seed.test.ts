import { describe, it, expect } from 'vitest'
import { matchCatalogKey, seedOfferteState, type OfferteSeedInput, type SeedRegel } from './offerte-edit-seed'

// Basis-input zonder regels; tests overschrijven wat ze nodig hebben.
function input(over: Partial<OfferteSeedInput> = {}): OfferteSeedInput {
  return {
    klant: { naam: 'Jeroen de Vries', bedrijf: '', straat: 'Kerkstraat 8', pcplaats: '3500 AB Bilthoven' },
    m2: 80,
    voornaam: 'Jeroen',
    korstmos: false,
    kortingPct: 0,
    kortingNote: '',
    seedRegels: [],
    ...over,
  }
}

function regel(over: Partial<SeedRegel>): SeedRegel {
  return { omschrijving: '', aantal: null, eenheid: null, stukprijs: 0, ...over }
}

describe('matchCatalogKey', () => {
  it('reiniging', () => {
    expect(matchCatalogKey('Reiniging oprit en terras')).toBe('reiniging')
  })
  it('invegen normaal vs onkruidwerend', () => {
    expect(matchCatalogKey('Invegen normaal voegzand (arbeid)')).toBe('invegen_normaal')
    expect(matchCatalogKey('Invegen onkruidwerend (arbeid)')).toBe('invegen_onkruid')
    expect(matchCatalogKey('Voegen invegen')).toBe('invegen_normaal')
  })
  it('voegzand normaal vs onkruidwerend', () => {
    expect(matchCatalogKey('Voegzand normaal (15 kg/zak)')).toBe('voegzand_normaal')
    expect(matchCatalogKey('Voegzand onkruidwerend (15 kg/zak)')).toBe('voegzand_onkruid')
  })
  it('beschermlaag', () => {
    expect(matchCatalogKey('Beschermlaag aanbrengen')).toBe('beschermlaag')
  })
  it('preventieve onkruidbeheersing', () => {
    expect(matchCatalogKey('Preventieve onkruidbeheersing')).toBe('preventieve_onkruid')
  })
  it('onderhoud op frequentie', () => {
    expect(matchCatalogKey('Onderhoud (elke 4 weken)')).toBe('onderhoud_4w')
    expect(matchCatalogKey('Onderhoud (elke 8 weken)')).toBe('onderhoud_8w')
    expect(matchCatalogKey('Onderhoud (elke 12 weken)')).toBe('onderhoud_12w')
    expect(matchCatalogKey('Onderhoud (elke 16 weken)')).toBe('onderhoud_16w')
  })
  it('planten', () => {
    expect(matchCatalogKey('Planten afschermen (afdekfolie)')).toBe('planten')
  })
  it('reiskosten', () => {
    expect(matchCatalogKey('Reiskosten')).toBe('reiskosten')
  })
  it('onbekend → custom', () => {
    expect(matchCatalogKey('Iets heel anders')).toBe('custom')
    expect(matchCatalogKey('')).toBe('custom')
  })
})

describe('seedOfferteState — lege seed', () => {
  it('geen prijsregels → lege lines', () => {
    const out = seedOfferteState(input({ seedRegels: [] }))
    expect(out.lines).toEqual([])
  })
  it('defaults: btw 21, dagen 14', () => {
    const out = seedOfferteState(input())
    expect(out.btwKey).toBe('21')
    expect(out.dagen).toBe(14)
  })
  it('bericht bevat de voornaam en Schoon Straatje-afsluiting', () => {
    const out = seedOfferteState(input({ voornaam: 'Marieke' }))
    expect(out.bericht).toContain('Beste Marieke,')
    expect(out.bericht).toContain('Schoon Straatje')
  })
})

describe('seedOfferteState — prijsregels → lines', () => {
  it('mapt een catalogus-regel: label/unit/area uit catalogus, rate = stukprijs', () => {
    const out = seedOfferteState(
      input({
        seedRegels: [regel({ omschrijving: 'Reiniging oprit', aantal: 80, eenheid: 'm²', stukprijs: 3.5 })],
      }),
    )
    expect(out.lines).toHaveLength(1)
    const l = out.lines[0]
    expect(l.id).toBe('l0') // deterministische id
    expect(l.key).toBe('reiniging')
    expect(l.label).toBe('Reiniging oppervlak') // catalogus-label, niet de ruwe omschrijving
    expect(l.unit).toBe('m²')
    expect(l.area).toBe(true)
    expect(l.m2).toBe(80) // area => aantal in m2
    expect(l.qty).toBe(0)
    expect(l.rate).toBe(3.5) // werkelijk geoffreerde prijs
    expect(l.custom).toBe(false)
    expect(l.on).toBe(true)
  })

  it('niet-area catalogus-regel zet aantal in qty', () => {
    const out = seedOfferteState(
      input({
        seedRegels: [regel({ omschrijving: 'Planten afschermen', aantal: 2, eenheid: 'rol', stukprijs: 8.5 })],
      }),
    )
    const l = out.lines[0]
    expect(l.key).toBe('planten')
    expect(l.area).toBe(false)
    expect(l.qty).toBe(2)
    expect(l.m2).toBe(0)
  })

  it('geen match → custom: label = omschrijving, eenheid uit regel', () => {
    const out = seedOfferteState(
      input({
        seedRegels: [regel({ omschrijving: 'Extra arbeid stoep', aantal: 3, eenheid: 'uur', stukprijs: 45 })],
      }),
    )
    const l = out.lines[0]
    expect(l.custom).toBe(true)
    expect(l.key).toBe('custom')
    expect(l.label).toBe('Extra arbeid stoep')
    expect(l.unit).toBe('uur')
    expect(l.area).toBe(false)
    expect(l.qty).toBe(3)
    expect(l.rate).toBe(45)
  })

  it('custom met eenheid m² wordt area-regel', () => {
    const out = seedOfferteState(
      input({ seedRegels: [regel({ omschrijving: 'Speciaal werk', aantal: 12, eenheid: 'm²', stukprijs: 5 })] }),
    )
    const l = out.lines[0]
    expect(l.custom).toBe(true)
    expect(l.area).toBe(true)
    expect(l.m2).toBe(12)
    expect(l.qty).toBe(0)
  })

  it('null aantal → 0; ids lopen door als l0, l1, …', () => {
    const out = seedOfferteState(
      input({
        seedRegels: [
          regel({ omschrijving: 'Reiniging', aantal: null, eenheid: 'm²', stukprijs: 3.95 }),
          regel({ omschrijving: 'Beschermlaag', aantal: 80, eenheid: 'm²', stukprijs: 1.6 }),
        ],
      }),
    )
    expect(out.lines.map((l) => l.id)).toEqual(['l0', 'l1'])
    expect(out.lines[0].m2).toBe(0) // null → 0
  })
})

describe('seedOfferteState — korstmos-toeslag-regel', () => {
  it('auto-on bij verse offerte (korstmos && geen regels)', () => {
    const out = seedOfferteState(input({ korstmos: true, seedRegels: [] }))
    expect(out.toeslagen).toHaveLength(1)
    expect(out.toeslagen[0].key).toBe('korstmos')
    expect(out.toeslagen[0].mode).toBe('pct')
    expect(out.toeslagen[0].value).toBe(10)
    expect(out.toeslagen[0].on).toBe(true)
  })
  it('uit bij bestaande prijsregels (mogelijke dubbeltelling)', () => {
    const out = seedOfferteState(
      input({ korstmos: true, seedRegels: [regel({ omschrijving: 'Reiniging', aantal: 80, stukprijs: 3.95 })] }),
    )
    expect(out.toeslagen[0].on).toBe(false)
  })
  it('uit wanneer er geen korstmos is', () => {
    const out = seedOfferteState(input({ korstmos: false, seedRegels: [] }))
    expect(out.toeslagen[0].on).toBe(false)
  })
})

describe('seedOfferteState — korting-prefill', () => {
  it('neemt kortingPct en note uit input over', () => {
    const out = seedOfferteState(input({ kortingPct: 15, kortingNote: 'Vaste klant' }))
    expect(out.kortingPct).toBe(15)
    expect(out.kortingNote).toBe('Vaste klant')
  })
  it('default 0 / lege note', () => {
    const out = seedOfferteState(input())
    expect(out.kortingPct).toBe(0)
    expect(out.kortingNote).toBe('')
  })
})
