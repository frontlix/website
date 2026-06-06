import { describe, it, expect } from 'vitest'
import { buildKpiMetrics } from './overzicht-data'
import { KPI_DOELEN } from '@/components/dashboard/overzicht/kpi-doelen'

// Minimale, complete input; alleen omzet-doel varieert per test.
const base = {
  omzetMaand: 1000,
  omzetMaandPrev: 0,
  leadsLast7d: 0,
  leadsPrev7d: 0,
  conversiePctLast30: 0,
  conversiePctPrev30: 0,
  reactietijdLast7S: 0,
  reactietijdPrev7S: 0,
}

describe('buildKpiMetrics — omzet-doel', () => {
  it('gebruikt het ingestelde maand-omzetdoel', () => {
    expect(buildKpiMetrics({ ...base, omzetDoelMaand: 2000 }).omzet.doel).toBe(2000)
  })
  it('valt terug op de default als doel null is (niet ingesteld)', () => {
    expect(buildKpiMetrics({ ...base, omzetDoelMaand: null }).omzet.doel).toBe(
      KPI_DOELEN.omzet_maand,
    )
  })
  it('valt terug op de default als omzetDoelMaand ontbreekt', () => {
    expect(buildKpiMetrics(base).omzet.doel).toBe(KPI_DOELEN.omzet_maand)
  })
})
