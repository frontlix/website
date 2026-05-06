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
