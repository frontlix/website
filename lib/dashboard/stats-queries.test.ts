import { describe, it, expect, vi, beforeEach } from 'vitest'

const { builder, mockFrom } = vi.hoisted(() => {
  type Builder = {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    gte: ReturnType<typeof vi.fn>
    lte: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    or: ReturnType<typeof vi.fn>
    not: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
  }
  const builder = {} as Builder
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lte = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.or = vi.fn(() => builder)
  builder.not = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))

  const mockFrom = vi.fn(() => builder)
  return { builder, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import {
  countLeads,
  countConverted,
  avgOfferteWaarde,
  avgReactietijdMs,
} from './stats-queries'

const PERIOD_MAY = { from: '2026-05-01', to: '2026-05-31T23:59:59Z' }
const PERIOD_ALL = { from: null, to: '2026-05-31T23:59:59Z' }

function resetBuilder() {
  builder.select.mockClear()
  builder.eq.mockClear()
  builder.gte.mockClear()
  builder.lte.mockClear()
  builder.in.mockClear()
  builder.or.mockClear()
  builder.not.mockClear()
  builder.order.mockClear()
  builder.limit.mockClear()
  mockFrom.mockClear()
  mockFrom.mockReturnValue(builder)
}

describe('countLeads', () => {
  beforeEach(resetBuilder)

  it('met from: filtert op aangemaakt >= from', async () => {
    builder.gte.mockReturnValueOnce(Promise.resolve({ count: 42, error: null, data: null }))

    const result = await countLeads(PERIOD_MAY)

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(builder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(builder.gte).toHaveBeenCalledWith('aangemaakt', '2026-05-01')
    expect(result).toBe(42)
  })

  it('met from=null (all-time): geen gte filter', async () => {
    builder.select.mockReturnValueOnce(Promise.resolve({ count: 200, error: null, data: null }))

    const result = await countLeads(PERIOD_ALL)

    expect(builder.gte).not.toHaveBeenCalled()
    expect(result).toBe(200)
  })

  it('returnt 0 bij error', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({ count: null, error: { message: 'oops' }, data: null })
    )
    expect(await countLeads(PERIOD_MAY)).toBe(0)
  })
})

describe('countConverted', () => {
  beforeEach(resetBuilder)

  it('filtert op niet-null akkoord_op OR afspraak_geboekt_op binnen periode', async () => {
    builder.gte.mockReturnValueOnce(Promise.resolve({ count: 7, error: null, data: null }))

    const result = await countConverted(PERIOD_MAY)

    expect(builder.or).toHaveBeenCalledWith(
      'akkoord_op.not.is.null,afspraak_geboekt_op.not.is.null'
    )
    expect(builder.gte).toHaveBeenCalledWith('aangemaakt', '2026-05-01')
    expect(result).toBe(7)
  })
})

describe('avgOfferteWaarde', () => {
  beforeEach(resetBuilder)

  it('berekent gemiddelde van totaal_prijs over leads in periode', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { totaal_prijs: 100 },
          { totaal_prijs: 200 },
          { totaal_prijs: 300 },
        ],
        error: null,
      })
    )

    const result = await avgOfferteWaarde(PERIOD_MAY)
    expect(result).toBe(200)
  })

  it('negeert null totaal_prijs', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { totaal_prijs: 100 },
          { totaal_prijs: null },
          { totaal_prijs: 300 },
        ],
        error: null,
      })
    )

    expect(await avgOfferteWaarde(PERIOD_MAY)).toBe(200)
  })

  it('returnt null als geen rijen met prijs', async () => {
    builder.gte.mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
    expect(await avgOfferteWaarde(PERIOD_MAY)).toBeNull()
  })
})

describe('avgReactietijdMs', () => {
  beforeEach(resetBuilder)

  it('berekent gemiddelde tijd tussen lead.aangemaakt en eerste uitgaande bericht', async () => {
    const leadsBuilder: any = {
      select: vi.fn(() => leadsBuilder),
      gte: vi.fn(() =>
        Promise.resolve({
          data: [
            { lead_id: 'L1', aangemaakt: '2026-05-01T10:00:00Z' },
            { lead_id: 'L2', aangemaakt: '2026-05-02T10:00:00Z' },
          ],
          error: null,
        })
      ),
    }
    const berichtenBuilder: any = {
      select: vi.fn(() => berichtenBuilder),
      eq: vi.fn(() => berichtenBuilder),
      in: vi.fn(() =>
        Promise.resolve({
          data: [
            { lead_id: 'L1', timestamp: '2026-05-01T10:30:00Z' },
            { lead_id: 'L1', timestamp: '2026-05-01T11:00:00Z' },
            { lead_id: 'L2', timestamp: '2026-05-02T12:00:00Z' },
          ],
          error: null,
        })
      ),
    }
    ;(mockFrom.mockImplementation as any)((table: string) => {
      if (table === 'leads') return leadsBuilder
      if (table === 'berichten') return berichtenBuilder
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await avgReactietijdMs(PERIOD_MAY)
    expect(result).toBe(4500000)
  })

  it('negeert leads zonder uitgaande bericht', async () => {
    const leadsBuilder: any = {
      select: vi.fn(() => leadsBuilder),
      gte: vi.fn(() =>
        Promise.resolve({
          data: [
            { lead_id: 'L1', aangemaakt: '2026-05-01T10:00:00Z' },
            { lead_id: 'L2', aangemaakt: '2026-05-02T10:00:00Z' },
          ],
          error: null,
        })
      ),
    }
    const berichtenBuilder: any = {
      select: vi.fn(() => berichtenBuilder),
      eq: vi.fn(() => berichtenBuilder),
      in: vi.fn(() =>
        Promise.resolve({
          data: [
            { lead_id: 'L1', timestamp: '2026-05-01T10:30:00Z' },
          ],
          error: null,
        })
      ),
    }
    ;(mockFrom.mockImplementation as any)((table: string) => {
      if (table === 'leads') return leadsBuilder
      if (table === 'berichten') return berichtenBuilder
      throw new Error(`unexpected: ${table}`)
    })

    const result = await avgReactietijdMs(PERIOD_MAY)
    expect(result).toBe(1800000)
  })

  it('returnt null als geen leads matchen', async () => {
    const leadsBuilder: any = {
      select: vi.fn(() => leadsBuilder),
      gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }
    ;(mockFrom.mockImplementation as any)(() => leadsBuilder)
    expect(await avgReactietijdMs(PERIOD_MAY)).toBeNull()
  })
})
