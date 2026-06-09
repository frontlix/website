import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireApprovedUser,
  mockRevalidatePath,
  mockFrom,
  mockPrijsregelsCount,
  mockPrijsregelsDelete,
  mockPrijsregelsInsert,
  mockMaybeSingle,
  mockOffertesUpdateEq,
  mockLeadsUpdateEq,
} = vi.hoisted(() => {
  const mockRequireApprovedUser = vi.fn(() => Promise.resolve())
  const mockRevalidatePath = vi.fn()

  // prijsregels: count (wipe-guard), delete en insert
  const mockPrijsregelsCount = vi.fn(() =>
    Promise.resolve({
      count: 0 as number | null,
      error: null as { message: string } | null,
    }),
  )
  const mockPrijsregelsDelete = vi.fn(() => Promise.resolve({ error: null }))
  const mockPrijsregelsInsert = vi.fn(() => Promise.resolve({ error: null }))

  // offertes: concept-rij ophalen + bijwerken
  const mockMaybeSingle = vi.fn(() =>
    Promise.resolve({ data: { id: 'OFF-1', versie: 2 }, error: null }),
  )
  const mockOffertesUpdateEq = vi.fn(() => Promise.resolve({ error: null }))

  // leads: korting-velden bijwerken
  const mockLeadsUpdateEq = vi.fn(() => Promise.resolve({ error: null }))

  const mockFrom = vi.fn((table: string) => {
    if (table === 'offertes') {
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
        }),
        update: () => ({ eq: mockOffertesUpdateEq }),
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: 'OFF-NIEUW' }, error: null }),
          }),
        }),
      }
    }
    if (table === 'prijsregels') {
      return {
        select: () => ({ eq: mockPrijsregelsCount }),
        delete: () => ({ eq: mockPrijsregelsDelete }),
        insert: mockPrijsregelsInsert,
      }
    }
    if (table === 'leads') {
      return { update: () => ({ eq: mockLeadsUpdateEq }) }
    }
    throw new Error(`onverwachte tabel: ${table}`)
  })

  return {
    mockRequireApprovedUser,
    mockRevalidatePath,
    mockFrom,
    mockPrijsregelsCount,
    mockPrijsregelsDelete,
    mockPrijsregelsInsert,
    mockMaybeSingle,
    mockOffertesUpdateEq,
    mockLeadsUpdateEq,
  }
})

vi.mock('./supabase-admin', () => ({
  getDashboardAdmin: () => ({ from: mockFrom }),
}))
vi.mock('./require-approved-user', () => ({
  requireApprovedUser: mockRequireApprovedUser,
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { saveDraft } from './offerte-draft-actions'

const legePayload = { regels: [], kortingPct: 0, kortingOmschrijving: '' }

describe('saveDraft wipe-guard', () => {
  beforeEach(() => {
    mockRequireApprovedUser.mockClear()
    mockRevalidatePath.mockClear()
    mockFrom.mockClear()
    mockPrijsregelsCount.mockReset()
    mockPrijsregelsCount.mockResolvedValue({ count: 0, error: null })
    mockPrijsregelsDelete.mockClear()
    mockPrijsregelsInsert.mockClear()
    mockMaybeSingle.mockClear()
    mockOffertesUpdateEq.mockClear()
    mockLeadsUpdateEq.mockClear()
  })

  it('weigert een lege payload zolang er prijsregels in de DB staan', async () => {
    mockPrijsregelsCount.mockResolvedValueOnce({ count: 3, error: null })

    const result = await saveDraft('LEAD-1', legePayload)

    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toMatch(
      /lege opslag geweigerd/i,
    )
    // Niets aangeraakt: geen delete, geen insert, zelfs geen concept-update.
    expect(mockPrijsregelsDelete).not.toHaveBeenCalled()
    expect(mockPrijsregelsInsert).not.toHaveBeenCalled()
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it('laat een vers concept zonder bestaande regels gewoon door', async () => {
    mockPrijsregelsCount.mockResolvedValueOnce({ count: 0, error: null })

    const result = await saveDraft('LEAD-1', legePayload)

    expect(result.ok).toBe(true)
    // Geen regels in de payload, dus ook geen insert.
    expect(mockPrijsregelsInsert).not.toHaveBeenCalled()
  })

  it('slaat een gevulde payload op zonder de guard te raken', async () => {
    const result = await saveDraft('LEAD-1', {
      regels: [
        {
          bron: 'manual',
          omschrijving: 'Gevelreiniging',
          aantal: 2,
          eenheid: 'uur',
          stukprijs: 45,
        },
      ],
      kortingPct: 10,
      kortingOmschrijving: 'actie',
    })

    expect(result.ok).toBe(true)
    expect(mockPrijsregelsCount).not.toHaveBeenCalled()
    expect(mockPrijsregelsDelete).toHaveBeenCalled()
    expect(mockPrijsregelsInsert).toHaveBeenCalled()
  })

  it('returnt een error als de regel-telling zelf faalt', async () => {
    mockPrijsregelsCount.mockResolvedValueOnce({
      count: null,
      error: { message: 'verbinding weg' },
    })

    const result = await saveDraft('LEAD-1', legePayload)

    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toMatch(
      /verbinding weg/,
    )
    expect(mockPrijsregelsDelete).not.toHaveBeenCalled()
  })
})
