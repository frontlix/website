/**
 * Pure functies + types voor de "Wat als"-simulator op /instellingen?section=prijzen.
 *
 * Doel: gegeven een set recente leads + een set hypothetische prijswijzigingen,
 * bereken de geschatte omzet-delta als díe prijzen waren gebruikt voor díe leads.
 *
 * Aanpak: per rule_key kennen we een "volume-functie" die uit lead-velden
 * een aantal afleidt (m², zakken, km, minuten). Bij een prijswijziging is
 * de delta lineair: ΔOmzet = Σ(volume_per_lead) × (nieuwe_prijs − oude_prijs).
 *
 * Bewust geen elastiteit-model voor conversie, daar hebben we geen data
 * voor. De simulator toont alleen wat we eerlijk kunnen onderbouwen.
 */

export type LeadForImpact = {
  m2: number | null
  sub_diensten: string[] | null
  voegzand_normaal_zakken: number | null
  voegzand_onkruidwerend_zakken: number | null
  voegzand_normaal_actief?: boolean | null
  voegzand_onkruidwerend_actief?: boolean | null
  extra_arbeid_minuten: number | null
  extra_arbeid_personen: number | null
  afstand_km: number | null
  totaal_prijs: number | null
  akkoord_op: string | null
  afspraak_geboekt_op: string | null
  aangemaakt: string | null
}

/**
 * Vertaal één rule_key naar het volume uit één lead. Returns 0 als de rule
 * niet van toepassing is op deze lead. Bewust een open string-key zodat
 * tenant-eigen rules die we niet kennen gewoon 0 contribueren (geen crash).
 *
 * Heuristiek: we kijken naar suffix en sub_diensten. Voor onbekende keys
 * waar we wél kunnen raden, gebruiken we de algemene regels:
 *  - suffix `_per_m2` met een diensten-match → som van m²
 *  - suffix `_per_zak`                       → som van zakken
 *  - suffix `_per_km`                        → km boven drempel
 *  - suffix `_per_min` / `_per_minuut`       → minuten × personen
 */
export function volumeForRule(ruleKey: string, lead: LeadForImpact): number {
  const subs = lead.sub_diensten ?? []
  const has = (s: string) => subs.includes(s)
  const m2 = Number(lead.m2) || 0
  const normaal = Number(lead.voegzand_normaal_zakken) || 0
  const onkruid = Number(lead.voegzand_onkruidwerend_zakken) || 0
  const minuten = Number(lead.extra_arbeid_minuten) || 0
  const personen = Number(lead.extra_arbeid_personen) || 0
  const afstand = Number(lead.afstand_km) || 0

  switch (ruleKey) {
    // Reiniging, wordt toegepast bij invegen
    case 'reiniging_per_m2':
    case 'reinigen_per_m2':
      return has('invegen') ? m2 : 0

    case 'reinigen_dagprijs_onder_100m2':
      // Dagprijs: 1 "stuk" per kleine klus
      return has('invegen') && m2 > 0 && m2 < 100 ? 1 : 0

    // Invegen-arbeid: verdeel m² naar rato van zakken per type
    case 'arbeid_invegen_normaal_per_m2':
    case 'invegen_arbeid_normaal_per_m2': {
      if (!has('invegen')) return 0
      const total = normaal + onkruid
      const ratio = total > 0 ? normaal / total : (normaal > 0 ? 1 : 0)
      return m2 * ratio
    }
    case 'arbeid_invegen_onkruidwerend_per_m2':
    case 'invegen_arbeid_onkruidwerend_per_m2': {
      if (!has('invegen')) return 0
      const total = normaal + onkruid
      const ratio = total > 0 ? onkruid / total : (onkruid > 0 ? 1 : 0)
      return m2 * ratio
    }

    case 'voegzand_normaal_per_zak':
    case 'voegzand_normaal_prijs_per_zak':
      return normaal

    case 'voegzand_onkruidwerend_per_zak':
    case 'voegzand_onkruidwerend_prijs_per_zak':
      return onkruid

    case 'preventieve_onkruid_per_m2':
      return has('preventieve_onkruid') ? m2 : 0

    case 'beschermlaag_per_m2':
      return has('beschermlaag') ? m2 : 0

    // Onderhoudsplannen, we hebben geen `onderhoud_weken` veld in `leads`
    // dus we kunnen niet bepalen wélk plan een lead koos. Skip.
    case 'plan_4w_per_m2':
    case 'plan_8w_per_m2':
    case 'plan_12w_per_m2':
    case 'plan_16w_per_m2':
    case 'onkruidbeheersing_4w_per_m2':
    case 'onkruidbeheersing_8w_per_m2':
    case 'onkruidbeheersing_12w_per_m2':
    case 'onkruidbeheersing_langer_per_m2':
      return 0

    case 'reiskosten_per_km':
      // Drempel hardcoded op 50; in praktijk leest de offerte-engine deze
      // uit pricing_rules. Voor de simulator hanteren we 50 als default.
      return Math.max(0, afstand - 50)

    case 'reiskosten_drempel_km':
      return 0 // drempel, geen prijs-volume

    case 'extra_arbeid_per_min':
    case 'extra_arbeid_per_minuut':
      return minuten * personen

    case 'plantenafscherming_per_rol':
    case 'planten_afschermen_folie_per_rol':
      // Geen rollen-veld in leads-tabel; skip.
      return 0
  }

  // Fallback heuristiek voor onbekende keys
  if (ruleKey.endsWith('_per_zak')) return normaal + onkruid
  if (ruleKey.endsWith('_per_min') || ruleKey.endsWith('_per_minuut')) return minuten * personen
  if (ruleKey.endsWith('_per_km')) return Math.max(0, afstand - 50)
  // _per_m2 zonder bekende dienst-match: laat 0, want we weten niet op welke leads dit van toepassing is.
  return 0
}

/** Sommeer per rule_key over alle leads. Resultaat is plat: rule_key → totaal volume. */
export function aggregateVolumes(
  leads: LeadForImpact[],
  ruleKeys: string[],
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of ruleKeys) {
    let total = 0
    for (const lead of leads) total += volumeForRule(key, lead)
    out[key] = total
  }
  return out
}

/** Bereken omzet-delta gegeven volumes + huidige prijzen + pending changes. */
export function computeRevenueDelta(
  volumes: Record<string, number>,
  currentPrices: Record<string, number>,
  pendingChanges: Record<string, number>,
): number {
  let delta = 0
  for (const [key, newValue] of Object.entries(pendingChanges)) {
    const vol = volumes[key] ?? 0
    const oldValue = currentPrices[key] ?? 0
    delta += vol * (newValue - oldValue)
  }
  return delta
}

/** Tel leads met akkoord_op of afspraak_geboekt_op gevuld. */
export function countConverted(leads: LeadForImpact[]): number {
  return leads.reduce(
    (n, l) => n + (l.akkoord_op || l.afspraak_geboekt_op ? 1 : 0),
    0,
  )
}
