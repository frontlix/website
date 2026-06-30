// lib/dashboard/calendar-connection-queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const upsert = vi.fn().mockResolvedValue({ error: null })
const del = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const maybeSingle = vi.fn().mockResolvedValue({
  data: { google_email: 'thierry@example.com', calendar_id: 'primary', connected_at: '2026-06-09T10:00:00Z' },
  error: null,
})

vi.mock('./supabase-admin', () => ({
  getDashboardAdmin: () => ({
    from: () => ({
      upsert,
      delete: del,
      select: () => ({ eq: () => ({ maybeSingle }) }),
    }),
  }),
}))

import { getConnectionStatus, saveConnection } from './calendar-connection-queries'

beforeEach(() => vi.clearAllMocks())

describe('calendar-connection-queries', () => {
  it('getConnectionStatus geeft alleen niet-gevoelige velden terug', async () => {
    const status = await getConnectionStatus('t1')
    expect(status).toEqual({
      connected: true,
      googleEmail: 'thierry@example.com',
      calendarId: 'primary',
      connectedAt: '2026-06-09T10:00:00Z',
    })
  })

  it('saveConnection schrijft een upsert met de versleutelde token', async () => {
    await saveConnection({ tenantId: 't1', googleEmail: 'a@b.nl', calendarId: 'primary', refreshTokenEncrypted: 'ENC' })
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 't1', refresh_token_encrypted: 'ENC' }),
      expect.objectContaining({ onConflict: 'tenant_id' }),
    )
  })
})
