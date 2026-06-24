// app/api/integrations/gmail/disconnect/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  getTenantId: vi.fn(),
  getGmailConnectionSecrets: vi.fn(),
  deleteGmailConnection: vi.fn(),
  decryptToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  deleteFilter: vi.fn(),
}))

vi.mock('@/lib/dashboard/auth', () => ({ getCurrentUserProfile: mocks.getCurrentUserProfile }))
vi.mock('@/lib/dashboard/gmail-connection-queries', () => ({
  getTenantId: mocks.getTenantId,
  getGmailConnectionSecrets: mocks.getGmailConnectionSecrets,
  deleteGmailConnection: mocks.deleteGmailConnection,
}))
vi.mock('@/lib/crypto/calendar-token', () => ({ decryptToken: mocks.decryptToken }))
vi.mock('@/lib/google-oauth', () => ({ refreshAccessToken: mocks.refreshAccessToken }))
vi.mock('@/lib/gmail-oauth', () => ({ deleteFilter: mocks.deleteFilter }))

import { POST } from './route'

const owner = { tenant_status: 'approved', is_owner: true }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getTenantId.mockResolvedValue('t1')
  mocks.decryptToken.mockReturnValue('refresh-plain')
  mocks.refreshAccessToken.mockResolvedValue('access-123')
  mocks.deleteGmailConnection.mockResolvedValue(undefined)
  mocks.deleteFilter.mockResolvedValue(undefined)
})

describe('gmail disconnect-route', () => {
  it('weigert een niet-owner met 403 en raakt de connectie niet aan', async () => {
    mocks.getCurrentUserProfile.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(403)
    expect(mocks.deleteGmailConnection).not.toHaveBeenCalled()
  })

  it('verwijdert eerst het filter en wist daarna de connectie-rij', async () => {
    mocks.getCurrentUserProfile.mockResolvedValue(owner)
    mocks.getGmailConnectionSecrets.mockResolvedValue({ refreshTokenEncrypted: 'ENC', filterId: 'Filter_1' })
    const order: string[] = []
    mocks.deleteFilter.mockImplementation(async () => {
      order.push('deleteFilter')
    })
    mocks.deleteGmailConnection.mockImplementation(async () => {
      order.push('deleteGmailConnection')
    })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(mocks.deleteFilter).toHaveBeenCalledWith('access-123', 'Filter_1')
    expect(order).toEqual(['deleteFilter', 'deleteGmailConnection'])
  })

  it('wist de connectie ook als er geen filter-id is (niets om op te ruimen)', async () => {
    mocks.getCurrentUserProfile.mockResolvedValue(owner)
    mocks.getGmailConnectionSecrets.mockResolvedValue({ refreshTokenEncrypted: 'ENC', filterId: null })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(mocks.deleteFilter).not.toHaveBeenCalled()
    expect(mocks.deleteGmailConnection).toHaveBeenCalledWith('t1')
  })
})
