import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrder, mockEq, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockEq = vi.fn(() => ({ order: mockOrder }))
  const mockSelect = vi.fn(() => ({ eq: mockEq, order: mockOrder }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  return { mockOrder, mockEq, mockSelect, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import { getLeadsList } from './lead-queries'

describe('getLeadsList', () => {
  beforeEach(() => {
    mockOrder.mockReset()
    mockEq.mockClear()
    mockSelect.mockClear()
    mockFrom.mockClear()
  })

  it('queryt leads gesorteerd op aangemaakt DESC, niet-gearchiveerd, max 100', async () => {
    mockOrder.mockResolvedValue({
      data: [{ lead_id: 'L1', naam: 'Jan' }, { lead_id: 'L2', naam: 'Piet' }],
      error: null,
    })

    const result = await getLeadsList()

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(mockEq).toHaveBeenCalledWith('dashboard_archived', false)
    expect(mockOrder).toHaveBeenCalledWith('aangemaakt', { ascending: false })
    expect(result).toEqual([
      { lead_id: 'L1', naam: 'Jan' },
      { lead_id: 'L2', naam: 'Piet' },
    ])
  })

  it('returnt lege array bij Supabase-error (geen exception)', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'oops' } })

    const result = await getLeadsList()

    expect(result).toEqual([])
  })

  it('returnt lege array als data null is', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })

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
    setListResponse('berichten', [{ id: 'B1', lead_id: 'L1', richting: 'in', bericht: 'hoi', timestamp: '2026-04-23T10:00:00Z' }])
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
