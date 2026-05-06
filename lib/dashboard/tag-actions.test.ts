import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetUser,
  mockInsert,
  mockSelect,
  mockSingle,
  mockDelete,
  mockEq,
  mockMatch,
  mockFrom,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockEq = vi.fn(() => Promise.resolve({ error: null }))
  const mockMatch = vi.fn(() => Promise.resolve({ error: null }))
  const mockDelete = vi.fn(() => ({ match: mockMatch }))
  const mockGetUser = vi.fn()
  const mockFrom = vi.fn((table: string) => {
    if (table === 'tags') return { insert: mockInsert }
    if (table === 'lead_tags') return { insert: mockInsert, delete: mockDelete }
    throw new Error(`unexpected table: ${table}`)
  })
  const mockRevalidatePath = vi.fn()
  return {
    mockGetUser,
    mockInsert,
    mockSelect,
    mockSingle,
    mockDelete,
    mockEq,
    mockMatch,
    mockFrom,
    mockRevalidatePath,
  }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { createTag, addTagToLead, removeTagFromLead } from './tag-actions'

describe('createTag', () => {
  beforeEach(() => {
    mockSingle.mockReset()
    mockInsert.mockClear()
    mockSelect.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('insert nieuwe tag en revalidate /leads', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'TAG-1', naam: 'hot lead', kleur: null },
      error: null,
    })

    const result = await createTag('hot lead')

    expect(mockFrom).toHaveBeenCalledWith('tags')
    expect(mockInsert).toHaveBeenCalledWith({ naam: 'hot lead' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.tagId).toBe('TAG-1')
    }
  })

  it('weigert lege naam', async () => {
    const result = await createTag('   ')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/leeg/i)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returnt error bij Supabase-failure (bv. unique-naam botsing)', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value' },
    })

    const result = await createTag('bestaat-al')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/duplicate/)
  })
})

describe('addTagToLead', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockInsert.mockReset()
    mockInsert.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({ data: {}, error: null })
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('insert lead_tags-rij met aangemaakt_door=auth.uid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const result = await addTagToLead('LEAD-1', 'TAG-1')

    expect(mockFrom).toHaveBeenCalledWith('lead_tags')
    expect(mockInsert).toHaveBeenCalledWith({
      lead_id: 'LEAD-1',
      tag_id: 'TAG-1',
      aangemaakt_door: 'u1',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })

  it('weigert als niet ingelogd', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await addTagToLead('LEAD-1', 'TAG-1')

    expect(result.ok).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

describe('removeTagFromLead', () => {
  beforeEach(() => {
    mockMatch.mockReset()
    mockMatch.mockResolvedValue({ error: null })
    mockDelete.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('delete lead_tags-rij + revalidate', async () => {
    const result = await removeTagFromLead('LEAD-1', 'TAG-1')

    expect(mockFrom).toHaveBeenCalledWith('lead_tags')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockMatch).toHaveBeenCalledWith({ lead_id: 'LEAD-1', tag_id: 'TAG-1' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })
})
