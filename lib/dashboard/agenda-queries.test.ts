import { describe, it, expect, vi, beforeEach } from 'vitest'

const { builder, mockFrom } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lt = vi.fn(() => builder)
  builder.not = vi.fn(() => builder)
  builder.order = vi.fn(() => Promise.resolve({ data: [], error: null }))
  const mockFrom = vi.fn(() => builder)
  return { builder, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import { getAppointmentsForMonth } from './agenda-queries'

function reset() {
  builder.select.mockClear()
  builder.gte.mockClear()
  builder.lt.mockClear()
  builder.not.mockClear()
  builder.order.mockClear()
  builder.order.mockReturnValue(Promise.resolve({ data: [], error: null }))
  mockFrom.mockClear()
  mockFrom.mockReturnValue(builder)
}

describe('getAppointmentsForMonth', () => {
  beforeEach(reset)

  it('queryt leads met afspraak_geboekt_op in een tijdzone-bewuste range', async () => {
    builder.order.mockReturnValueOnce(
      Promise.resolve({
        data: [
          {
            lead_id: 'L1',
            naam: 'Jan',
            telefoon: '06-1',
            afspraak_geboekt_op: '2026-05-05T10:00:00Z',
            dashboard_status: 'opgevolgd',
            status: 'akkoord',
          },
        ],
        error: null,
      })
    )

    const result = await getAppointmentsForMonth(2026, 5)

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(builder.not).toHaveBeenCalledWith('afspraak_geboekt_op', 'is', null)
    // UTC-grenzen wijden 1 dag aan beide kanten om Europe/Amsterdam (CEST/CET)
    // shifts op te vangen
    expect(builder.gte).toHaveBeenCalledWith('afspraak_geboekt_op', '2026-04-30T00:00:00.000Z')
    expect(builder.lt).toHaveBeenCalledWith('afspraak_geboekt_op', '2026-06-02T00:00:00.000Z')
    expect(builder.order).toHaveBeenCalledWith('afspraak_geboekt_op', { ascending: true })
    expect(result).toHaveLength(1)
    expect(result[0].lead_id).toBe('L1')
  })

  it('december → januari: lt-grens loopt door naar volgend jaar', async () => {
    await getAppointmentsForMonth(2026, 12)
    expect(builder.gte).toHaveBeenCalledWith('afspraak_geboekt_op', '2026-11-30T00:00:00.000Z')
    expect(builder.lt).toHaveBeenCalledWith('afspraak_geboekt_op', '2027-01-02T00:00:00.000Z')
  })

  it('houdt afspraak die in UTC laat-april valt maar in NL al mei is', async () => {
    // 30 april 22:30 UTC = 1 mei 00:30 in NL (zomertijd)
    builder.order.mockReturnValueOnce(
      Promise.resolve({
        data: [
          {
            lead_id: 'EDGE',
            naam: 'Edge',
            telefoon: '06-9',
            afspraak_geboekt_op: '2026-04-30T22:30:00Z',
            dashboard_status: null,
            status: 'akkoord',
          },
        ],
        error: null,
      })
    )

    const result = await getAppointmentsForMonth(2026, 5)
    expect(result).toHaveLength(1)
    expect(result[0].lead_id).toBe('EDGE')
  })

  it('filtert UTC-laat-mei afspraak die in NL al juni is uit', async () => {
    // 31 mei 22:30 UTC = 1 juni 00:30 in NL → hoort bij juni, niet mei
    builder.order.mockReturnValueOnce(
      Promise.resolve({
        data: [
          {
            lead_id: 'JUNE',
            naam: 'June',
            telefoon: '06-1',
            afspraak_geboekt_op: '2026-05-31T22:30:00Z',
            dashboard_status: null,
            status: 'akkoord',
          },
        ],
        error: null,
      })
    )

    const result = await getAppointmentsForMonth(2026, 5)
    expect(result).toHaveLength(0)
  })

  it('returnt lege array bij error', async () => {
    builder.order.mockReturnValueOnce(
      Promise.resolve({ data: null, error: { message: 'oops' } })
    )
    expect(await getAppointmentsForMonth(2026, 5)).toEqual([])
  })
})
