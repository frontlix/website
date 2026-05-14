import { getDashboardSupabase } from './supabase-server'
import {
  aggregateVolumes,
  countConverted,
  type LeadForImpact,
} from './pricing-impact'

export type PricingImpactBaseline = {
  /** Aantal recente leads in de berekening (kan minder dan target zijn). */
  leadCount: number
  /** ISO-datum van de oudste lead in de set (voor "13 apr – nu"-weergave). */
  periodStart: string | null
  /** ISO-datum van vandaag (eind-van-range). */
  periodEnd: string
  /** Som van totaal_prijs over de leads (baseline-omzet). */
  baselineRevenue: number
  /** Conversie als 0..1 (akkoord_op OF afspraak_geboekt_op gevuld). */
  baselineConversion: number
  /** Geaggregeerd volume per rule_key (gebruikt voor lineaire delta-berekening). */
  volumes: Record<string, number>
}

/**
 * Haal de laatste N leads op met de velden die nodig zijn voor de
 * "Wat als"-simulator op /instellingen?section=prijzen. Filtert op leads
 * met een ingevuld `totaal_prijs` (offerte is opgesteld) zodat de
 * baseline-omzet betekenisvol is.
 *
 * Haalt zelf óók de rule_keys op via `pricing_rules.select('rule_key')`
 * zodat de caller niet twee dingen hoeft te coördineren.
 */
export async function getPricingImpactBaseline(
  limit = 30,
): Promise<PricingImpactBaseline> {
  const supabase = await getDashboardSupabase()
  const [leadsRes, rulesRes] = await Promise.all([
    supabase
      .from('leads')
      .select(
        'm2, sub_diensten, voegzand_normaal_zakken, voegzand_onkruidwerend_zakken, extra_arbeid_minuten, extra_arbeid_personen, afstand_km, totaal_prijs, akkoord_op, afspraak_geboekt_op, aangemaakt',
      )
      .not('totaal_prijs', 'is', null)
      .order('aangemaakt', { ascending: false })
      .limit(limit),
    supabase.from('pricing_rules').select('rule_key'),
  ])
  const { data, error } = leadsRes
  const ruleKeys = (rulesRes.data as Array<{ rule_key: string }> | null)?.map((r) => r.rule_key) ?? []

  const periodEnd = new Date().toISOString()
  if (error || !data || data.length === 0) {
    return {
      leadCount: 0,
      periodStart: null,
      periodEnd,
      baselineRevenue: 0,
      baselineConversion: 0,
      volumes: Object.fromEntries(ruleKeys.map((k) => [k, 0])),
    }
  }

  const leads = data as unknown as LeadForImpact[]
  const volumes = aggregateVolumes(leads, ruleKeys)
  const baselineRevenue = leads.reduce(
    (s, l) => s + (Number(l.totaal_prijs) || 0),
    0,
  )
  const converted = countConverted(leads)
  const baselineConversion = leads.length > 0 ? converted / leads.length : 0
  // Oudste lead = laatste element (we sorteerden DESC)
  const oldest = leads[leads.length - 1]
  const periodStart = oldest?.aangemaakt ?? null

  return {
    leadCount: leads.length,
    periodStart,
    periodEnd,
    baselineRevenue,
    baselineConversion,
    volumes,
  }
}
