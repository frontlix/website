import {
  ONDERHOUD_PRIJZEN,
  regelOpmerkingKey,
  type ManualOfferteData,
  type OpmerkingKey,
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
 *  - Preventieve onkruid: €4,50/m² (deelt de ">12 weken"-staffel onkruid_per_m2_langer)
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

  // Reiniging en invegen zijn losse keuzes (v2-wizard). De reiniging-regel telt
  // alleen mee als reinigen_actief (default true voor bestaande flows); het
  // invegen-werk + voegzand hangt aan de 'invegen'-sub-dienst + voegzand-vlaggen.
  const reinigenActief = data.reinigen_actief !== false

  if (data.sub.includes('invegen')) {
    // Reiniging-regel, matcht Schoon Straatje:
    //  m² < 100 → "Reiniging oppervlak (dagprijs)" met aantal=1 dag
    //  m² ≥ 100 → "Reiniging oppervlak" met aantal=m², eenheid=m²
    // Per-offerte override (undefined = prijslijst); 0 blijft 0, dus ?? niet ||.
    const reinPr = data.reiniging_per_m2_override ?? pricing.reiniging_per_m2
    if (reinigenActief && m2 < 100 && m2 > 0) {
      // Vaste dagprijs voor kleine oppervlakken (< 100 m²), Schoon Straatje-
      // conventie: niet m² × tarief maar één vast bedrag.
      // Per-offerte override (undefined = prijslijst); 0 blijft 0, dus ?? niet ||.
      const dagprijs = data.reinigen_dagprijs_override ?? pricing.reinigen_dagprijs_onder_100m2
      r.push({
        desc: 'Reiniging oppervlak (dagprijs)',
        aantal: 1,
        eenheid: 'dag',
        prijs: dagprijs,
        totaal: dagprijs,
        overrideKey: 'reinigen_dagprijs_override',
      })
    } else if (reinigenActief && m2 > 0) {
      r.push({
        desc: 'Reiniging oppervlak',
        aantal: m2,
        eenheid: 'm²',
        prijs: reinPr,
        totaal: m2 * reinPr,
        overrideKey: 'reiniging_per_m2_override',
      })
    }

    // Arbeid invegen, namen exact als SS: "Invegen normaal voegzand excl voegzand"
    if (data.voegzand_normaal_actief) {
      const am2 = Number(data.voegzand_normaal_m2) || 0
      // Per-offerte override (undefined = prijslijst); 0 blijft 0, dus ?? niet ||.
      const arbPr = data.arbeid_invegen_normaal_override ?? pricing.arbeid_invegen_normaal_per_m2
      if (am2 > 0) {
        r.push({
          desc: 'Invegen normaal voegzand excl voegzand',
          aantal: Math.round(am2),
          eenheid: 'm²',
          prijs: arbPr,
          totaal: am2 * arbPr,
          overrideKey: 'arbeid_invegen_normaal_override',
        })
      }
    }
    if (data.voegzand_onkruidwerend_actief) {
      const am2 = Number(data.voegzand_onkruidwerend_m2) || 0
      // Per-offerte override (undefined = prijslijst); 0 blijft 0, dus ?? niet ||.
      const arbPr = data.arbeid_invegen_onkruidwerend_override ?? pricing.arbeid_invegen_onkruidwerend_per_m2
      if (am2 > 0) {
        r.push({
          desc: 'Invegen onkruidwerend voegzand excl voegzand',
          aantal: Math.round(am2),
          eenheid: 'm²',
          prijs: arbPr,
          totaal: am2 * arbPr,
          overrideKey: 'arbeid_invegen_onkruidwerend_override',
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
        overrideKey: 'voegzand_normaal_prijs',
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
        overrideKey: 'voegzand_onkruidwerend_prijs',
      })
    }
  }

  if (data.sub.includes('preventieve_onkruid')) {
    // Per-offerte override (undefined = prijslijst); 0 blijft 0, dus ?? niet ||.
    const pr = data.preventieve_onkruid_override ?? pricing.preventieve_onkruid_per_m2
    // Eigen oppervlakte indien meegegeven (v2-wizard), anders de hoofd-m2.
    const qm2 = data.preventieve_onkruid_m2 != null ? Number(data.preventieve_onkruid_m2) : m2
    r.push({
      desc: 'Preventieve onkruidbeheersing',
      aantal: qm2,
      eenheid: 'm²',
      prijs: pr,
      totaal: qm2 * pr,
      overrideKey: 'preventieve_onkruid_override',
    })
  }
  if (data.sub.includes('beschermlaag')) {
    // Per-offerte override (undefined = prijslijst); 0 blijft 0, dus ?? niet ||.
    const pr = data.beschermlaag_override ?? pricing.beschermlaag_per_m2
    const qm2 = data.beschermlaag_m2 != null ? Number(data.beschermlaag_m2) : m2
    r.push({
      desc: 'Nieuwe beschermlaag incl product',
      aantal: qm2,
      eenheid: 'm²',
      prijs: pr,
      totaal: qm2 * pr,
      overrideKey: 'beschermlaag_override',
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
    // Per-offerte override (undefined = prijslijst-plan-tarief); 0 blijft 0.
    const plPrice = data.onderhoud_per_m2_override ?? planMap[w] ?? ONDERHOUD_PRIJZEN[w] ?? 1.75
    r.push({
      desc: `Onderhoudsbeheersing (elke ${w} weken)`,
      aantal: m2,
      eenheid: 'm²',
      prijs: plPrice,
      totaal: m2 * plPrice,
      overrideKey: 'onderhoud_per_m2_override',
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
      overrideKey: 'planten_afschermen_prijs',
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
    // Per-offerte override (undefined = prijslijst); 0 blijft 0, dus ?? niet ||.
    const pr = data.reiskosten_per_km_override ?? pricing.reiskosten_per_km
    // SS-formaat: "Reiskosten (X km enkele reis, retour)" met aantal = 2× km
    const retourKm = Math.round(km * 2 * 100) / 100
    r.push({
      desc: `Reiskosten (${Math.round(Number(data.afstand_km))} km enkele reis, retour)`,
      overrideKey: 'reiskosten_per_km_override',
      aantal: retourKm,
      eenheid: 'km',
      prijs: pr,
      totaal: retourKm * pr,
    })
  }

  // Per-onderdeel opmerkingen aan de LAATSTE regel van elk onderdeel hangen,
  // zodat de opmerking in de offerte direct onder dat onderdeel verschijnt
  // (bv. onder de voegzand-productregel, na de invegen-arbeidsregel). Alleen
  // zichtbare, niet-lege opmerkingen worden meegegeven; anders blijft het veld
  // afwezig en komt er geen lege witregel in de offerte.
  const opm = data.regel_opmerkingen
  if (opm) {
    const gehad = new Set<OpmerkingKey>()
    for (let i = r.length - 1; i >= 0; i--) {
      const key = regelOpmerkingKey(r[i].desc)
      if (!key || gehad.has(key)) continue
      gehad.add(key)
      const o = opm[key]
      if (o && o.zichtbaar !== false && o.tekst && o.tekst.trim()) {
        r[i].opmerking = o.tekst.trim()
      }
    }
  }

  return r
}

/**
 * Geef per opmerking-onderdeel de index van de LAATSTE regel in `rules`.
 * Editors (lead-editor + mobiel) tonen het opmerking-veld alleen op die regel,
 * zodat een onderdeel met meerdere regels (bv. voegzand: arbeid + product) één
 * opmerking-veld heeft, op dezelfde plek als waar de offerte 'm rendert.
 */
export function laatsteOnderdeelRegelIndices(
  rules: RegelComputed[],
): Map<number, OpmerkingKey> {
  const out = new Map<number, OpmerkingKey>()
  const gehad = new Set<OpmerkingKey>()
  for (let i = rules.length - 1; i >= 0; i--) {
    const key = regelOpmerkingKey(rules[i].desc)
    if (!key || gehad.has(key)) continue
    gehad.add(key)
    out.set(i, key)
  }
  return out
}

export function computeTotals(
  rules: RegelComputed[],
  data: ManualOfferteData,
  /** BTW-percentage uit tenant_settings (default 21 = NL-standaardtarief). */
  btwTarief = 21
): TotalsComputed {
  const subtotal = rules.reduce((s, r) => s + r.totaal, 0)
  // Reiskosten (eenheid 'km') tellen niet mee voor korstmos-toeslag noch korting.
  const reiskosten = rules
    .filter((r) => r.eenheid === 'km')
    .reduce((s, r) => s + r.totaal, 0)
  const diensten = subtotal - reiskosten
  const korstmosToeslag = data.korstmos === 'ja' ? diensten * 0.1 : 0
  const discount = Number(data.korting_percentage) || 0
  // Korting geldt over diensten + korstmos-toeslag, NOOIT over reiskosten.
  // korting_bedrag > 0 ⇒ vast-bedrag-modus (gecapt op de grondslag),
  // anders percentage-modus.
  const base = diensten + korstmosToeslag
  const kortingBedrag = Number(data.korting_bedrag) > 0
    ? Math.min(Number(data.korting_bedrag), base)
    : base * (discount / 100)
  const total = subtotal + korstmosToeslag - kortingBedrag
  const btw = total * (btwTarief / 100)
  return { subtotal, korstmosToeslag, kortingBedrag, discount, total, btw }
}
