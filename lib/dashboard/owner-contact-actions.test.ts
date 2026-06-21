import { describe, it, expect, vi, beforeEach } from 'vitest'

const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'tenant-1' }, error: null })

vi.mock('./supabase-admin', () => ({
  getDashboardAdmin: () => ({
    from: () => ({
      select: () => ({ limit: () => ({ maybeSingle }) }),
      update,
    }),
  }),
}))
vi.mock('./require-approved-user', () => ({ requireApprovedUser: vi.fn().mockResolvedValue({}) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { saveOwnerContactSettings } from './owner-contact-actions'

beforeEach(() => vi.clearAllMocks())

describe('saveOwnerContactSettings', () => {
  it('schrijft basis + NULL voor "volg basis" en genormaliseerd whatsapp', async () => {
    const res = await saveOwnerContactSettings({
      basisEmail: 'basis@b.nl',
      goedkeuringEmail: '',          // volg basis -> NULL
      meldingenEmail: 'meld@b.nl',   // eigen adres
      whatsapp: '0612345678',
    })
    expect(res).toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        eigenaar_email: 'basis@b.nl',
        goedkeuring_email: null,
        meldingen_email: 'meld@b.nl',
        eigenaar_whatsapp: '31612345678',
      }),
    )
  })

  it('weigert een ongeldig basis-adres', async () => {
    const res = await saveOwnerContactSettings({
      basisEmail: 'geen-email', goedkeuringEmail: null, meldingenEmail: null, whatsapp: '',
    })
    expect(res.ok).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('weigert een ongeldig override-adres', async () => {
    const res = await saveOwnerContactSettings({
      basisEmail: 'basis@b.nl', goedkeuringEmail: 'kapot', meldingenEmail: null, whatsapp: '',
    })
    expect(res.ok).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('leeg whatsapp wordt NULL (geen ping)', async () => {
    await saveOwnerContactSettings({
      basisEmail: 'basis@b.nl', goedkeuringEmail: null, meldingenEmail: null, whatsapp: '',
    })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ eigenaar_whatsapp: null }))
  })
})
