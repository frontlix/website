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
 * functie, geen side-effects — gebruikt door zowel de Step3-preview als
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

  const kleuren: string[] = []
  if (data.kleur_naturel) kleuren.push('naturel')
  if (data.kleur_antraciet) kleuren.push('antraciet')
  const kleurLabel = kleuren.length === 0 ? 'kleur n.t.b.' : kleuren.join(' + ')

  if (data.sub.includes('invegen')) {
    const reinPr = pricing.reiniging_per_m2
    r.push({
      desc: 'Reiniging straatwerk',
      aantal: m2,
      eenheid: 'm²',
      prijs: reinPr,
      totaal: m2 * reinPr,
    })

    // Arbeid invegen — verdeel naar rato van het aantal zakken per type.
    if (data.voegzand_normaal_actief) {
      const ratio = data.voegzand_onkruidwerend_actief
        ? Number(data.voegzand_normaal_zakken) /
          Math.max(
            1,
            Number(data.voegzand_normaal_zakken) +
              Number(data.voegzand_onkruidwerend_zakken)
          )
        : 1
      const am2 = m2 * ratio
      const arbPr = pricing.arbeid_invegen_normaal_per_m2
      if (am2 > 0) {
        r.push({
          desc: 'Invegen — arbeid normaal voegzand',
          aantal: Math.round(am2),
          eenheid: 'm²',
          prijs: arbPr,
          totaal: am2 * arbPr,
        })
      }
    }
    if (data.voegzand_onkruidwerend_actief) {
      const ratio = data.voegzand_normaal_actief
        ? Number(data.voegzand_onkruidwerend_zakken) /
          Math.max(
            1,
            Number(data.voegzand_normaal_zakken) +
              Number(data.voegzand_onkruidwerend_zakken)
          )
        : 1
      const am2 = m2 * ratio
      const arbPr = pricing.arbeid_invegen_onkruidwerend_per_m2
      if (am2 > 0) {
        r.push({
          desc: 'Invegen — arbeid onkruidwerend voegzand',
          aantal: Math.round(am2),
          eenheid: 'm²',
          prijs: arbPr,
          totaal: am2 * arbPr,
        })
      }
    }

    if (data.voegzand_normaal_actief && Number(data.voegzand_normaal_zakken) > 0) {
      const zakken = Number(data.voegzand_normaal_zakken)
      const prijs = Number(data.voegzand_normaal_prijs)
      r.push({
        desc: `Voegzand normaal (${kleurLabel})`,
        aantal: zakken,
        eenheid: 'zak',
        prijs,
        totaal: zakken * prijs,
      })
    }
    if (data.voegzand_onkruidwerend_actief && Number(data.voegzand_onkruidwerend_zakken) > 0) {
      const zakken = Number(data.voegzand_onkruidwerend_zakken)
      const prijs = Number(data.voegzand_onkruidwerend_prijs)
      r.push({
        desc: `Voegzand onkruidwerend (${kleurLabel})`,
        aantal: zakken,
        eenheid: 'zak',
        prijs,
        totaal: zakken * prijs,
      })
    }
  }

  if (data.sub.includes('preventieve_onkruid')) {
    const pr = pricing.preventieve_onkruid_per_m2
    r.push({
      desc: 'Preventieve onkruidbehandeling',
      aantal: m2,
      eenheid: 'm²',
      prijs: pr,
      totaal: m2 * pr,
    })
  }
  if (data.sub.includes('beschermlaag')) {
    const pr = pricing.beschermlaag_per_m2
    r.push({
      desc: 'Nieuwe beschermlaag toepassen',
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
      desc: `Onderhoudsplan — elke ${w} weken`,
      aantal: m2,
      eenheid: 'm²/beurt',
      prijs: plPrice,
      totaal: m2 * plPrice,
    })
  }

  if (data.planten_afschermen_actief && Number(data.planten_afschermen_rollen) > 0) {
    const rollen = Number(data.planten_afschermen_rollen)
    const prijs = Number(data.planten_afschermen_prijs)
    r.push({
      desc: 'Plantenafscherming folie',
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
    const tot =
      Number(data.extra_arbeid_minuten) *
      Number(data.extra_arbeid_personen) *
      arbPr
    r.push({
      desc: `Extra arbeid${data.extra_arbeid_omschrijving ? ` — ${data.extra_arbeid_omschrijving}` : ''} (${data.extra_arbeid_minuten}min × ${data.extra_arbeid_personen} pers.)`,
      aantal: Number(data.extra_arbeid_minuten),
      eenheid: 'min',
      prijs: arbPr,
      totaal: tot,
    })
  }

  if (Number(data.afstand_km) > pricing.reiskosten_drempel_km) {
    const km = Number(data.afstand_km) - pricing.reiskosten_drempel_km
    const pr = pricing.reiskosten_per_km
    r.push({
      desc: `Reiskosten (${km} km × €${pr.toFixed(2).replace('.', ',')})`,
      aantal: km,
      eenheid: 'km',
      prijs: pr,
      totaal: km * pr,
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
