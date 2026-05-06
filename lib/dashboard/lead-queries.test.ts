import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockLimit, mockOrder, mockEq, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockLimit = vi.fn()
  const mockOrder = vi.fn(() => ({ limit: mockLimit }))
  const mockEq = vi.fn(() => ({ order: mockOrder }))
  const mockSelect = vi.fn(() => ({ eq: mockEq, order: mockOrder }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  return { mockLimit, mockOrder, mockEq, mockSelect, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import { getLeadsList } from './lead-queries'

describe('getLeadsList', () => {
  beforeEach(() => {
    mockLimit.mockReset()
    mockOrder.mockReset()
    mockEq.mockClear()
    mockSelect.mockClear()
    mockFrom.mockClear()
  })

  it('queryt leads gesorteerd op aangemaakt DESC, niet-gearchiveerd, max 100', async () => {
    mockLimit.mockResolvedValue({
      data: [{ lead_id: 'L1', naam: 'Jan' }, { lead_id: 'L2', naam: 'Piet' }],
      error: null,
    })

    const result = await getLeadsList()

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(mockEq).toHaveBeenCalledWith('dashboard_archived', false)
    expect(mockOrder).toHaveBeenCalledWith('aangemaakt', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(100)
    expect(result).toEqual([
      { lead_id: 'L1', naam: 'Jan' },
      { lead_id: 'L2', naam: 'Piet' },
    ])
  })

  it('returnt lege array bij Supabase-error (geen exception)', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'oops' } })

    const result = await getLeadsList()

    expect(result).toEqual([])
  })

  it('returnt lege array als data null is', async () => {
    mockLimit.mockResolvedValue({ data: null, error: null })

    const result = await getLeadsList()

    expect(result).toEqual([])
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
