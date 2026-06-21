import { describe, it, expect, vi, beforeEach } from 'vitest'

let tenantRow: { meldingen_email: string | null; eigenaar_email: string | null } | null = null
const getUserById = vi.fn().mockResolvedValue({ data: { user: { email: 'login@b.nl' } }, error: null })
const maybeSingle = vi.fn(async () => ({ data: tenantRow, error: null }))

vi.mock('@/lib/dashboard/supabase-admin', () => ({
  getDashboardAdmin: () => ({
    from: () => ({ select: () => ({ limit: () => ({ maybeSingle }) }) }),
    auth: { admin: { getUserById } },
  }),
}))

import { resolveNotificationRecipient } from './recipient'

beforeEach(() => { vi.clearAllMocks(); tenantRow = null })

describe('resolveNotificationRecipient', () => {
  it('gebruikt meldingen_email als ingevuld', async () => {
    tenantRow = { meldingen_email: 'meld@b.nl', eigenaar_email: 'basis@b.nl' }
    expect(await resolveNotificationRecipient('u1')).toBe('meld@b.nl')
    expect(getUserById).not.toHaveBeenCalled()
  })
  it('volgt eigenaar_email als meldingen_email leeg', async () => {
    tenantRow = { meldingen_email: null, eigenaar_email: 'basis@b.nl' }
    expect(await resolveNotificationRecipient('u1')).toBe('basis@b.nl')
  })
  it('valt terug op het login-adres als beide leeg', async () => {
    tenantRow = { meldingen_email: null, eigenaar_email: null }
    expect(await resolveNotificationRecipient('u1')).toBe('login@b.nl')
  })
})
