import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireApprovedUser,
  mockRevalidatePath,
  mockFrom,
  mockSelectList,
  mockUpsert,
  mockSelectOverflow,
  mockDeleteIn,
  mockDeleteEq,
} = vi.hoisted(() => {
  const mockRequireApprovedUser = vi.fn(() => Promise.resolve())
  const mockRevalidatePath = vi.fn()

  // listConcepten: select().order().limit()
  const mockSelectList = vi.fn(() =>
    Promise.resolve({
      data: [
        { id: 'C2', data: { naam: 'B' }, v2_state: null, label: 'B', totaal: 200, bijgewerkt_op: '2026-06-24T10:00:00Z' },
        { id: 'C1', data: { naam: 'A' }, v2_state: { stap: 1 }, label: 'A', totaal: 100, bijgewerkt_op: '2026-06-23T10:00:00Z' },
      ],
      error: null as { message: string } | null,
    }),
  )
  // upsertConcept: upsert()
  const mockUpsert = vi.fn((_row: Record<string, unknown>) => Promise.resolve({ error: null }))
  // opschoning: select().order().range()
  const mockSelectOverflow = vi.fn(() =>
    Promise.resolve({ data: [] as { id: string }[], error: null as { message: string } | null }),
  )
  // delete().in() (opschoning) en delete().eq() (removeConcept)
  const mockDeleteIn = vi.fn(() => Promise.resolve({ error: null }))
  const mockDeleteEq = vi.fn(() => Promise.resolve({ error: null }))

  const mockFrom = vi.fn(() => ({
    select: vi.fn((_cols: string) => ({
      order: vi.fn(() => ({
        limit: mockSelectList,
        range: mockSelectOverflow,
      })),
    })),
    upsert: mockUpsert,
    delete: vi.fn(() => ({ in: mockDeleteIn, eq: mockDeleteEq })),
  }))

  return {
    mockRequireApprovedUser, mockRevalidatePath, mockFrom,
    mockSelectList, mockUpsert, mockSelectOverflow, mockDeleteIn, mockDeleteEq,
  }
})

vi.mock('./supabase-admin', () => ({ getDashboardAdmin: () => ({ from: mockFrom }) }))
vi.mock('./require-approved-user', () => ({ requireApprovedUser: mockRequireApprovedUser }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { listConcepten, upsertConcept, removeConcept } from './offerte-concept-actions'

const baseData = { naam: 'Test' } as never

describe('offerte-concept-actions', () => {
  beforeEach(() => {
    mockRequireApprovedUser.mockClear()
    mockRevalidatePath.mockClear()
    mockFrom.mockClear()
    mockUpsert.mockClear()
    mockSelectOverflow.mockReset()
    mockSelectOverflow.mockResolvedValue({ data: [], error: null })
    mockDeleteIn.mockClear()
    mockDeleteEq.mockClear()
  })

  it('listConcepten geeft concepten nieuwste eerst met epoch-ms', async () => {
    const res = await listConcepten()
    expect(res.ok).toBe(true)
    const data = (res as { ok: true; data: { id: string; bijgewerktOp: number }[] }).data
    expect(data.map((c) => c.id)).toEqual(['C2', 'C1'])
    expect(data[0].bijgewerktOp).toBe(new Date('2026-06-24T10:00:00Z').getTime())
  })

  it('upsertConcept schrijft data + v2_state en revalidate', async () => {
    const res = await upsertConcept({ id: 'C9', data: baseData, v2State: { stap: 2 }, label: 'X', totaal: 50 })
    expect(res.ok).toBe(true)
    const arg = mockUpsert.mock.calls[0][0] as Record<string, unknown>
    expect(arg.id).toBe('C9')
    expect(arg.v2_state).toEqual({ stap: 2 })
    expect(mockRevalidatePath).toHaveBeenCalled()
  })

  it('upsertConcept verwijdert concepten buiten de 30 nieuwste', async () => {
    mockSelectOverflow.mockResolvedValueOnce({ data: [{ id: 'OUD1' }, { id: 'OUD2' }], error: null })
    const res = await upsertConcept({ id: 'C9', data: baseData, v2State: null, label: 'X', totaal: 50 })
    expect(res.ok).toBe(true)
    expect(mockDeleteIn).toHaveBeenCalledWith('id', ['OUD1', 'OUD2'])
  })

  it('upsertConcept weigert een lege id', async () => {
    const res = await upsertConcept({ id: '', data: baseData, v2State: null, label: 'X', totaal: 0 })
    expect(res.ok).toBe(false)
  })

  it('removeConcept verwijdert op id', async () => {
    const res = await removeConcept('C1')
    expect(res.ok).toBe(true)
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'C1')
  })
})
