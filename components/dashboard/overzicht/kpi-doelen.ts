/**
 * KPI-doelen voor de overzicht-pagina. Pure config (geen JSX), apart van
 * kpi-types.tsx zodat data-helpers (overzicht-data.ts) en hun unit-tests dit
 * kunnen importeren zonder de React/JSX-iconen van kpi-types mee te trekken.
 *
 * `omzet_maand` is de v1-default voor de progress-donut; het ingestelde
 * maand-omzetdoel (tenant_settings.omzet_doel_maand) overschrijft deze waarde
 * wanneer aanwezig (zie buildKpiMetrics). De overige doelen zijn nog vast (v1).
 */
export const KPI_DOELEN = {
  omzet_maand: 25_000,
  leads_week: 18,
  conversie_pct: 70,
  reactietijd_doel_s: 60,
} as const
