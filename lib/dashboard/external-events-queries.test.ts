import { describe, it, expect, vi, beforeEach } from 'vitest'

const { builder, mockFrom } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  // `.lt` is de terminal call in de chain: hij resolvet de query-Promise.
  builder.lt = vi.fn(() => Promise.resolve({ data: [], error: null }))
  const mockFrom = vi.fn(() => builder)
  return { builder, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import {
  getExternalEventsForMonth,
  getExternalEventsForRange,
} from './external-events-queries'

function resolveWith(rows: unknown[]) {
  builder.lt.mockReturnValueOnce(Promise.resolve({ data: rows, error: null }))
}

function reset() {
  builder.select.mockClear()
  builder.gte.mockClear()
  builder.lt.mockClear()
  builder.lt.mockReturnValue(Promise.resolve({ data: [], error: null }))
  mockFrom.mockClear()
  mockFrom.mockReturnValue(builder)
}

describe('getExternalEventsForMonth', () => {
  beforeEach(reset)

  it('queryt external_calendar_events op start_at binnen de maand (Amsterdam-grenzen)', async () => {
    await getExternalEventsForMonth(2026, 5)
    expect(mockFrom).toHaveBeenCalledWith('external_calendar_events')
    // 01 mei 00:00 Amsterdam (CEST) = 30 apr 22:00 UTC.
    expect(builder.gte).toHaveBeenCalledWith('start_at', '2026-04-30T22:00:00.000Z')
    // exclusieve bovengrens = 01 jun 00:00 Amsterdam = 31 mei 22:00 UTC.
    expect(builder.lt).toHaveBeenCalledWith('start_at', '2026-05-31T22:00:00.000Z')
  })

  it('december: rolt netjes naar 01 jan van het volgende jaar', async () => {
    await getExternalEventsForMonth(2026, 12)
    // 01 dec 00:00 Amsterdam (CET) = 30 nov 23:00 UTC.
    expect(builder.gte).toHaveBeenCalledWith('start_at', '2026-11-30T23:00:00.000Z')
    // exclusieve bovengrens = 01 jan 2027 00:00 Amsterdam = 31 dec 23:00 UTC.
    expect(builder.lt).toHaveBeenCalledWith('start_at', '2026-12-31T23:00:00.000Z')
  })

  it('mapt rijen naar ExternalEvent', async () => {
    resolveWith([
      {
        google_event_id: 'g1',
        summary: 'Tandarts',
        start_at: '2026-05-13T07:00:00.000Z',
        end_at: '2026-05-13T08:00:00.000Z',
        all_day: false,
        last_synced_at: '2026-05-12T10:00:00.000Z',
      },
    ])
    const result = await getExternalEventsForMonth(2026, 5)
    expect(result).toEqual([
      {
        google_event_id: 'g1',
        summary: 'Tandarts',
        start_at: '2026-05-13T07:00:00.000Z',
        end_at: '2026-05-13T08:00:00.000Z',
        all_day: false,
      },
    ])
  })

  it('returnt lege array bij error', async () => {
    builder.lt.mockReturnValueOnce(Promise.resolve({ data: null, error: { message: 'oops' } }))
    expect(await getExternalEventsForMonth(2026, 5)).toEqual([])
  })
})

describe('getExternalEventsForRange', () => {
  beforeEach(reset)

  it('queryt op start_at tussen de Amsterdam-dagkeys van de range', async () => {
    // startKey/endKey zijn al Amsterdam-dagkeys (YYYY-MM-DD), zoals de page levert.
    await getExternalEventsForRange('2026-06-08', '2026-06-16')
    expect(mockFrom).toHaveBeenCalledWith('external_calendar_events')
    // 08 jun 00:00 Amsterdam (CEST) = 07 jun 22:00 UTC.
    expect(builder.gte).toHaveBeenCalledWith('start_at', '2026-06-07T22:00:00.000Z')
    // exclusieve bovengrens = 17 jun 00:00 Amsterdam = 16 jun 22:00 UTC.
    expect(builder.lt).toHaveBeenCalledWith('start_at', '2026-06-16T22:00:00.000Z')
  })

  it('mapt rijen naar ExternalEvent (all_day + geen end)', async () => {
    resolveWith([
      {
        google_event_id: 'g2',
        summary: null,
        start_at: '2026-06-11T00:00:00.000Z',
        end_at: null,
        all_day: true,
        last_synced_at: '2026-06-10T09:00:00.000Z',
      },
    ])
    const result = await getExternalEventsForRange('2026-06-08', '2026-06-16')
    expect(result).toEqual([
      {
        google_event_id: 'g2',
        summary: null,
        start_at: '2026-06-11T00:00:00.000Z',
        end_at: null,
        all_day: true,
      },
    ])
  })
})
