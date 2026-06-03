import { describe, it, expect, vi, beforeEach } from 'vitest'

const { builder, mockFrom } = vi.hoisted(() => {
  type Builder = {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    gte: ReturnType<typeof vi.fn>
    lt: ReturnType<typeof vi.fn>
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
  builder.lt = vi.fn(() => builder)
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
  statusVerdeling,
  categorieVerdeling,
  leadsPerDag,
  topTags,
} from './stats-queries'

const PERIOD_MAY = { from: '2026-05-01', to: '2026-05-31T23:59:59Z' }
const PERIOD_ALL = { from: null, to: '2026-05-31T23:59:59Z' }

function resetBuilder() {
  builder.select.mockClear()
  builder.eq.mockClear()
  builder.gte.mockClear()
  builder.lt.mockClear()
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
    // Terminal call met from+to is .lt() (na .gte()), daar landt de Promise.
    builder.lt.mockReturnValueOnce(Promise.resolve({ count: 42, error: null, data: null }))

    const result = await countLeads(PERIOD_MAY)

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(builder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(builder.gte).toHaveBeenCalledWith('aangemaakt', '2026-05-01')
    expect(result).toBe(42)
  })

  it('met from=null (all-time): geen gte filter', async () => {
    // From=null → alleen .lt() wordt aangeroepen, dat is hier de terminal.
    builder.lt.mockReturnValueOnce(Promise.resolve({ count: 200, error: null, data: null }))

    const result = await countLeads(PERIOD_ALL)

    expect(builder.gte).not.toHaveBeenCalled()
    expect(result).toBe(200)
  })

  it('returnt 0 bij error', async () => {
    builder.lt.mockReturnValueOnce(
      Promise.resolve({ count: null, error: { message: 'oops' }, data: null })
    )
    expect(await countLeads(PERIOD_MAY)).toBe(0)
  })
})

describe('countConverted', () => {
  beforeEach(resetBuilder)

  it('filtert op niet-null akkoord_op OR afspraak_geboekt_op binnen periode', async () => {
    builder.lt.mockReturnValueOnce(Promise.resolve({ count: 7, error: null, data: null }))

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
    builder.lt.mockReturnValueOnce(
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
    builder.lt.mockReturnValueOnce(
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
    builder.lt.mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
    expect(await avgOfferteWaarde(PERIOD_MAY)).toBeNull()
  })
})

describe('avgReactietijdMs', () => {
  beforeEach(resetBuilder)

  it('berekent gemiddelde tijd tussen lead.aangemaakt en eerste uitgaande bericht', async () => {
    const leadsBuilder: any = {
      select: vi.fn(() => leadsBuilder),
      gte: vi.fn(() => leadsBuilder),
      lt: vi.fn(() =>
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
      gte: vi.fn(() => leadsBuilder),
      lt: vi.fn(() =>
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
      gte: vi.fn(() => leadsBuilder),
      lt: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }
    ;(mockFrom.mockImplementation as any)(() => leadsBuilder)
    expect(await avgReactietijdMs(PERIOD_MAY)).toBeNull()
  })
})

describe('statusVerdeling', () => {
  beforeEach(resetBuilder)

  it('groepeert leads op dashboard_status, NULL als "Geen status"', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { dashboard_status: 'open' },
          { dashboard_status: 'open' },
          { dashboard_status: 'opgevolgd' },
          { dashboard_status: null },
        ],
        error: null,
      })
    )

    const result = await statusVerdeling(PERIOD_MAY)
    expect(result).toEqual([
      { status: 'open', count: 2 },
      { status: 'opgevolgd', count: 1 },
      { status: null, count: 1 },
    ])
  })

  it('returnt lege array bij geen data', async () => {
    builder.gte.mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
    expect(await statusVerdeling(PERIOD_MAY)).toEqual([])
  })
})

describe('categorieVerdeling', () => {
  beforeEach(resetBuilder)

  it('groepeert op hoofdcategorie, null als "Onbekend"', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { hoofdcategorie: 'kunststof' },
          { hoofdcategorie: 'kunststof' },
          { hoofdcategorie: 'schilderwerk' },
          { hoofdcategorie: null },
        ],
        error: null,
      })
    )

    const result = await categorieVerdeling(PERIOD_MAY)
    expect(result).toEqual([
      { categorie: 'kunststof', count: 2 },
      { categorie: 'schilderwerk', count: 1 },
      { categorie: 'Onbekend', count: 1 },
    ])
  })
})

describe('leadsPerDag', () => {
  beforeEach(resetBuilder)

  it('groepeert leads op dag (laatste 30 dagen), gevuld met 0 voor lege dagen', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { aangemaakt: '2026-05-05T10:00:00Z' },
          { aangemaakt: '2026-05-05T15:00:00Z' },
          { aangemaakt: '2026-05-04T08:00:00Z' },
        ],
        error: null,
      })
    )

    const fixedNow = new Date('2026-05-05T23:59:59Z')
    const result = await leadsPerDag(fixedNow, 30)

    expect(result.length).toBe(30)
    expect(result[result.length - 1]).toEqual({ date: '2026-05-05', count: 2 })
    expect(result[result.length - 2]).toEqual({ date: '2026-05-04', count: 1 })
    expect(result[0].count).toBe(0)
  })
})

describe('topTags', () => {
  beforeEach(resetBuilder)

  it('telt tag-frequenties via lead_tags JOIN leads, top 10 DESC', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { tags: { naam: 'hot' }, leads: { aangemaakt: '2026-05-05T10:00:00Z' } },
          { tags: { naam: 'hot' }, leads: { aangemaakt: '2026-05-06T10:00:00Z' } },
          { tags: { naam: 'hot' }, leads: { aangemaakt: '2026-05-07T10:00:00Z' } },
          { tags: { naam: 'spoed' }, leads: { aangemaakt: '2026-05-08T10:00:00Z' } },
        ],
        error: null,
      })
    )

    const result = await topTags(PERIOD_MAY, 10)
    expect(result).toEqual([
      { naam: 'hot', count: 3 },
      { naam: 'spoed', count: 1 },
    ])
  })

  it('respecteert limit', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { tags: { naam: 'a' }, leads: { aangemaakt: '2026-05-05T10:00:00Z' } },
          { tags: { naam: 'b' }, leads: { aangemaakt: '2026-05-06T10:00:00Z' } },
          { tags: { naam: 'c' }, leads: { aangemaakt: '2026-05-07T10:00:00Z' } },
        ],
        error: null,
      })
    )

    expect(await topTags(PERIOD_MAY, 2)).toHaveLength(2)
  })
})
