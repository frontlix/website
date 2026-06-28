import { describe, it, expect, vi, beforeEach } from 'vitest'

const { builder, mockFrom } = vi.hoisted(() => {
  // Builder waarvan elke chainable method `self` retourneert,
  // zodat elke combinatie van filters werkt (ilike/or/eq/gte/lte/in/order)
  // en de terminale `limit()` een Promise teruggeeft.
  type Builder = {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    or: ReturnType<typeof vi.fn>
    gte: ReturnType<typeof vi.fn>
    lte: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
  }
  const builder = {} as Builder
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.or = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lte = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => Promise.resolve({ data: [], error: null }))

  const mockFrom = vi.fn(() => builder)
  return { builder, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import { getLeadsList, countAllLeads } from './lead-queries'

describe('getLeadsList, geen filters', () => {
  beforeEach(() => {
    builder.select.mockClear()
    builder.eq.mockClear()
    builder.or.mockClear()
    builder.gte.mockClear()
    builder.lte.mockClear()
    builder.in.mockClear()
    builder.order.mockClear()
    builder.limit.mockClear()
    builder.limit.mockResolvedValue({ data: [], error: null })
    mockFrom.mockClear()
    mockFrom.mockReturnValue(builder)
  })

  it('queryt leads gesorteerd op aangemaakt DESC, niet-gearchiveerd, max 100', async () => {
    builder.limit.mockResolvedValue({
      data: [{ lead_id: 'L1', naam: 'Jan' }, { lead_id: 'L2', naam: 'Piet' }],
      error: null,
    })

    const result = await getLeadsList()

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(builder.eq).toHaveBeenCalledWith('dashboard_archived', false)
    expect(builder.order).toHaveBeenCalledWith('aangemaakt', { ascending: false })
    expect(builder.limit).toHaveBeenCalledWith(100)
    // getLeadsList verrijkt elke rij met de afgeleide pijplijn-vlag
    // heeft_wachtende_offerte (offerte-review-fase); zonder offerte = false.
    expect(result).toEqual([
      { lead_id: 'L1', naam: 'Jan', heeft_wachtende_offerte: false },
      { lead_id: 'L2', naam: 'Piet', heeft_wachtende_offerte: false },
    ])
  })

  it('returnt lege array bij Supabase-error (geen exception)', async () => {
    builder.limit.mockResolvedValue({ data: null, error: { message: 'oops' } })
    expect(await getLeadsList()).toEqual([])
  })

  it('returnt lege array als data null is', async () => {
    builder.limit.mockResolvedValue({ data: null, error: null })
    expect(await getLeadsList()).toEqual([])
  })
})

describe('getLeadsList, met filters', () => {
  beforeEach(() => {
    builder.select.mockClear()
    builder.eq.mockClear()
    builder.or.mockClear()
    builder.gte.mockClear()
    builder.lte.mockClear()
    builder.in.mockClear()
    builder.order.mockClear()
    builder.limit.mockClear()
    builder.limit.mockResolvedValue({ data: [], error: null })
    mockFrom.mockClear()
    mockFrom.mockReturnValue(builder)
  })

  it('met status: voegt eq(dashboard_status, value) toe', async () => {
    await getLeadsList({ status: 'opgevolgd' })
    expect(builder.eq).toHaveBeenCalledWith('dashboard_status', 'opgevolgd')
  })

  it('met fase: voegt eq(gesprek_fase, value) toe', async () => {
    await getLeadsList({ fase: 'onderhandelen' })
    expect(builder.eq).toHaveBeenCalledWith('gesprek_fase', 'onderhandelen')
  })

  it('met q: voegt or-clause op naam+telefoon toe', async () => {
    await getLeadsList({ q: 'jan' })
    expect(builder.or).toHaveBeenCalledTimes(1)
    const arg = builder.or.mock.calls[0][0] as string
    expect(arg).toContain('naam.ilike.%jan%')
    expect(arg).toContain('telefoon.ilike.')
  })

  it('met datum aangemaakt + from + to: voegt gte+lte toe op aangemaakt', async () => {
    await getLeadsList({ dateField: 'aangemaakt', from: '2026-04-01', to: '2026-04-30' })
    expect(builder.gte).toHaveBeenCalledWith('aangemaakt', '2026-04-01')
    expect(builder.lte).toHaveBeenCalledWith('aangemaakt', '2026-04-30T23:59:59.999Z')
  })

  it('met datum bijgewerkt: filtert op de bijgewerkt-kolom', async () => {
    await getLeadsList({ dateField: 'bijgewerkt', from: '2026-04-01' })
    expect(builder.gte).toHaveBeenCalledWith('bijgewerkt', '2026-04-01')
    expect(builder.lte).not.toHaveBeenCalled()
  })

  it('met tags: doet pre-fetch op lead_tags + filter via in(lead_id, ...)', async () => {
    const tagsBuilder: any = {
      select: vi.fn(() => tagsBuilder),
      in: vi.fn(() =>
        Promise.resolve({
          data: [
            { lead_id: 'L1', tag_id: 'T1' },
            { lead_id: 'L1', tag_id: 'T2' },
            { lead_id: 'L2', tag_id: 'T1' },
          ],
          error: null,
        })
      ),
    }
    // Cast naar any: mockFrom is getypt als () => Builder (geen arg), maar we
    // dispatchten hier op tabelnaam, zelfde patroon als in getLeadDetail tests.
    ;(mockFrom.mockImplementation as any)((table: string) => {
      if (table === 'lead_tags') return tagsBuilder
      return builder
    })

    await getLeadsList({ tags: ['T1', 'T2'] })

    expect(mockFrom).toHaveBeenCalledWith('lead_tags')
    expect(tagsBuilder.in).toHaveBeenCalledWith('tag_id', ['T1', 'T2'])
    expect(builder.in).toHaveBeenCalledWith('lead_id', ['L1'])
  })

  it('met tags die geen lead matcht: returnt lege array zonder leads-query', async () => {
    const tagsBuilder: any = {
      select: vi.fn(() => tagsBuilder),
      in: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }
    ;(mockFrom.mockImplementation as any)((table: string) => {
      if (table === 'lead_tags') return tagsBuilder
      return builder
    })

    const result = await getLeadsList({ tags: ['T1'] })
    expect(result).toEqual([])
    expect(builder.select).not.toHaveBeenCalled()
  })
})

describe('countAllLeads', () => {
  it('returnt totaal aantal niet-gearchiveerde leads', async () => {
    const countBuilder: any = {
      select: vi.fn(() => countBuilder),
      eq: vi.fn(() => Promise.resolve({ count: 42, error: null })),
    }
    mockFrom.mockReturnValue(countBuilder)

    expect(await countAllLeads()).toBe(42)
    expect(countBuilder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(countBuilder.eq).toHaveBeenCalledWith('dashboard_archived', false)
  })

  it('returnt 0 bij error', async () => {
    const countBuilder: any = {
      select: vi.fn(() => countBuilder),
      eq: vi.fn(() => Promise.resolve({ count: null, error: { message: 'oops' } })),
    }
    mockFrom.mockReturnValue(countBuilder)
    expect(await countAllLeads()).toBe(0)
  })
})

import { getLeadDetail } from './lead-queries'

describe('getLeadDetail', () => {
  // We gebruiken een uitgebreidere mock waar from('leads'/'berichten'/etc)
  // verschillende responses kunnen geven.
  const tableHandlers: Record<string, () => any> = {}

  beforeEach(() => {
    Object.keys(tableHandlers).forEach((k) => delete tableHandlers[k])
    // Cast naar any: mockFrom is in de getLeadsList-tests getypt als `() => ...`,
    // maar in productie wordt het aangeroepen met een tabelnaam-string.
    ;(mockFrom.mockImplementation as any)((table: string) => {
      const handler = tableHandlers[table]
      if (!handler) throw new Error(`no mock handler for table: ${table}`)
      return handler()
    })
  })

  function setLeadResponse(data: any, error: any = null) {
    tableHandlers['leads'] = () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data, error }),
        }),
      }),
    })
  }

  function setListResponse(table: string, data: any[]) {
    tableHandlers[table] = () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data, error: null }),
        }),
      }),
    })
  }

  it('returnt null als lead niet bestaat', async () => {
    setLeadResponse(null)
    setListResponse('berichten', [])
    setListResponse('fotos', [])
    setListResponse('offertes', [])
    setListResponse('prijsregels', [])
    setListResponse('lead_notes', [])
    setListResponse('lead_status_history', [])

    const result = await getLeadDetail('NONEXISTENT')

    expect(result).toBeNull()
  })

  it('returnt LeadDetail object met alle gerelateerde data als lead bestaat', async () => {
    setLeadResponse({ lead_id: 'L1', naam: 'Jan', telefoon: '06-123' })
    setListResponse('berichten', [{ id: 'B1', lead_id: 'L1', richting: 'inkomend', bericht: 'hoi', timestamp: '2026-04-23T10:00:00Z' }])
    setListResponse('fotos', [{ id: 'F1', lead_id: 'L1', public_url: 'https://...' }])
    setListResponse('offertes', [{ id: 'O1', lead_id: 'L1', versie: 1, totaal_incl: 250 }])
    setListResponse('prijsregels', [{ id: 'P1', lead_id: 'L1', omschrijving: 'reinigen', totaal: 250 }])
    setListResponse('lead_notes', [{ id: 'N1', lead_id: 'L1', tekst: 'klant belt morgen' }])
    setListResponse('lead_status_history', [])

    const result = await getLeadDetail('L1')

    expect(result).not.toBeNull()
    expect(result!.lead.lead_id).toBe('L1')
    expect(result!.berichten).toHaveLength(1)
    expect(result!.fotos).toHaveLength(1)
    expect(result!.offertes).toHaveLength(1)
    expect(result!.prijsregels).toHaveLength(1)
    expect(result!.notes).toHaveLength(1)
    expect(result!.statusHistory).toEqual([])
  })
})

import { aggregateActivityTimeline } from './lead-queries'

describe('aggregateActivityTimeline', () => {
  it('combineert berichten + fotos + offertes + notes + history + audit-velden, gesorteerd nieuwste eerst', () => {
    const detail = {
      lead: {
        lead_id: 'L1', naam: 'Jan',
        akkoord_op: '2026-04-23T11:00:00Z',
        akkoord_via: 'web',
        afspraak_geboekt_op: '2026-04-23T11:30:00Z',
        afspraak_geboekt_via: 'web',
        aangemaakt: '2026-04-22T09:00:00Z',
      } as any,
      berichten: [
        { id: 'B1', timestamp: '2026-04-22T10:00:00Z', richting: 'inkomend', bericht: 'hoi', type: 'tekst' } as any,
        { id: 'B2', timestamp: '2026-04-22T10:05:00Z', richting: 'uitgaand', bericht: 'goedemorgen', type: 'tekst' } as any,
      ],
      fotos: [
        { id: 'F1', aangemaakt: '2026-04-22T10:30:00Z', bron: 'whatsapp' } as any,
      ],
      offertes: [
        { id: 'O1', aangemaakt_op: '2026-04-22T15:00:00Z', versie: 1, totaal_incl: 250 } as any,
      ],
      prijsregels: [],
      notes: [
        { id: 'N1', aangemaakt_op: '2026-04-23T08:00:00Z', tekst: 'klant belt morgen' } as any,
      ],
      statusHistory: [
        { id: 'H1', gewijzigd_op: '2026-04-23T09:00:00Z', oude_status: 'open', nieuwe_status: 'opgevolgd' } as any,
      ],
    }

    const events = aggregateActivityTimeline(detail)

    // 9 events totaal: lead aangemaakt + 2 berichten + foto + offerte + notitie + status-change + akkoord + afspraak
    expect(events).toHaveLength(9)

    // Nieuwste eerst
    expect(events[0].timestamp).toBe('2026-04-23T11:30:00Z')  // afspraak_geboekt
    expect(events[events.length - 1].timestamp).toBe('2026-04-22T09:00:00Z')  // lead aangemaakt
  })

  it('event-types worden correct gelabeld', () => {
    const detail = {
      lead: { lead_id: 'L1', aangemaakt: '2026-04-22T09:00:00Z' } as any,
      berichten: [{ id: 'B1', timestamp: '2026-04-22T10:00:00Z', richting: 'inkomend', bericht: 'hoi', type: 'tekst' } as any],
      fotos: [{ id: 'F1', aangemaakt: '2026-04-22T10:30:00Z', bron: 'whatsapp' } as any],
      offertes: [],
      prijsregels: [],
      notes: [],
      statusHistory: [],
    }

    const events = aggregateActivityTimeline(detail)
    const types = events.map((e) => e.type)
    expect(types).toContain('lead_aangemaakt')
    expect(types).toContain('bericht_in')
    expect(types).toContain('foto_geupload')
  })

  it('legt richting van bericht correct vast (in vs uit)', () => {
    const detail = {
      lead: { lead_id: 'L1', aangemaakt: '2026-04-22T09:00:00Z' } as any,
      berichten: [
        { id: 'B1', timestamp: '2026-04-22T10:00:00Z', richting: 'inkomend', bericht: 'hoi', type: 'tekst' } as any,
        { id: 'B2', timestamp: '2026-04-22T10:05:00Z', richting: 'uitgaand', bericht: 'hi', type: 'tekst' } as any,
      ],
      fotos: [],
      offertes: [],
      prijsregels: [],
      notes: [],
      statusHistory: [],
    }

    const events = aggregateActivityTimeline(detail)
    const inEvent = events.find((e) => e.id === 'msg-B1')
    const outEvent = events.find((e) => e.id === 'msg-B2')

    expect(inEvent?.type).toBe('bericht_in')
    expect(outEvent?.type).toBe('bericht_uit')
  })
})
