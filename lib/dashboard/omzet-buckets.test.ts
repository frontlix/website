import { describe, it, expect } from 'vitest'
import { omzetBuckets, bucketGranulariteit, type OmzetRow } from './omzet-buckets'

// Vaste "nu" zodat de tests deterministisch zijn: 5 juni 2026 (Q2).
const NOW = new Date('2026-06-05T12:00:00.000Z')

describe('bucketGranulariteit', () => {
  it('dag voor week en maand, maand voor de rest', () => {
    expect(bucketGranulariteit('deze-week')).toBe('dag')
    expect(bucketGranulariteit('deze-maand')).toBe('dag')
    expect(bucketGranulariteit('dit-kwartaal')).toBe('maand')
    expect(bucketGranulariteit('dit-jaar')).toBe('maand')
    expect(bucketGranulariteit('all-time')).toBe('maand')
  })
})

describe('omzetBuckets', () => {
  it('deze-maand: dagelijkse buckets van 1 t/m vandaag', () => {
    const rows: OmzetRow[] = [
      { wonDate: '2026-06-02T09:00:00.000Z', prijs: 100 },
      { wonDate: '2026-06-02T15:00:00.000Z', prijs: 50 },
      { wonDate: '2026-06-05T08:00:00.000Z', prijs: 200 },
    ]
    const out = omzetBuckets(rows, 'deze-maand', NOW)
    expect(out.map((b) => b.bucket)).toEqual([
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05',
    ])
    expect(out.find((b) => b.bucket === '2026-06-02')!.omzet).toBe(150)
    expect(out.find((b) => b.bucket === '2026-06-05')!.omzet).toBe(200)
    expect(out.find((b) => b.bucket === '2026-06-01')!.omzet).toBe(0)
  })

  it('dit-kwartaal: 3 maand-buckets (apr/mei/jun) met sommen', () => {
    const rows: OmzetRow[] = [
      { wonDate: '2026-04-10T09:00:00.000Z', prijs: 300 },
      { wonDate: '2026-05-20T09:00:00.000Z', prijs: 400 },
      { wonDate: '2026-05-25T09:00:00.000Z', prijs: 100 },
    ]
    const out = omzetBuckets(rows, 'dit-kwartaal', NOW)
    expect(out.map((b) => b.bucket)).toEqual(['2026-04', '2026-05', '2026-06'])
    expect(out[0].omzet).toBe(300)
    expect(out[1].omzet).toBe(500)
    expect(out[2].omzet).toBe(0)
  })

  it('dit-jaar: maand-buckets year-to-date (jan t/m jun)', () => {
    const out = omzetBuckets([], 'dit-jaar', NOW)
    expect(out.map((b) => b.bucket)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    ])
    expect(out.every((b) => b.omzet === 0)).toBe(true)
  })

  it('negeert rijen buiten het venster en ongeldige datums', () => {
    const rows: OmzetRow[] = [
      { wonDate: '2026-03-30T12:00:00.000Z', prijs: 999 }, // 30 mrt NL, vóór Q2 → buiten
      { wonDate: 'onzin', prijs: 999 },                    // ongeldig
      { wonDate: '2026-04-01T01:00:00.000Z', prijs: 10 },  // binnen
    ]
    const out = omzetBuckets(rows, 'dit-kwartaal', NOW)
    const totaal = out.reduce((s, b) => s + b.omzet, 0)
    expect(totaal).toBe(10)
  })
})
