import { getDashboardSupabase } from './supabase-server'
import { FALLBACK_PRICING, type ManualOffertePricing } from './pricing-types'
import { buildPricingFromRuleKeys } from './offerte-snapshot'

export { FALLBACK_PRICING, type ManualOffertePricing }

/**
 * Leest pricing uit Supabase met fallback op de hardcoded defaults. Zo
 * blijft de wizard werken voor tenants die nog geen rijen in
 * `pricing_rules` hebben staan (greenfield install).
 */
export async function getManualOffertePricing(): Promise<ManualOffertePricing> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('rule_key, waarde')

  if (error || !data) return FALLBACK_PRICING

  const map = new Map<string, number>()
  for (const row of data as Array<{ rule_key: string; waarde: number }>) {
    map.set(row.rule_key, Number(row.waarde))
  }

  // De property-namen van ManualOffertePricing wijken af van de rule_key's in
  // de pricing_rules-tabel. De canonieke vertaling staat in buildPricingFromRuleKeys
  // (offerte-snapshot.ts), zodat dezelfde mapping ook door de prijs-snapshot
  // gebruikt kan worden (één bron van waarheid).
  return buildPricingFromRuleKeys(map)
}
