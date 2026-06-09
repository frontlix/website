import { describe, it, expect, vi, beforeEach } from 'vitest'

const { builder, mockFrom } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.not = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  // `.lte` is de terminal call in de chain: hij resolvet de query-Promise.
  builder.lte = vi.fn(() => Promise.resolve({ data: [], error: null }))
  const mockFrom = vi.fn(() => builder)
  return { builder, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import { getAppointmentsForMonth, getAppointmentsForRange } from './agenda-queries'

function resolveWith(rows: unknown[]) {
  builder.lte.mockReturnValueOnce(Promise.resolve({ data: rows, error: null }))
}

function reset() {
  builder.select.mockClear()
  builder.not.mockClear()
  builder.gte.mockClear()
  builder.lte.mockClear()
  builder.lte.mockReturnValue(Promise.resolve({ data: [], error: null }))
  mockFrom.mockClear()
  mockFrom.mockReturnValue(builder)
}

describe('getAppointmentsForMonth', () => {
  beforeEach(reset)

  it('queryt leads op afspraak_datum binnen de maand', async () => {
    await getAppointmentsForMonth(2026, 5)
    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(builder.not).toHaveBeenCalledWith('afspraak_datum', 'is', null)
    expect(builder.gte).toHaveBeenCalledWith('afspraak_datum', '2026-05-01')
    expect(builder.lte).toHaveBeenCalledWith('afspraak_datum', '2026-05-31')
  })

  it('december: maand-grenzen blijven binnen december', async () => {
    await getAppointmentsForMonth(2026, 12)
    expect(builder.gte).toHaveBeenCalledWith('afspraak_datum', '2026-12-01')
    expect(builder.lte).toHaveBeenCalledWith('afspraak_datum', '2026-12-31')
  })

  it('plaatst de afspraak op afspraak_datum + starttijd, niet op het boekmoment', async () => {
    resolveWith([
      {
        lead_id: 'L1',
        naam: 'Jan',
        afspraak_datum: '2026-05-13',
        afspraak_starttijd: '09:00',
        // boekmoment moet genegeerd worden:
        afspraak_geboekt_op: '2026-05-01T12:00:00.000Z',
      },
    ])
    const result = await getAppointmentsForMonth(2026, 5)
    expect(result).toHaveLength(1)
    // 13 mei 09:00 Amsterdam (CEST, +2u) = 07:00 UTC
    expect(result[0].afspraak_geboekt_op).toBe('2026-05-13T07:00:00.000Z')
  })

  it('filtert leads zonder afspraakdatum eruit (geen echte afspraak)', async () => {
    resolveWith([
      {
        lead_id: 'NODATE',
        naam: 'Offerte-lead',
        afspraak_datum: null,
        afspraak_starttijd: null,
        afspraak_geboekt_op: '2026-05-07T10:00:00.000Z',
      },
      { lead_id: 'OK', naam: 'Echt', afspraak_datum: '2026-05-20', afspraak_starttijd: '10:00' },
    ])
    const result = await getAppointmentsForMonth(2026, 5)
    expect(result.map((r) => r.lead_id)).toEqual(['OK'])
  })

  it('returnt lege array bij error', async () => {
    builder.lte.mockReturnValueOnce(Promise.resolve({ data: null, error: { message: 'oops' } }))
    expect(await getAppointmentsForMonth(2026, 5)).toEqual([])
  })
})

describe('getAppointmentsForRange', () => {
  beforeEach(reset)

  it('queryt op afspraak_datum tussen de Amsterdam-dagkeys van de range', async () => {
    // queryStart/queryEnd zijn UTC met buffer (zoals parseWeekParam levert).
    await getAppointmentsForRange('2026-06-07T22:00:00.000Z', '2026-06-15T22:00:00.000Z')
    expect(builder.not).toHaveBeenCalledWith('afspraak_datum', 'is', null)
    // 07 jun 22:00 UTC = 08 jun 00:00 NL; 15 jun 22:00 UTC = 16 jun NL
    expect(builder.gte).toHaveBeenCalledWith('afspraak_datum', '2026-06-08')
    expect(builder.lte).toHaveBeenCalledWith('afspraak_datum', '2026-06-16')
  })

  it('synthetiseert het afspraakmoment uit datum + starttijd', async () => {
    resolveWith([
      { lead_id: 'W1', naam: 'Week', afspraak_datum: '2026-06-11', afspraak_starttijd: '08:00' },
    ])
    const result = await getAppointmentsForRange(
      '2026-06-07T22:00:00.000Z',
      '2026-06-15T22:00:00.000Z',
    )
    // 11 jun 08:00 Amsterdam (CEST) = 06:00 UTC
    expect(result[0].afspraak_geboekt_op).toBe('2026-06-11T06:00:00.000Z')
  })
})
