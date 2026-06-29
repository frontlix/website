import { describe, it, expect } from 'vitest'
import { berekenKorstmosToeslag } from './manual-offerte-rules'
import { extraArbeidPrijsKolom } from './offerte-form-mapping'
import type { ManualOfferteData, RegelComputed } from './manual-offerte-types'

// Deze tests borgen dat dashboard en bot dezelfde prijs uitrekenen op de twee
// punten waar ze eerder uiteenliepen (zie go-live-audit):
//  1. Korstmos-toeslag-grondslag: alleen reiniging/onkruid/onderhoud, niet alle
//     diensten. Eén gedeelde helper, gebruikt door computeTotals én
//     saveOfferteForm, zodat ze niet meer kunnen divergeren.
//  2. Extra-arbeid-override: de editor bewerkt prijs-per-minuut, de bot leest
//     een plat totaal. De helper rekent om zodat de klant het juiste bedrag krijgt.

function regel(desc: string, totaal: number, eenheid = 'm²'): RegelComputed {
  return { desc, aantal: 1, eenheid, prijs: totaal, totaal }
}

describe('berekenKorstmosToeslag', () => {
  it('rekent 10% ALLEEN over reiniging/onkruid/onderhoud, niet over zand/folie/arbeid', () => {
    const rules = [
      regel('Reiniging oppervlak', 395),
      regel('Invegen normaal voegzand excl voegzand', 90),
      regel('Voegzand normaal (15 kg/zak)', 50, 'zakken'),
      regel('Nieuwe beschermlaag incl product', 160),
    ]
    const data = { korstmos: 'ja' } as ManualOfferteData
    // Alleen de €395 reiniging telt mee → 39,50. (Niet 10% van 695 = 69,50.)
    expect(berekenKorstmosToeslag(rules, data)).toBe(39.5)
  })

  it('telt onkruid- en onderhoud-regels wel mee', () => {
    const rules = [
      regel('Reiniging oppervlak', 100),
      regel('Onkruidbeheersing zakelijk', 200),
      regel('Onderhoudsbeheersing (elke 8 weken)', 300),
    ]
    const data = { korstmos: 'ja' } as ManualOfferteData
    expect(berekenKorstmosToeslag(rules, data)).toBe(60) // 10% van 600
  })

  it('geeft 0 als korstmos niet is aangevinkt', () => {
    const rules = [regel('Reiniging oppervlak', 395)]
    expect(berekenKorstmosToeslag(rules, { korstmos: 'nee' } as ManualOfferteData)).toBe(0)
  })
})

describe('extraArbeidPrijsKolom (bot leest plat totaal, editor bewerkt per minuut)', () => {
  it('rekent per-minuut-override om naar het regeltotaal', () => {
    const data = {
      extra_arbeid_per_min_override: 1.5,
      extra_arbeid_minuten: 60,
      extra_arbeid_personen: 2,
    } as ManualOfferteData
    // 60 × 2 × 1,50 = 180,00 (niet 1,50 in de kolom)
    expect(extraArbeidPrijsKolom(data)).toBe(180)
  })

  it('geeft null zonder override (bot rekent dan zelf min×pers×tarief)', () => {
    const data = {
      extra_arbeid_minuten: 60,
      extra_arbeid_personen: 2,
    } as ManualOfferteData
    expect(extraArbeidPrijsKolom(data)).toBeNull()
  })

  it('geeft null bij ontbrekende minuten of personen', () => {
    expect(
      extraArbeidPrijsKolom({
        extra_arbeid_per_min_override: 1.5,
        extra_arbeid_minuten: 0,
        extra_arbeid_personen: 2,
      } as ManualOfferteData),
    ).toBeNull()
  })
})
