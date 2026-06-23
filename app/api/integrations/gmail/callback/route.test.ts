// app/api/integrations/gmail/callback/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/dashboard/auth', () => ({ getCurrentUserProfile: vi.fn() }))
vi.mock('@/lib/gmail-oauth', () => ({
  exchangeGmailCode: vi.fn(),
  ensureLabel: vi.fn(),
  ensureApprovalFilter: vi.fn(),
}))
vi.mock('@/lib/google-oauth', () => ({ fetchGoogleEmail: vi.fn() }))
vi.mock('@/lib/crypto/calendar-token', () => ({ encryptToken: vi.fn() }))
vi.mock('@/lib/dashboard/gmail-connection-queries', () => ({
  getTenantId: vi.fn(),
  saveGmailConnection: vi.fn(),
}))

import { GET } from './route'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { exchangeGmailCode } from '@/lib/gmail-oauth'

const owner = { tenant_status: 'approved', is_owner: true }

beforeEach(() => vi.clearAllMocks())

describe('gmail callback-route guard + CSRF', () => {
  it('weigert een niet-owner met redirect naar gmail=forbidden', async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValue(null as never)
    const req = new NextRequest('http://localhost:3000/api/integrations/gmail/callback?code=c&state=A')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('gmail=forbidden')
    expect(exchangeGmailCode).not.toHaveBeenCalled()
  })

  it('weigert bij state-mismatch (CSRF) met gmail=state_error en wisselt de code niet in', async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValue(owner as never)
    const req = new NextRequest('http://localhost:3000/api/integrations/gmail/callback?code=c&state=A', {
      headers: { cookie: 'gmail_oauth_state=B' },
    })
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('gmail=state_error')
    expect(exchangeGmailCode).not.toHaveBeenCalled()
  })
})
