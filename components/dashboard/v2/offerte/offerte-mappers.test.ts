import { describe, it, expect } from 'vitest'
import { DEFAULTS, type ManualOfferteData } from '@/lib/dashboard/manual-offerte-types'
import { mapManualOfferteToWizard, buildManualOfferteFromWizard } from './offerte-mappers'

describe('mapManualOfferteToWizard', () => {
  it('herstelt inhoudelijke velden uit een ManualOfferteData', () => {
    const data: ManualOfferteData = {
      ...DEFAULTS,
      naam: 'Familie Bakker',
      bedrijf: '',
      telefoon: '0612345678',
      email: 'b@x.nl',
      straat: 'Dorpsstraat',
      huisnummer: '1',
      postcode: '4330',
      plaats: 'Middelburg',
      m2: 120,
      sub: ['invegen', 'beschermlaag'],
      reinigen_actief: true,
      voegzand_normaal_actief: true,
      voegzand_normaal_m2: 120,
      voegzand_normaal_zakken: 24,
      voegzand_normaal_prijs: 2.9,
      kleur_naturel: true,
      kleur_antraciet: false,
      groene_aanslag: 'ja',
      korstmos: 'nee',
      afstand_km: 12,
      reiniging_per_m2_override: 1.25,
      korting_percentage: 0,
      korting_bedrag: 50,
      korting_omschrijving: 'actie',
      geldigheid_dagen: 30,
      notitie: 'graag snel',
      kanaal: 'mail',
    }

    const s = mapManualOfferteToWizard(data, 0.5)

    expect(s.stap).toBe(1)
    expect(s.klant?.naam).toBe('Familie Bakker')
    expect(s.klant?.tel).toBe('0612345678')
    expect(s.m2).toBe(120)
    expect(s.diensten['Reinigen']).toBe(true)
    expect(s.diensten['Invegen']).toBe(true)
    expect(s.diensten['Beschermlaag']).toBe(true)
    expect(s.voegzandM2.normaal).toBe(120)
    expect(s.kleur).toBe('Naturel')
    expect(s.groeneAanslag).toBe(true)
    expect(s.afstandKm).toBe(12)
    expect(s.prijsOverrides?.['reiniging_per_m2']).toBe('1,25')
    expect(s.kortingType).toBe('euro')
    expect(s.kortingEuro).toBe('50')
    expect(s.kortingReden).toBe('actie')
    expect(s.geldigDagen).toBe(30)
    expect(s.bericht).toBe('graag snel')
    expect(s.kanaal).toBe('email')
  })

  it('zet kleur "Allebei" als beide kleuren aan staan', () => {
    const data = { ...DEFAULTS, kleur_naturel: true, kleur_antraciet: true }
    expect(mapManualOfferteToWizard(data, 0.5).kleur).toBe('Allebei')
  })

  it('herstelt extra arbeid als één vrije regel via perMin', () => {
    const data = { ...DEFAULTS, extra_arbeid_minuten: 60, extra_arbeid_personen: 1, extra_arbeid_omschrijving: 'Meerwerk' }
    const s = mapManualOfferteToWizard(data, 0.5)
    expect(s.vrij).toHaveLength(1)
    expect(s.vrij[0].naam).toBe('Meerwerk')
    expect(s.vrij[0].bedrag).toBe('30') // 60 min * 0,5 = 30
  })
})

describe('buildManualOfferteFromWizard', () => {
  const base = {
    klant: { naam: 'A', bedrijf: '', straat: '', nr: '', postcode: '', plaats: '', tel: '', email: '', sub: '', initials: '', bestaand: false },
    factuurZelfde: true,
    factuur: { straat: '', nr: '', postcode: '', plaats: '' },
    m2: 100, bm2: 0, om2: 0,
    qty: { invegen: 0, rollen: 0 },
    rolPrijs: '8,5',
    voegzandM2: { normaal: 0, onkruidwerend: 0 },
    voegzandZakken: { normaal: 0, onkruidwerend: 0 },
    voegzandDekking: { normaal: 5, onkruidwerend: 5 },
    zandPrijzen: { normaal: '2,9', onkruidwerend: '20,9' },
    prijsOverrides: {},
    diensten: { Reinigen: true, Invegen: false },
    groeneAanslag: false,
    kleur: 'Naturel' as const,
    korstmosConditie: false,
    kortingType: 'procent' as const,
    kortingPct: '10',
    kortingEuro: '',
    kortingReden: '',
    geldigheidDagen: 0,
    bericht: '',
    kanaal: 'email' as const,
    afstandKm: null,
  }

  it('zet vrije regels om naar extra_arbeid via perMin', () => {
    const out = buildManualOfferteFromWizard({
      ...base,
      vrij: [{ id: 1, naam: 'Paaltjes', bedrag: '30' }],
      perMin: 0.5,
    })
    expect(out.extra_arbeid_minuten).toBe(60) // 30 / 0,5
    expect(out.extra_arbeid_personen).toBe(1)
    expect(out.extra_arbeid_omschrijving).toBe('Paaltjes')
    expect(out.korting_percentage).toBe(10)
  })

  it('geen vrije regels ⇒ geen extra arbeid', () => {
    const out = buildManualOfferteFromWizard({ ...base, vrij: [], perMin: 0.5 })
    expect(out.extra_arbeid_minuten).toBe(0)
    expect(out.extra_arbeid_personen).toBe(0)
  })
})
