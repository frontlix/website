import {
  ONDERHOUD_PRIJZEN,
  type ManualOfferteData,
  type RegelComputed,
  type TotalsComputed,
} from './manual-offerte-types'
import {
  FALLBACK_PRICING,
  type ManualOffertePricing,
} from './pricing-types'

/**
 * Vertaal de invoer van de wizard naar een lijst offerte-regels. Pure
 * functie, geen side-effects, gebruikt door zowel de Step3-preview als
 * de server-action.
 *
 * Prijzen zijn ontleend aan het Schoon-Straatje ontwerp:
 *  - Reiniging straatwerk: €3,95/m²
 *  - Arbeid invegen normaal: €0,90/m²
 *  - Arbeid invegen onkruidwerend: €1,60/m²
 *  - Preventieve onkruid: €1,10/m²
 *  - Beschermlaag: €1,60/m²
 *  - Onderhoudsplan: zie ONDERHOUD_PRIJZEN
 *  - Reiskosten boven 50km: €0,23/km
 *  - Extra arbeid: €1,20/minuut/persoon
 */
export function computeRules(
  data: ManualOfferteData,
  pricing: ManualOffertePricing = FALLBACK_PRICING,
): RegelComputed[] {
  const r: RegelComputed[] = []
  const m2 = Number(data.m2) || 0

  // Kleur-label, exact zoals Schoon Straatje 'm in de PDF zet:
  //  - alleen naturel: "naturel"
  //  - alleen antraciet: "antraciet"
  //  - beide: "naturel + antraciet"
  //  - geen: leeg (geen suffix in label)
  const kleurDelen: string[] = []
  if (data.kleur_naturel) kleurDelen.push('naturel')
  if (data.kleur_antraciet) kleurDelen.push('antraciet')
  const kleurLabel = kleurDelen.join(' + ')
  const kleurSuffix = kleurLabel ? ` ${kleurLabel}` : ''

  if (data.sub.includes('invegen')) {
    // Reiniging-regel, matcht Schoon Straatje:
    //  m² < 100 → "Reiniging oppervlak (dagprijs)" met aantal=1 dag
    //  m² ≥ 100 → "Reiniging oppervlak" met aantal=m², eenheid=m²
    const reinPr = pricing.reiniging_per_m2
    if (m2 < 100 && m2 > 0) {
      // Dagprijs voor kleine oppervlakken (SS conventie). Onze pricing-
      // config kent geen aparte dagprijs, dus we doen m² × tarief.
      const dagprijs = Math.round(m2 * reinPr * 100) / 100
      r.push({
        desc: 'Reiniging oppervlak (dagprijs)',
        aantal: 1,
        eenheid: 'dag',
        prijs: dagprijs,
        totaal: dagprijs,
      })
    } else if (m2 > 0) {
      r.push({
        desc: 'Reiniging oppervlak',
        aantal: m2,
        eenheid: 'm²',
        prijs: reinPr,
        totaal: m2 * reinPr,
      })
    }

    // Arbeid invegen, namen exact als SS: "Invegen normaal voegzand excl voegzand"
    if (data.voegzand_normaal_actief) {
      const am2 = Number(data.voegzand_normaal_m2) || 0
      const arbPr = pricing.arbeid_invegen_normaal_per_m2
      if (am2 > 0) {
        r.push({
          desc: 'Invegen normaal voegzand excl voegzand',
          aantal: Math.round(am2),
          eenheid: 'm²',
          prijs: arbPr,
          totaal: am2 * arbPr,
        })
      }
    }
    if (data.voegzand_onkruidwerend_actief) {
      const am2 = Number(data.voegzand_onkruidwerend_m2) || 0
      const arbPr = pricing.arbeid_invegen_onkruidwerend_per_m2
      if (am2 > 0) {
        r.push({
          desc: 'Invegen onkruidwerend voegzand excl voegzand',
          aantal: Math.round(am2),
          eenheid: 'm²',
          prijs: arbPr,
          totaal: am2 * arbPr,
        })
      }
    }

    // Voegzand-product, SS format: "Voegzand normaal naturel (15 kg/zak)".
    // Eenheid = "zakken" (meervoud), zoals in SS PDF te zien.
    if (data.voegzand_normaal_actief && Number(data.voegzand_normaal_zakken) > 0) {
      const zakken = Number(data.voegzand_normaal_zakken)
      const prijs = Number(data.voegzand_normaal_prijs)
      r.push({
        desc: `Voegzand normaal${kleurSuffix} (15 kg/zak)`,
        aantal: zakken,
        eenheid: 'zakken',
        prijs,
        totaal: zakken * prijs,
      })
    }
    if (data.voegzand_onkruidwerend_actief && Number(data.voegzand_onkruidwerend_zakken) > 0) {
      const zakken = Number(data.voegzand_onkruidwerend_zakken)
      const prijs = Number(data.voegzand_onkruidwerend_prijs)
      r.push({
        desc: `Voegzand onkruidwerend${kleurSuffix} (15 kg/zak)`,
        aantal: zakken,
        eenheid: 'zakken',
        prijs,
        totaal: zakken * prijs,
      })
    }
  }

  if (data.sub.includes('preventieve_onkruid')) {
    const pr = pricing.preventieve_onkruid_per_m2
    r.push({
      desc: 'Preventieve onkruidbeheersing',
      aantal: m2,
      eenheid: 'm²',
      prijs: pr,
      totaal: m2 * pr,
    })
  }
  if (data.sub.includes('beschermlaag')) {
    const pr = pricing.beschermlaag_per_m2
    r.push({
      desc: 'Nieuwe beschermlaag incl product',
      aantal: m2,
      eenheid: 'm²',
      prijs: pr,
      totaal: m2 * pr,
    })
  }
  if (data.sub.includes('onderhoud')) {
    const w = data.onderhoud_weken
    // Eerst proberen pricing-overrides; anders fallback op de constant.
    const planMap: Record<4 | 8 | 12 | 16, number> = {
      4:  pricing.plan_4w_per_m2,
      8:  pricing.plan_8w_per_m2,
      12: pricing.plan_12w_per_m2,
      16: pricing.plan_16w_per_m2,
    }
    const plPrice = planMap[w] ?? ONDERHOUD_PRIJZEN[w] ?? 1.75
    r.push({
      desc: `Onderhoudsbeheersing (elke ${w} weken)`,
      aantal: m2,
      eenheid: 'm²',
      prijs: plPrice,
      totaal: m2 * plPrice,
    })
  }

  if (data.planten_afschermen_actief && Number(data.planten_afschermen_rollen) > 0) {
    const rollen = Number(data.planten_afschermen_rollen)
    const prijs = Number(data.planten_afschermen_prijs)
    r.push({
      desc: 'Afdekfolie planten',
      aantal: rollen,
      eenheid: 'rol',
      prijs,
      totaal: rollen * prijs,
    })
  }

  if (
    Number(data.extra_arbeid_minuten) > 0 &&
    Number(data.extra_arbeid_personen) > 0
  ) {
    const arbPr = pricing.extra_arbeid_per_min
    const minuten = Number(data.extra_arbeid_minuten)
    const personen = Number(data.extra_arbeid_personen)
    const tot = minuten * personen * arbPr
    // SS-conventie: "Extra arbeid: {label} (X min × Y personen)" als label,
    // anders gewoon "Extra arbeid (X min × Y personen)".
    const label = data.extra_arbeid_omschrijving?.trim()
    const prefix = label ? `Extra arbeid: ${label}` : 'Extra arbeid'
    r.push({
      desc: `${prefix} (${minuten} min × ${personen} personen)`,
      aantal: minuten * personen,
      eenheid: 'minuten',
      prijs: arbPr,
      totaal: tot,
    })
  }

  if (Number(data.afstand_km) > pricing.reiskosten_drempel_km) {
    const km = Number(data.afstand_km) - pricing.reiskosten_drempel_km
    const pr = pricing.reiskosten_per_km
    // SS-formaat: "Reiskosten (X km enkele reis, retour)" met aantal = 2× km
    const retourKm = Math.round(km * 2 * 100) / 100
    r.push({
      desc: `Reiskosten (${Math.round(Number(data.afstand_km))} km enkele reis, retour)`,
      aantal: retourKm,
      eenheid: 'km',
      prijs: pr,
      totaal: retourKm * pr,
    })
  }

  return r
}

export function computeTotals(
  rules: RegelComputed[],
  data: ManualOfferteData
): TotalsComputed {
  const subtotal = rules.reduce((s, r) => s + r.totaal, 0)
  const korstmosToeslag = data.korstmos === 'ja' ? subtotal * 0.1 : 0
  const subtotal2 = subtotal + korstmosToeslag
  const discount = Number(data.korting_percentage) || 0
  const kortingBedrag = subtotal2 * (discount / 100)
  const total = subtotal2 - kortingBedrag
  const btw = total * 0.21
  return { subtotal, korstmosToeslag, kortingBedrag, discount, total, btw }
}
