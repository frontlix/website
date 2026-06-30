import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockEq,
  mockUpdate,
  mockSelect,
  mockSelectEq,
  mockMaybeSingle,
  mockFrom,
  mockRevalidatePath,
  mockCallBot,
} = vi.hoisted(() => {
  const mockEq = vi.fn(() => Promise.resolve({ error: null }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockMaybeSingle = vi.fn(() =>
    Promise.resolve({ data: { afspraak_datum: null as string | null }, error: null }),
  )
  const mockSelectEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate, select: mockSelect }))
  const mockRevalidatePath = vi.fn()
  const mockCallBot = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, data: {} }),
  )
  return {
    mockEq,
    mockUpdate,
    mockSelect,
    mockSelectEq,
    mockMaybeSingle,
    mockFrom,
    mockRevalidatePath,
    mockCallBot,
  }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('./require-approved-user', () => ({
  requireApprovedUser: vi.fn(async () => ({ user: { id: 'u1' } })),
}))
vi.mock('./bot-api-client', () => ({
  callBotLeadApi: mockCallBot,
  botApiError: (_res: unknown, fallback: string) => fallback,
}))

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
    mockSelect.mockClear()
    mockSelectEq.mockClear()
    mockMaybeSingle.mockReset()
    mockMaybeSingle.mockResolvedValue({ data: { afspraak_datum: null }, error: null })
    mockCallBot.mockClear()
    mockCallBot.mockResolvedValue({ ok: true, status: 200, data: {} })
    mockRevalidatePath.mockReset()
  })

  it('archiveert direct als er geen (toekomstige) afspraak is', async () => {
    const result = await archiveLead('LEAD-1')

    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_archived: true })
    expect(mockEq).toHaveBeenCalledWith('lead_id', 'LEAD-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads')
    expect(result.ok).toBe(true)
  })

  it('vraagt om een keuze (en archiveert NIET) bij een toekomstige afspraak', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { afspraak_datum: '2999-01-01T10:00:00Z' },
      error: null,
    })

    const result = await archiveLead('LEAD-1')

    expect(result).toMatchObject({ ok: false, needsAppointmentDecision: true })
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockCallBot).not.toHaveBeenCalled()
  })

  it('annuleert de afspraak via de bot en archiveert bij keuze "cancel"', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { afspraak_datum: '2999-01-01T10:00:00Z' },
      error: null,
    })

    const result = await archiveLead('LEAD-1', { appointmentDecision: 'cancel' })

    expect(mockCallBot).toHaveBeenCalledWith('LEAD-1', 'cancel-appointment', {
      notifyWhatsapp: false,
      notifyEmail: false,
    })
    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_archived: true })
    expect(result.ok).toBe(true)
  })

  it('archiveert zonder annuleren bij keuze "keep"', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { afspraak_datum: '2999-01-01T10:00:00Z' },
      error: null,
    })

    const result = await archiveLead('LEAD-1', { appointmentDecision: 'keep' })

    expect(mockCallBot).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_archived: true })
    expect(result.ok).toBe(true)
  })

  it('archiveert NIET als het annuleren van de afspraak mislukt', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { afspraak_datum: '2999-01-01T10:00:00Z' },
      error: null,
    })
    mockCallBot.mockResolvedValueOnce({ ok: false, status: 502, data: {} })

    const result = await archiveLead('LEAD-1', { appointmentDecision: 'cancel' })

    expect(result.ok).toBe(false)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('unarchiveLead', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('zet dashboard_archived=false en maakt de lead weer echt', async () => {
    await unarchiveLead('LEAD-1')

    expect(mockUpdate).toHaveBeenCalledWith({
      dashboard_archived: false,
      uitgesloten_van_stats: false,
    })
  })
})
