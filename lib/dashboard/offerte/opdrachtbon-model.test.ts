import { describe, it, expect } from 'vitest'
import { buildOpdrachtbonModel } from './opdrachtbon-model'

const base = {
  leadId: 'wa-31612345678',
  klantNaam: 'Jeroen de Vries',
  bedrijf: null,
  straat: 'Lindenlaan',
  huisnummer: '14',
  postcode: '2611 AB',
  plaats: 'Delft',
  telefoon: '06 24 96 52 70',
  afspraakDatum: null,
  afspraakStarttijd: null,
  sentOfferteNummer: null,
  sentRules: null,
  hoofdcategorie: null,
  subDiensten: null,
  m2: null,
  voegzandType: null,
  zandKleur: null,
  groeneAanslag: null,
}

describe('buildOpdrachtbonModel', () => {
  it('gebruikt de verstuurde offerteregels (zonder prijs) en het OB-bonnummer', () => {
    const m = buildOpdrachtbonModel({
      ...base,
      sentOfferteNummer: '2026-0042',
      sentRules: [
        { desc: 'Reiniging oprit', aantal: 145, eenheid: 'm²' },
        { desc: 'Invegen', aantal: 145, eenheid: 'm²' },
        { desc: 'Voorrijkosten', aantal: 0, eenheid: '' },
      ],
    })
    expect(m.bonnummer).toBe('OB-2026-0042')
    expect(m.werkzaamheden).toEqual([
      { omschrijving: 'Reiniging oprit', aantal: '145 m²' },
      { omschrijving: 'Invegen', aantal: '145 m²' },
      { omschrijving: 'Voorrijkosten', aantal: '' },
    ])
    // geen enkel prijsveld lekt door
    expect(JSON.stringify(m)).not.toMatch(/prijs|totaal|stukprijs/i)
  })

  it('valt terug op de lead-werkvelden als er geen offerte is, met OB-bonnummer uit de lead-id', () => {
    const m = buildOpdrachtbonModel({
      ...base,
      hoofdcategorie: 'oprit_terras_terrein',
      subDiensten: ['invegen', 'beschermlaag'],
      m2: 145,
    })
    expect(m.bonnummer).toBe('OB-345678')
    expect(m.werkzaamheden).toEqual([
      { omschrijving: 'Oprit / terras / terrein', aantal: '145 m²' },
      { omschrijving: 'Voegen invegen', aantal: '' },
      { omschrijving: 'Nieuwe beschermlaag', aantal: '' },
    ])
  })

  it('geeft een lege werkzaamheden-lijst als er niets bekend is', () => {
    const m = buildOpdrachtbonModel(base)
    expect(m.werkzaamheden).toEqual([])
  })

  it('bouwt het werkadres uit de ingevulde delen', () => {
    expect(buildOpdrachtbonModel(base).werkadres).toEqual(['Lindenlaan 14', '2611 AB Delft'])
    expect(
      buildOpdrachtbonModel({ ...base, huisnummer: null, postcode: null }).werkadres,
    ).toEqual(['Lindenlaan', 'Delft'])
  })

  it('formatteert de afspraak in nl-NL, of null zonder datum', () => {
    expect(buildOpdrachtbonModel(base).afspraak).toBeNull()
    const m = buildOpdrachtbonModel({
      ...base,
      afspraakDatum: '2026-07-01',
      afspraakStarttijd: '09:00:00',
    })
    expect(m.afspraak).toBe('woensdag 1 juli 2026, 09:00')
    const zonderTijd = buildOpdrachtbonModel({ ...base, afspraakDatum: '2026-07-01' })
    expect(zonderTijd.afspraak).toBe('woensdag 1 juli 2026')
  })

  it('zet voegzand en groene aanslag als detailregels, alleen indien aanwezig', () => {
    expect(buildOpdrachtbonModel(base).detailregels).toEqual([])
    const m = buildOpdrachtbonModel({
      ...base,
      voegzandType: 'onkruidwerend',
      zandKleur: 'antraciet',
      groeneAanslag: 'ja',
    })
    expect(m.detailregels).toEqual([
      { label: 'Voegzand', waarde: 'Onkruidwerend · Antraciet' },
      { label: 'Groene aanslag', waarde: 'Ja' },
    ])
  })
})
