import { describe, it, expect } from 'vitest'
import { eur, pctOf, mapAnalyse, type AnalyseServerData } from './analyse-mappers'

const base: AnalyseServerData = {
  periodKey: 'deze-maand',
  omzet: 18420,
  omzetDoelMaand: 25000,
  // deze-maand → dagelijkse buckets (zie omzetBuckets).
  trend: [
    { bucket: '2026-06-01', omzet: 8400 },
    { bucket: '2026-06-02', omzet: 9200 },
    { bucket: '2026-06-03', omzet: 23100 },
  ],
  leadsTotaal: 142,
  offertesVerstuurd: 98,
  converted: 63,
  avgOfferte: 847,
  avgReactieMs: 47000,
  diensten: [
    { categorie: 'Terras reinigen', omzet: 24300 },
    { categorie: 'Oprit & paden', omzet: 17100 },
  ],
}

describe('eur', () => {
  it('formats with nl-NL thousands separator, no decimals', () => {
    expect(eur(18420)).toBe('€ 18.420')
    expect(eur(0)).toBe('€ 0')
  })
})

describe('pctOf', () => {
  it('rounds part/whole to a percentage, 0 when whole is 0', () => {
    expect(pctOf(63, 142)).toBe(44)
    expect(pctOf(5, 0)).toBe(0)
  })
})

describe('mapAnalyse', () => {
  const v = mapAnalyse(base)

  it('hero shows formatted omzet + goal pct (maand: omzet/doel)', () => {
    expect(v.hero.omzetLabel).toBe('€ 18.420')
    expect(v.hero.goalPct).toBe(74) // 18420 / 25000
  })

  it('scales the monthly goal for kwartaal (×3) and jaar (×12)', () => {
    expect(mapAnalyse({ ...base, periodKey: 'dit-kwartaal' }).hero.goalPct)
      .toBe(pctOf(18420, 75000))
    expect(mapAnalyse({ ...base, periodKey: 'dit-jaar' }).hero.goalPct)
      .toBe(pctOf(18420, 300000))
  })

  it('builds the 3-step funnel with pct relative to leads', () => {
    expect(v.funnel.map((f) => [f.label, f.value, f.pct])).toEqual([
      ['Leads', '142', 100],
      ['Offertes', '98', 69],
      ['Akkoord', '63', 44],
    ])
  })

  it('builds 4 KPIs incl. the real "Offertes verstuurd" swap (no "Bot zelf af")', () => {
    expect(v.kpis.map((k) => k.label)).toEqual([
      'Conversie',
      'Offertes verstuurd',
      '⌀ Offerte',
      '⌀ Reactietijd',
    ])
    expect(v.kpis[0].value).toBe('44%')
    expect(v.kpis[2].value).toBe('€ 847')
    expect(v.kpis[3].value).toBe('47s')
  })

  it('renders "—" for null KPI values', () => {
    const n = mapAnalyse({ ...base, avgOfferte: null, avgReactieMs: null })
    expect(n.kpis[2].value).toBe('—')
    expect(n.kpis[3].value).toBe('—')
  })

  it('computes diensten pct relative to the largest', () => {
    expect(v.diensten.map((d) => [d.label, d.value, d.pct])).toEqual([
      ['Terras reinigen', '€ 24.300', 100],
      ['Oprit & paden', '€ 17.100', 70],
    ])
  })

  it('exposes the raw trend series for the area chart', () => {
    expect(v.trendSeries).toEqual([8400, 9200, 23100])
  })

  it('maand-weergave: dag-labels (dag-van-maand) i.p.v. maand-labels', () => {
    expect(v.monthLabels).toEqual(['1', '2', '3'])
  })

  it('kwartaal/jaar: smalle maand-labels per bucket (nl-NL)', () => {
    const m = mapAnalyse({
      ...base,
      periodKey: 'dit-kwartaal',
      trend: [
        { bucket: '2025-06', omzet: 8400 },
        { bucket: '2025-07', omzet: 9200 },
        { bucket: '2025-08', omzet: 23100 },
      ],
    })
    expect(m.monthLabels).toEqual(['J', 'J', 'A']) // jun, jul, aug
  })
})
