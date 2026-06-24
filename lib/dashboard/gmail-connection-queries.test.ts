// lib/dashboard/gmail-connection-queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const upsert = vi.fn().mockResolvedValue({ error: null })
const del = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const maybeSingle = vi.fn().mockResolvedValue({
  data: { google_email: 'thierry@example.com', label_name: 'Offertes ter goedkeuring' },
  error: null,
})

vi.mock('./supabase-admin', () => ({
  getDashboardAdmin: () => ({
    from: () => ({
      upsert,
      delete: del,
      select: () => ({ limit: () => ({ maybeSingle }) }),
    }),
  }),
}))

import { getGmailConnectionStatus, saveGmailConnection } from './gmail-connection-queries'

beforeEach(() => vi.clearAllMocks())

describe('gmail-connection-queries', () => {
  it('getGmailConnectionStatus geeft alleen niet-gevoelige velden terug', async () => {
    const status = await getGmailConnectionStatus()
    expect(status).toEqual({
      connected: true,
      googleEmail: 'thierry@example.com',
      labelName: 'Offertes ter goedkeuring',
    })
  })

  it('saveGmailConnection schrijft een upsert met token, labelnaam en label-id', async () => {
    await saveGmailConnection({
      tenantId: 't1',
      googleEmail: 'a@b.nl',
      refreshTokenEncrypted: 'ENC',
      labelName: 'Mijn label',
      labelId: 'Label_1',
    })
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: 't1',
        refresh_token_encrypted: 'ENC',
        label_name: 'Mijn label',
        label_id: 'Label_1',
      }),
      expect.objectContaining({ onConflict: 'tenant_id' }),
    )
  })
})
