import { getDashboardSupabase } from './supabase-server'
import { FALLBACK_PRICING, type ManualOffertePricing } from './pricing-types'

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
  // de pricing_rules-tabel; hieronder mappen we ze expliciet op de ECHTE
  // tabel-keys (eerder stond hier de codenaam, waardoor alles stil op de
  // fallback draaide en tenant-prijswijzigingen werden genegeerd).
  return {
    reiniging_per_m2:                    map.get('reinigen_per_m2') ?? FALLBACK_PRICING.reiniging_per_m2,
    reinigen_dagprijs_onder_100m2:       map.get('reinigen_dagprijs_onder_100m2') ?? FALLBACK_PRICING.reinigen_dagprijs_onder_100m2,
    arbeid_invegen_normaal_per_m2:       map.get('invegen_arbeid_normaal_per_m2') ?? FALLBACK_PRICING.arbeid_invegen_normaal_per_m2,
    arbeid_invegen_onkruidwerend_per_m2: map.get('invegen_arbeid_onkruidwerend_per_m2') ?? FALLBACK_PRICING.arbeid_invegen_onkruidwerend_per_m2,
    voegzand_normaal_per_zak:            map.get('voegzand_normaal_per_zak') ?? FALLBACK_PRICING.voegzand_normaal_per_zak,
    voegzand_onkruidwerend_per_zak:      map.get('voegzand_onkruidwerend_per_zak') ?? FALLBACK_PRICING.voegzand_onkruidwerend_per_zak,
    voegzand_m2_per_zak:                 map.get('voegzand_m2_per_zak') ?? FALLBACK_PRICING.voegzand_m2_per_zak,
    // Preventieve (eenmalige) onkruid heeft geen eigen tabel-key; valt terug op
    // de 'langer'-staffel zoals SS die voor losse onkruidbeheersing hanteert.
    preventieve_onkruid_per_m2:          map.get('onkruid_per_m2_langer') ?? FALLBACK_PRICING.preventieve_onkruid_per_m2,
    beschermlaag_per_m2:                 map.get('beschermlaag_per_m2') ?? FALLBACK_PRICING.beschermlaag_per_m2,
    plan_4w_per_m2:                      map.get('onkruid_per_m2_4_weken') ?? FALLBACK_PRICING.plan_4w_per_m2,
    plan_8w_per_m2:                      map.get('onkruid_per_m2_8_weken') ?? FALLBACK_PRICING.plan_8w_per_m2,
    plan_12w_per_m2:                     map.get('onkruid_per_m2_12_weken') ?? FALLBACK_PRICING.plan_12w_per_m2,
    plan_16w_per_m2:                     map.get('onkruid_per_m2_langer') ?? FALLBACK_PRICING.plan_16w_per_m2,
    reiskosten_per_km:                   map.get('reiskosten_per_km') ?? FALLBACK_PRICING.reiskosten_per_km,
    reiskosten_drempel_km:               map.get('reiskosten_gratis_tot_km') ?? FALLBACK_PRICING.reiskosten_drempel_km,
    extra_arbeid_per_min:                map.get('extra_arbeid_per_minuut') ?? FALLBACK_PRICING.extra_arbeid_per_min,
    plantenafscherming_per_rol:          map.get('planten_afschermen_folie_per_rol') ?? FALLBACK_PRICING.plantenafscherming_per_rol,
  }
}
