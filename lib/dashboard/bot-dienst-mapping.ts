/**
 * Vertaling tussen de bot-keys (Schoon Straatje schrijft in `leads`) en de
 * dashboard-offerte-vorm. Pure, side-effect-vrije helpers, gedeeld door beide
 * lead→ManualOfferteData-mappers (de live editor-seed en de auto-prijsregels)
 * én de terug-mapping naar de leads-kolommen.
 *
 * Achtergrond: de bot codeert het onkruidbeheersing-plan als 'plan_4_weken'
 * (etc.) in `sub_diensten` en gebruikt hoofdcategorie 'onkruidbeheersing_zakelijk'.
 * De dashboard-wizard kent één 'onderhoud'-subdienst met een aparte
 * `onderhoud_weken`, en hoofdcategorie 'onkruidbeheersing'. Zonder vertaling
 * filtert het dashboard de onkruid-dienst stil weg → offerte op EUR 0 diensten.
 */

import type { Hoofdcategorie, SubDienst } from './manual-offerte-types'

const PLAN_WEKEN: Record<string, 4 | 8 | 12 | 16> = {
  plan_4_weken: 4,
  plan_8_weken: 8,
  plan_12_weken: 12,
  plan_16_weken: 16,
}

/**
 * Vertaal de `sub_diensten` van een lead naar dashboard-subdiensten die
 * computeRules() begrijpt, plus het afgeleide onderhoud-interval.
 *
 *  - 'invegen' / 'beschermlaag' / 'onderhoud' → 1-op-1.
 *  - bot-naam 'preventieve_onkruidbeheersing' → dashboard 'preventieve_onkruid'.
 *  - 'plan_X_weken' → subdienst 'onderhoud' + onderhoudWeken = X.
 *  - Een onkruidbeheersing-lead krijgt altijd de onkruid-basisdienst, ook
 *    zonder herkende plan-key (de bot rekent dan het hoogste '> 12 weken'-
 *    tarief; wij spiegelen dat met het 16-weken-tarief).
 *
 * Onbekende keys worden genegeerd zodat computeRules() niet stuk gaat op
 * vreemde input.
 */
export function mapBotSubDiensten(
  subDiensten: string[] | null,
  hoofdcategorie: string | null,
): { sub: SubDienst[]; onderhoudWeken: 4 | 8 | 12 | 16 | null } {
  const sub = new Set<SubDienst>()
  let onderhoudWeken: 4 | 8 | 12 | 16 | null = null

  for (const s of subDiensten ?? []) {
    if (s === 'invegen' || s === 'beschermlaag' || s === 'onderhoud') {
      sub.add(s)
    } else if (s === 'preventieve_onkruid' || s === 'preventieve_onkruidbeheersing') {
      sub.add('preventieve_onkruid')
    } else if (s in PLAN_WEKEN) {
      sub.add('onderhoud')
      onderhoudWeken = PLAN_WEKEN[s]
    }
  }

  if (hoofdcategorie === 'onkruidbeheersing_zakelijk' && !sub.has('onderhoud')) {
    sub.add('onderhoud')
    onderhoudWeken = onderhoudWeken ?? 16
  }

  return { sub: [...sub], onderhoudWeken }
}

/**
 * Map de DB-hoofdcategorie (bot-waarden) naar de dashboard-union. De bot
 * gebruikt 'onkruidbeheersing_zakelijk'; de wizard kent 'onkruidbeheersing'.
 * 'beide' → beide categorieen. Onbekend → lege array.
 */
export function mapBotHoofdcategorie(hoofdcategorie: string | null): Hoofdcategorie[] {
  if (hoofdcategorie === 'beide') return ['oprit_terras_terrein', 'onkruidbeheersing']
  if (hoofdcategorie === 'onkruidbeheersing_zakelijk' || hoofdcategorie === 'onkruidbeheersing') {
    return ['onkruidbeheersing']
  }
  if (hoofdcategorie === 'oprit_terras_terrein') return ['oprit_terras_terrein']
  return []
}

/** Inverse van PLAN_WEKEN: dashboard-interval → bot-plan-key. */
export function onderhoudWekenToPlanKey(weken: 4 | 8 | 12 | 16): string {
  return `plan_${weken}_weken`
}

/**
 * Serialiseer de dashboard-hoofdcategorie-array terug naar de single
 * leads.hoofdcategorie-kolom, in bot-waarden zodat de bot de lead na een
 * dashboard-save nog steeds als onkruidbeheersing herkent en prijst.
 */
export function dashboardHoofdcategorieToDb(cats: Hoofdcategorie[]): string {
  if (cats.length === 0) return 'oprit_terras_terrein'
  if (cats.length > 1) return 'beide'
  return cats[0] === 'onkruidbeheersing' ? 'onkruidbeheersing_zakelijk' : cats[0]
}

/**
 * Serialiseer de dashboard-subdiensten terug naar `leads.sub_diensten`, in
 * bot-namen zodat een save-round-trip symmetrisch is met mapBotSubDiensten en
 * de bot de regels blijft herkennen:
 *  - 'onderhoud' → de plan-key (plan_X_weken) zodat het gekozen interval
 *    (4/8/12/16 weken) bewaard blijft i.p.v. bij herladen terug te vallen op
 *    de default.
 *  - 'preventieve_onkruid' → 'preventieve_onkruidbeheersing' (de bot prijst
 *    preventieve uitsluitend op die key).
 */
export function dashboardSubDienstenToDb(
  sub: SubDienst[],
  onderhoudWeken: 4 | 8 | 12 | 16,
): string[] {
  return sub.map((s) => {
    if (s === 'onderhoud') return onderhoudWekenToPlanKey(onderhoudWeken)
    if (s === 'preventieve_onkruid') return 'preventieve_onkruidbeheersing'
    return s
  })
}
