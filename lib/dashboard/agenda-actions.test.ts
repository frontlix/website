import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCallBot, mockApproved, mockRevalidate } = vi.hoisted(() => ({
  // Getypeerde signatuur (zelfde als callBotLeadApi) zodat mock.calls[0] een
  // tuple is en de payload-assertions type-clean blijven.
  mockCallBot: vi.fn<
    (leadId: string, endpoint: string, payload?: unknown) => Promise<{ ok: boolean; status: number; data: unknown }>
  >(async () => ({ ok: true, status: 200, data: {} })),
  mockApproved: vi.fn(async () => {}),
  mockRevalidate: vi.fn(),
}))
vi.mock('./bot-api-client', () => ({ callBotLeadApi: mockCallBot, botApiError: () => 'fout' }))
vi.mock('./require-approved-user', () => ({ requireApprovedUser: mockApproved }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

import { cancelAppointment, rescheduleAppointment } from './agenda-actions'

beforeEach(() => { vi.clearAllMocks() })

describe('cancelAppointment', () => {
  it('roept cancel-appointment met notify-vlaggen aan', async () => {
    const res = await cancelAppointment('lead-1', { notifyWhatsapp: false, notifyEmail: false })
    expect(res).toEqual({ ok: true })
    expect(mockCallBot).toHaveBeenCalledWith('lead-1', 'cancel-appointment', { notifyWhatsapp: false, notifyEmail: false })
    expect(mockRevalidate).toHaveBeenCalledWith('/agenda')
  })
  it('default vlaggen aan', async () => {
    await cancelAppointment('lead-1')
    expect(mockCallBot).toHaveBeenCalledWith('lead-1', 'cancel-appointment', { notifyWhatsapp: true, notifyEmail: true })
  })
})

describe('rescheduleAppointment notify-opts', () => {
  it('geeft notify-vlaggen door aan de bot', async () => {
    await rescheduleAppointment('lead-1', '2026-07-10T10:00:00.000Z', { notifyWhatsapp: false, notifyEmail: false })
    const [, endpoint, payload] = mockCallBot.mock.calls[0]
    expect(endpoint).toBe('reschedule')
    expect(payload).toMatchObject({ notifyWhatsapp: false, notifyEmail: false })
  })
})
