import { describe, it, expect } from 'vitest'
import {
  berekenLeadCheck,
  lekVerdeling,
  verbeterpunten,
  parseLeadCheckInput,
  type LeadCheckInput,
} from './leadCheck'

const basis: LeadCheckInput = {
  aanvragenPerWeek: 10,
  speed: 'zelfde_dag',
  afterhours: 'nee',
  conversiePct: 30,
  orderwaarde: 500,
  shoppen: 'meestal',
}

describe('berekenLeadCheck', () => {
  it('rekent het spec-voorbeeld correct door', () => {
    const r = berekenLeadCheck(basis)
    // base 0.30 + bonus 0.12 = 0.42, shop_mult 1.0 → uplift 0.42
    expect(r.uplift).toBeCloseTo(0.42, 5)
    // score = round(0.42 / 0.60 * 100) = 70
    expect(r.score).toBe(70)
    // A_maand = 43.3; klanten = 12.99; gemist = 5.4558
    expect(r.gemisteKlantenMaand).toBeCloseTo(5.4558, 3)
    // omzet hoog = 2727.9; laag = 0.7 * hoog
    expect(r.omzetMaand.hoog).toBeCloseTo(2727.9, 1)
    expect(r.omzetMaand.laag).toBeCloseTo(1909.53, 1)
    expect(r.omzetJaar.hoog).toBeCloseTo(2727.9 * 12, 1)
  })

  it('geeft score 0 en lege bedragen bij supersnelle opvolging', () => {
    const r = berekenLeadCheck({ ...basis, speed: '5min', afterhours: 'altijd' })
    expect(r.score).toBe(0)
    expect(r.omzetMaand.hoog).toBe(0)
  })

  it('geeft alles 0 bij 0 aanvragen per week', () => {
    const r = berekenLeadCheck({ ...basis, aanvragenPerWeek: 0 })
    expect(r.gemisteKlantenMaand).toBe(0)
    expect(r.omzetMaand.hoog).toBe(0)
    // score blijft het gedrag van de opvolging tonen (uplift onafhankelijk van volume)
    expect(r.score).toBe(70)
  })

  it('capt de uplift op 0.60', () => {
    // volgende_dag 0.45 + nee 0.12 = 0.57 → onder cap; score = round(0.57/0.60*100) = 95
    const r = berekenLeadCheck({ ...basis, speed: 'volgende_dag', afterhours: 'nee' })
    expect(r.uplift).toBeLessThanOrEqual(0.6)
    expect(r.score).toBe(95)
  })

  it('dempt de uplift als klanten zelden shoppen', () => {
    const r = berekenLeadCheck({ ...basis, shoppen: 'zelden' })
    expect(r.uplift).toBeCloseTo(0.42 * 0.35, 5)
  })
})

describe('verbeterpunten', () => {
  it('geeft maximaal 3 punten en matcht de condities', () => {
    const punten = verbeterpunten(basis)
    expect(punten.length).toBeLessThanOrEqual(3)
    expect(punten[0]).toContain('Sneller reageren')
  })

  it('geeft geen punten bij perfect profiel', () => {
    const punten = verbeterpunten({ ...basis, speed: '5min', afterhours: 'altijd', conversiePct: 40, shoppen: 'zelden' })
    expect(punten).toEqual([])
  })
})

describe('lekVerdeling', () => {
  it('verdeelt het maand-lek naar rato van de factoren', () => {
    const r = berekenLeadCheck(basis)
    const v = lekVerdeling(basis)
    // basis: wReactie 0.30, wAvond 0.12 → 30/42 en 12/42 van het hoog-band-bedrag
    expect(v.reactieMaand).toBeCloseTo(r.omzetMaand.hoog * (0.3 / 0.42), 5)
    expect(v.reactieMaand + v.avondMaand).toBeCloseTo(r.omzetMaand.hoog, 5)
    expect(v.shoppenEffect).toBe('volledig')
  })

  it('geeft nul-verdeling bij perfecte opvolging', () => {
    const v = lekVerdeling({ ...basis, speed: '5min', afterhours: 'altijd', shoppen: 'zelden' })
    expect(v.reactieMaand).toBe(0)
    expect(v.avondMaand).toBe(0)
    expect(v.shoppenEffect).toBe('sterk_gedempt')
  })
})

describe('parseLeadCheckInput', () => {
  it('accepteert geldige invoer en klemt grenzen', () => {
    const parsed = parseLeadCheckInput({ ...basis, aanvragenPerWeek: 9999, orderwaarde: -5 })
    expect(parsed).not.toBeNull()
    expect(parsed!.aanvragenPerWeek).toBe(500)
    expect(parsed!.orderwaarde).toBe(0)
  })

  it('weigert ongeldige keuzewaarden', () => {
    expect(parseLeadCheckInput({ ...basis, speed: 'morgen' })).toBeNull()
    expect(parseLeadCheckInput(null)).toBeNull()
  })
})
