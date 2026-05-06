import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockEq, mockUpdate, mockFrom, mockRevalidatePath } = vi.hoisted(() => {
  const mockEq = vi.fn(() => Promise.resolve({ error: null }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))
  const mockRevalidatePath = vi.fn()
  return { mockEq, mockUpdate, mockFrom, mockRevalidatePath }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import {
  setDashboardStatus,
  archiveLead,
  unarchiveLead,
} from './lead-actions'
import type { DashboardStatus } from './database.types'

describe('setDashboardStatus', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('updatet dashboard_status en revalidate de detail-page', async () => {
    const result = await setDashboardStatus('LEAD-1', 'opgevolgd')

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_status: 'opgevolgd' })
    expect(mockEq).toHaveBeenCalledWith('lead_id', 'LEAD-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads')
    expect(result).toEqual({ ok: true })
  })

  it('accepteert null om status leeg te maken', async () => {
    await setDashboardStatus('LEAD-1', null)

    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_status: null })
  })

  it('returnt error als Supabase faalt', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'rls denied' } as any })

    const result = await setDashboardStatus('LEAD-1', 'open')

    expect(result.ok).toBe(false)
    expect((result as any).error).toMatch(/rls denied/)
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('weigert onbekende status-waarde', async () => {
    const result = await setDashboardStatus(
      'LEAD-1',
      'gibberish' as unknown as DashboardStatus
    )

    expect(result.ok).toBe(false)
    expect((result as any).error).toMatch(/ongeldige status/i)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('archiveLead', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('zet dashboard_archived=true', async () => {
    const result = await archiveLead('LEAD-1')

    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_archived: true })
    expect(mockEq).toHaveBeenCalledWith('lead_id', 'LEAD-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads')
    expect(result.ok).toBe(true)
  })
})

describe('unarchiveLead', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('zet dashboard_archived=false', async () => {
    await unarchiveLead('LEAD-1')

    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_archived: false })
  })
})
