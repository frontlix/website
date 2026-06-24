// app/api/integrations/gmail/disconnect/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  getTenantId: vi.fn(),
  deleteGmailConnection: vi.fn(),
}))

vi.mock('@/lib/dashboard/auth', () => ({ getCurrentUserProfile: mocks.getCurrentUserProfile }))
vi.mock('@/lib/dashboard/gmail-connection-queries', () => ({
  getTenantId: mocks.getTenantId,
  deleteGmailConnection: mocks.deleteGmailConnection,
}))

import { POST } from './route'

const owner = { tenant_status: 'approved', is_owner: true }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getTenantId.mockResolvedValue('t1')
  mocks.deleteGmailConnection.mockResolvedValue(undefined)
})

describe('gmail disconnect-route', () => {
  it('weigert een niet-owner met 403 en raakt de connectie niet aan', async () => {
    mocks.getCurrentUserProfile.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(403)
    expect(mocks.deleteGmailConnection).not.toHaveBeenCalled()
  })

  it('owner ontvangt status 200 en de connectie wordt verwijderd', async () => {
    mocks.getCurrentUserProfile.mockResolvedValue(owner)
    const res = await POST()
    expect(res.status).toBe(200)
    expect(mocks.deleteGmailConnection).toHaveBeenCalledWith('t1')
  })
})
