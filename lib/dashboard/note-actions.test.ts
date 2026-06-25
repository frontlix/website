import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetUser,
  mockInsert,
  mockEq,
  mockDelete,
  mockUpdate,
  mockFrom,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
  const mockEq = vi.fn(() => Promise.resolve({ error: null }))
  const mockDelete = vi.fn(() => ({ eq: mockEq }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ insert: mockInsert, delete: mockDelete, update: mockUpdate }))
  const mockRevalidatePath = vi.fn()
  return { mockGetUser, mockInsert, mockEq, mockDelete, mockUpdate, mockFrom, mockRevalidatePath }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { addNote, deleteNote, updateNote, setNoteTargets } from './note-actions'

describe('addNote', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockInsert.mockReset()
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('insert nieuwe notitie met auteur=auth.uid en revalidate', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const result = await addNote('LEAD-1', 'klant belt morgen')

    expect(mockFrom).toHaveBeenCalledWith('lead_notes')
    expect(mockInsert).toHaveBeenCalledWith({
      lead_id: 'LEAD-1',
      tekst: 'klant belt morgen',
      auteur: 'u1',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })

  it('weigert lege tekst', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const result = await addNote('LEAD-1', '   ')

    expect(result.ok).toBe(false)
    expect((result as any).error).toMatch(/leeg/i)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('weigert als niet ingelogd', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await addNote('LEAD-1', 'tekst')

    expect(result.ok).toBe(false)
    expect((result as any).error).toMatch(/niet ingelogd/i)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returnt error bij Supabase-failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockInsert.mockResolvedValueOnce({ error: { message: 'rls denied' } } as any)

    const result = await addNote('LEAD-1', 'tekst')

    expect(result.ok).toBe(false)
    expect((result as any).error).toMatch(/rls denied/)
  })
})

describe('deleteNote', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockDelete.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('delete + revalidate', async () => {
    const result = await deleteNote('NOTE-1', 'LEAD-1')

    expect(mockFrom).toHaveBeenCalledWith('lead_notes')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'NOTE-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })
})

describe('updateNote', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('update tekst (getrimd) op id + revalidate', async () => {
    const result = await updateNote('NOTE-1', 'LEAD-1', '  nieuwe tekst  ')

    expect(mockFrom).toHaveBeenCalledWith('lead_notes')
    expect(mockUpdate).toHaveBeenCalledWith({ tekst: 'nieuwe tekst' })
    expect(mockEq).toHaveBeenCalledWith('id', 'NOTE-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })

  it('weigert lege tekst zonder DB-call', async () => {
    const result = await updateNote('NOTE-1', 'LEAD-1', '   ')

    expect(result.ok).toBe(false)
    expect((result as any).error).toMatch(/leeg/i)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returnt error bij Supabase-failure', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'rls denied' } } as any)

    const result = await updateNote('NOTE-1', 'LEAD-1', 'tekst')

    expect(result.ok).toBe(false)
    expect((result as any).error).toMatch(/rls denied/)
  })
})

describe('setNoteTargets', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('zet beide vinkjes op id + revalidate', async () => {
    const result = await setNoteTargets('NOTE-1', 'LEAD-1', {
      opAfspraak: false,
      opOpdrachtbon: true,
    })

    expect(mockFrom).toHaveBeenCalledWith('lead_notes')
    expect(mockUpdate).toHaveBeenCalledWith({ op_afspraak: false, op_opdrachtbon: true })
    expect(mockEq).toHaveBeenCalledWith('id', 'NOTE-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })

  it('returnt error bij Supabase-failure', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'rls denied' } } as any)

    const result = await setNoteTargets('NOTE-1', 'LEAD-1', {
      opAfspraak: true,
      opOpdrachtbon: false,
    })

    expect(result.ok).toBe(false)
    expect((result as any).error).toMatch(/rls denied/)
  })
})
