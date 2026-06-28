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

  const reinigenActief = data.reinigen_actief !== false

  // ── Reiniging: altijd bij oprit/terras/terrein (gelijk aan de bot, die 'm
  //    puur op hoofdcategorie zet, LOS van invegen). De reinigen_actief-toggle
  //    is een dashboard-only verfijning; default true reproduceert de bot.
  //    BUGFIX: stond eerder binnen het invegen-blok, waardoor een lead zonder
  //    invegen (bv. alleen preventieve onkruid + beschermlaag) de Reiniging-
  //    regel miste en de app-prijs afweek van de gemailde offerte.
  if (data.hoofdcategorie.includes('oprit_terras_terrein') && reinigenActief) {
    // Reiniging als ÉÉN regel "Reiniging oppervlak": de dagprijs dekt de eerste
    // 100 m² (vast bedrag), elke m² daarboven kost de per-m²-prijs bovenop. De
    // eenheidsprijs is dus niet zuiver per m², daarom toont de regel alleen
    // "X m²" + het totaal (verbergEenheidsprijs). Vloeiend over de 100 m²-grens,
    // identiek aan de bot. Per-offerte override (undefined = prijslijst); 0 blijft 0.
    const reinPr = data.reiniging_per_m2_override ?? pricing.reiniging_per_m2
    const dagprijs = data.reinigen_dagprijs_override ?? pricing.reinigen_dagprijs_onder_100m2
    const totaal = m2 > 100 ? dagprijs + (m2 - 100) * reinPr : dagprijs
    r.push({
      desc: 'Reiniging oppervlak',
      aantal: m2,
      eenheid: 'm²',
      prijs: reinPr,
      totaal,
    })
  }

  // ── Invegen-ARBEID hangt aan de invegen-sub-dienst (het voegzand-PRODUCT
  //    staat los, zie hieronder — net als bij de bot).
  if (data.sub.includes('invegen')) {
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
  }

  // ── Voegzand-PRODUCT staat LOS van invegen (gelijk aan de bot): de eigenaar
  //    kan losse zakken op de offerte zetten, ook zonder invegen-arbeid.
  //    BUGFIX: stond eerder binnen het invegen-blok.
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
    // Per-offerte override (undefined = prijslijst); 0 blijft 0, dus ?? niet ||.
    const arbPr = data.extra_arbeid_per_min_override ?? pricing.extra_arbeid_per_min
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
      overrideKey: 'extra_arbeid_per_min_override',
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

  // Rond elk regel-totaal op 2 decimalen af, exact zoals de bot
  // (src/services/pricing.ts → round() per regel), zodat het live prijsoverzicht
  // tot op de cent gelijk is aan de gemailde offerte.
  for (const reg of r) {
    reg.totaal = Math.round(reg.totaal * 100) / 100
  }

  // Per-onderdeel opmerkingen aan de EERSTE regel van elk onderdeel hangen,
  // zodat de opmerking onder het juiste onderdeel verschijnt: een opmerking bij
  // Invegen komt onder de "Invegen normaal voegzand"-regel, niet onder de losse
  // voegzand-productregel die erna komt. Alleen zichtbare, niet-lege opmerkingen
  // worden meegegeven; anders blijft het veld afwezig en komt er geen lege
  // witregel in de offerte. (Moet gelijk lopen met de bot-PDF-template.)
  const opm = data.regel_opmerkingen
  if (opm) {
    const gehad = new Set<OpmerkingKey>()
    for (let i = 0; i < r.length; i++) {
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
  const round2 = (n: number) => Math.round(n * 100) / 100
  const subtotal = round2(rules.reduce((s, r) => s + r.totaal, 0))
  // Reiskosten (eenheid 'km') tellen niet mee voor korstmos-toeslag noch korting.
  const reiskosten = round2(
    rules.filter((r) => r.eenheid === 'km').reduce((s, r) => s + r.totaal, 0),
  )
  const diensten = round2(subtotal - reiskosten)
  // Korstmos-toeslag: 10% ALLEEN op de reiniging- en onkruid/onderhoud-regels,
  // exact zoals de bot (src/services/pricing.ts zet de toeslag in-line op
  // precies die regels, korstmos_toeslag_van_toepassing=true — NIET over alle
  // diensten). Zakken zand, folie, beschermlaag, extra arbeid en reiskosten
  // krijgen géén toeslag.
  const korstmosBasis =
    data.korstmos === 'ja'
      ? rules
          .filter((r) => /^(Reiniging|Onkruidbeheersing|Onderhoudsbeheersing)/.test(r.desc))
          .reduce((s, r) => s + r.totaal, 0)
      : 0
  const korstmosToeslag = round2(korstmosBasis * 0.1)
  const discount = Math.max(0, Math.min(100, Number(data.korting_percentage) || 0))
  // Korting geldt over diensten + korstmos-toeslag, NOOIT over reiskosten.
  // korting_bedrag > 0 ⇒ vast-bedrag-modus (gecapt op de grondslag),
  // anders percentage-modus.
  const base = round2(diensten + korstmosToeslag)
  const kortingBedrag = round2(
    Number(data.korting_bedrag) > 0
      ? Math.min(Number(data.korting_bedrag), base)
      : base * (discount / 100),
  )
  const total = round2(subtotal + korstmosToeslag - kortingBedrag)
  const btw = round2(total * (btwTarief / 100))
  return { subtotal, korstmosToeslag, kortingBedrag, discount, total, btw }
}
