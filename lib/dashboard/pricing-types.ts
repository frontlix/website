/**
 * Pure types + defaults voor manual-offerte pricing. Safe voor imports
 * vanuit client-components (geen next/headers of supabase-server hier).
 * Server-side DB-lookup zit in pricing-queries.ts.
 */

export type ManualOffertePricing = {
  reiniging_per_m2: number
  /** Vaste dagprijs reiniging voor oppervlakken < 100 m² (Schoon Straatje). */
  reinigen_dagprijs_onder_100m2: number
  arbeid_invegen_normaal_per_m2: number
  arbeid_invegen_onkruidwerend_per_m2: number
  voegzand_normaal_per_zak: number
  voegzand_onkruidwerend_per_zak: number
  /** Dekkingsfactor: hoeveel m² straatwerk je met 1 zak voegzand inveegt.
   *  Wordt gebruikt om het aantal zakken te suggereren in de wizard. */
  voegzand_m2_per_zak: number
  preventieve_onkruid_per_m2: number
  beschermlaag_per_m2: number
  plan_4w_per_m2: number
  plan_8w_per_m2: number
  plan_12w_per_m2: number
  plan_16w_per_m2: number
  reiskosten_per_km: number
  reiskosten_drempel_km: number
  extra_arbeid_per_min: number
  plantenafscherming_per_rol: number
}

export const FALLBACK_PRICING: ManualOffertePricing = {
  reiniging_per_m2: 3.95,
  reinigen_dagprijs_onder_100m2: 395,
  arbeid_invegen_normaal_per_m2: 0.9,
  arbeid_invegen_onkruidwerend_per_m2: 1.6,
  voegzand_normaal_per_zak: 2.9,
  voegzand_onkruidwerend_per_zak: 20.9,
  voegzand_m2_per_zak: 5,
  // Preventieve onkruid deelt de ">12 weken / langer"-staffel (onkruid_per_m2_langer),
  // net als plan_16w. Bot-prijslijst = 4,50/m². (Was 1,10: dat tarief bestaat
  // niet in de Schoon Straatje-bot-config.)
  preventieve_onkruid_per_m2: 4.5,
  beschermlaag_per_m2: 1.6,
  plan_4w_per_m2: 1.25,
  plan_8w_per_m2: 1.75,
  plan_12w_per_m2: 2.9,
  plan_16w_per_m2: 4.5,
  reiskosten_per_km: 0.23,
  reiskosten_drempel_km: 50,
  extra_arbeid_per_min: 1.2,
  plantenafscherming_per_rol: 8.5,
}
