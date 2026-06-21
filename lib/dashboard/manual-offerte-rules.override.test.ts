import { describe, it, expect } from 'vitest'
import { computeRules, computeTotals } from './manual-offerte-rules'
import { DEFAULTS, type ManualOfferteData } from './manual-offerte-types'
import { FALLBACK_PRICING } from './pricing-types'
import { buildOffertePDFData, type TenantBedrijf } from './offerte/pdf-template'

// Per-offerte EENHEIDSPRIJS-overrides: de owner past de stukprijs van een
// regel aan voor déze offerte (data.<override>), waarna computeRules dit
// toepast als `override ?? pricing.*`. Deze suite bewijst dat de override
// 1:1 doorwerkt in (1) de rules-engine, (2) computeTotals, en (3) de PDF,
// dat undefined terugvalt op de prijslijst, en dat een override van 0
// daadwerkelijk 0 oplevert (geen terugval).

// ── Fixtures ───────────────────────────────────────────────────────

const PRICING = FALLBACK_PRICING

// Helper om een complete ManualOfferteData op te bouwen vanaf DEFAULTS.
function makeData(over: Partial<ManualOfferteData>): ManualOfferteData {
  return { ...DEFAULTS, ...over }
}

// Vind de invegen-arbeidsregel (normaal voegzand) in de computeRules-output.
const findInvegenNormaal = (rules: ReturnType<typeof computeRules>) =>
  rules.find((r) => r.desc === 'Invegen normaal voegzand excl voegzand')

// Vind de beschermlaag-regel.
const findBeschermlaag = (rules: ReturnType<typeof computeRules>) =>
  rules.find((r) => r.desc === 'Nieuwe beschermlaag incl product')

// Vind de preventieve-onkruidregel.
const findPreventief = (rules: ReturnType<typeof computeRules>) =>
  rules.find((r) => r.desc === 'Preventieve onkruidbeheersing')

const TENANT: TenantBedrijf = {
  bedrijfsnaam: 'Schoon Straatje',
  adres: null,
  postcode: null,
  plaats: null,
  offerte_geldigheid_dagen: 21,
  offerte_btw_tarief: 21,
  offerte_betaaltermijn_dagen: 14,
}

function buildPdf(data: ManualOfferteData) {
  const rules = computeRules(data, PRICING)
  const totals = computeTotals(rules, data, TENANT.offerte_btw_tarief)
  return buildOffertePDFData({
    data,
    rules,
    totals,
    offertenummer: 'SS-2026-001',
    bedrijf: TENANT,
    logoBase64: null,
    badgeBase64: null,
  })
}

// ── 1. Override werkt door in de rules-engine ──────────────────────

describe('per-offerte eenheidsprijs-override → computeRules', () => {
  it('arbeid_invegen_normaal_override zet stukprijs + totaal van de invegen-regel', () => {
    // Actieve invegen-regel: 40 m² normaal voegzand-arbeid. Integer m² zodat
    // Math.round(am2) === am2 en aantal × prijs schoon klopt.
    const m2 = 40
    const override = 1.45 // wijkt af van pricing.arbeid_invegen_normaal_per_m2 (0,90)
    expect(override).not.toBe(PRICING.arbeid_invegen_normaal_per_m2)

    const data = makeData({
      sub: ['invegen'],
      reinigen_actief: false, // alleen de invegen-arbeidsregel isoleren
      m2,
      voegzand_normaal_actief: true,
      voegzand_normaal_m2: m2,
      voegzand_normaal_zakken: 0, // geen voegzand-product-regel
      arbeid_invegen_normaal_override: override,
    })

    const rules = computeRules(data, PRICING)
    const regel = findInvegenNormaal(rules)
    expect(regel).toBeDefined()
    expect(regel!.prijs).toBe(override)
    expect(regel!.totaal).toBe(m2 * override)
  })

  it('beschermlaag_override zet stukprijs + totaal van de beschermlaag-regel', () => {
    const m2 = 80
    const override = 2.25 // wijkt af van pricing.beschermlaag_per_m2 (1,60)
    expect(override).not.toBe(PRICING.beschermlaag_per_m2)

    const data = makeData({
      sub: ['beschermlaag'],
      beschermlaag_m2: m2,
      beschermlaag_override: override,
    })

    const rules = computeRules(data, PRICING)
    const regel = findBeschermlaag(rules)
    expect(regel).toBeDefined()
    expect(regel!.prijs).toBe(override)
    expect(regel!.totaal).toBe(m2 * override)
  })

  it('preventieve_onkruid_override zet stukprijs + totaal van de onkruid-regel', () => {
    const m2 = 60
    const override = 3.1 // wijkt af van pricing.preventieve_onkruid_per_m2 (4,50)
    expect(override).not.toBe(PRICING.preventieve_onkruid_per_m2)

    const data = makeData({
      sub: ['preventieve_onkruid'],
      preventieve_onkruid_m2: m2,
      preventieve_onkruid_override: override,
    })

    const rules = computeRules(data, PRICING)
    const regel = findPreventief(rules)
    expect(regel).toBeDefined()
    expect(regel!.prijs).toBe(override)
    expect(regel!.totaal).toBe(m2 * override)
  })
})

// ── 2. Totaal weerspiegelt de override ─────────────────────────────

describe('per-offerte override → computeTotals', () => {
  it('subtotal/total weerspiegelen het override-bedrag (vergelijk met/zonder)', () => {
    const m2 = 80
    const override = 2.25 // hoger dan de default (1,60)

    const base = {
      sub: ['beschermlaag'] as ManualOfferteData['sub'],
      beschermlaag_m2: m2,
    }

    const zonder = makeData(base)
    const met = makeData({ ...base, beschermlaag_override: override })

    const totalsZonder = computeTotals(computeRules(zonder, PRICING), zonder, 21)
    const totalsMet = computeTotals(computeRules(met, PRICING), met, 21)

    // Zonder override: subtotal = m² × prijslijst.
    expect(totalsZonder.subtotal).toBe(m2 * PRICING.beschermlaag_per_m2)
    // Met override: subtotal = m² × override.
    expect(totalsMet.subtotal).toBe(m2 * override)
    expect(totalsMet.total).toBe(m2 * override)

    // Het verschil is exact het prijs-delta × m² (geen korting/korstmos hier).
    const delta = (override - PRICING.beschermlaag_per_m2) * m2
    expect(totalsMet.total - totalsZonder.total).toBeCloseTo(delta, 6)
  })
})

// ── 3. PDF-pariteit: stukprijs op de PDF == de override ────────────

describe('per-offerte override → buildOffertePDFData (PDF-pariteit)', () => {
  it('de PDF-regel stukprijs is gelijk aan de override (zelfde bedrag als de rule-engine)', () => {
    const m2 = 40
    const override = 1.45

    const data = makeData({
      sub: ['invegen'],
      reinigen_actief: false,
      m2,
      voegzand_normaal_actief: true,
      voegzand_normaal_m2: m2,
      voegzand_normaal_zakken: 0,
      arbeid_invegen_normaal_override: override,
    })

    const rules = computeRules(data, PRICING)
    const ruleRegel = findInvegenNormaal(rules)
    expect(ruleRegel).toBeDefined()

    const pdf = buildPdf(data)
    const pdfRegel = pdf.regels.find(
      (r) => r.omschrijving === 'Invegen normaal voegzand excl voegzand',
    )
    expect(pdfRegel).toBeDefined()
    // Pariteit: PDF.stukprijs === rule.prijs === override.
    expect(pdfRegel!.stukprijs).toBe(override)
    expect(pdfRegel!.stukprijs).toBe(ruleRegel!.prijs)
    expect(pdfRegel!.totaal).toBe(ruleRegel!.totaal)
    expect(pdfRegel!.totaal).toBe(m2 * override)
  })
})

// ── 4. Fallback: undefined => prijslijst (geen gedragswijziging) ───

describe('per-offerte override = undefined → prijslijst-fallback', () => {
  it('zonder override is de regelprijs exact de pricing-default', () => {
    const m2 = 80
    const data = makeData({
      sub: ['beschermlaag'],
      beschermlaag_m2: m2,
      beschermlaag_override: undefined,
    })

    const rules = computeRules(data, PRICING)
    const regel = findBeschermlaag(rules)
    expect(regel).toBeDefined()
    expect(regel!.prijs).toBe(PRICING.beschermlaag_per_m2)
    expect(regel!.totaal).toBe(m2 * PRICING.beschermlaag_per_m2)
  })

  it('invegen-arbeid zonder override valt terug op de prijslijst', () => {
    const m2 = 40
    const data = makeData({
      sub: ['invegen'],
      reinigen_actief: false,
      m2,
      voegzand_normaal_actief: true,
      voegzand_normaal_m2: m2,
      voegzand_normaal_zakken: 0,
      // geen arbeid_invegen_normaal_override
    })

    const rules = computeRules(data, PRICING)
    const regel = findInvegenNormaal(rules)
    expect(regel).toBeDefined()
    expect(regel!.prijs).toBe(PRICING.arbeid_invegen_normaal_per_m2)
    expect(regel!.totaal).toBe(m2 * PRICING.arbeid_invegen_normaal_per_m2)
  })
})

// ── 5. Override van 0 => 0 (gratis), niet terugvallen op de prijslijst ──

describe('per-offerte override = 0 → gratis (geen terugval)', () => {
  it('beschermlaag_override = 0 levert prijs 0 en totaal 0 op', () => {
    const m2 = 80
    const data = makeData({
      sub: ['beschermlaag'],
      beschermlaag_m2: m2,
      beschermlaag_override: 0,
    })

    const rules = computeRules(data, PRICING)
    const regel = findBeschermlaag(rules)
    expect(regel).toBeDefined()
    // 0 ?? pricing => 0 (nullish coalescing, NIET ||): geen terugval op 1,60.
    expect(regel!.prijs).toBe(0)
    expect(regel!.totaal).toBe(0)
    expect(regel!.prijs).not.toBe(PRICING.beschermlaag_per_m2)
  })

  it('override = 0 werkt door naar totalen en PDF', () => {
    const m2 = 40
    const data = makeData({
      sub: ['invegen'],
      reinigen_actief: false,
      m2,
      voegzand_normaal_actief: true,
      voegzand_normaal_m2: m2,
      voegzand_normaal_zakken: 0,
      arbeid_invegen_normaal_override: 0,
    })

    const rules = computeRules(data, PRICING)
    const totals = computeTotals(rules, data, 21)
    // De enige regel kost 0 => subtotal 0, total 0.
    expect(totals.subtotal).toBe(0)
    expect(totals.total).toBe(0)

    const pdf = buildPdf(data)
    const pdfRegel = pdf.regels.find(
      (r) => r.omschrijving === 'Invegen normaal voegzand excl voegzand',
    )
    expect(pdfRegel).toBeDefined()
    expect(pdfRegel!.stukprijs).toBe(0)
    expect(pdfRegel!.totaal).toBe(0)
  })
})
