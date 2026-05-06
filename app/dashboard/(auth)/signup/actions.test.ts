import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted() is nodig in vitest 4: vi.mock-factories worden tijdens
// hoisting al uitgevoerd voor modules die eager worden geïmporteerd
// (zoals next/navigation), terwijl `const`-declaraties NIET hoisten.
const { mockCreateUser, mockSignIn, mockUpsert, mockSlack, mockRedirect } = vi.hoisted(() => ({
  mockCreateUser: vi.fn(),
  mockSignIn: vi.fn().mockResolvedValue({ error: null }),
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
  mockSlack: vi.fn(),
  mockRedirect: vi.fn(() => { throw new Error('REDIRECT') }),
}))

vi.mock('@/lib/dashboard/supabase-admin', () => ({
  getDashboardAdmin: () => ({
    auth: { admin: { createUser: mockCreateUser } },
    from: () => ({ upsert: mockUpsert }),
  }),
}))
vi.mock('@/lib/dashboard/supabase-server', () => ({
  getDashboardSupabase: async () => ({
    auth: { signInWithPassword: mockSignIn },
  }),
}))
vi.mock('@/lib/dashboard/slack', () => ({
  postSignupNotification: mockSlack,
}))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

import { signupAction } from './actions'

function makeFormData(values: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

describe('signupAction', () => {
  beforeEach(() => {
    mockCreateUser.mockReset()
    mockSignIn.mockReset()
    mockSignIn.mockResolvedValue({ error: null })
    mockUpsert.mockClear()
    mockUpsert.mockResolvedValue({ error: null })
    mockSlack.mockReset()
    mockRedirect.mockClear()
  })

  it('vereist email, wachtwoord, bedrijfsnaam', async () => {
    const result = await signupAction({}, makeFormData({ email: '', wachtwoord: '', bedrijfsnaam: '' }))
    expect(result.error).toMatch(/vul/i)
  })

  it('vereist wachtwoord van minstens 8 tekens', async () => {
    const result = await signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'kort', bedrijfsnaam: 'X',
    }))
    expect(result.error).toMatch(/wachtwoord/i)
  })

  it('roept admin.createUser met email_confirm=true + upsert + auto-signIn + slack, dan redirect', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' } },
      error: null,
    })

    await expect(signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'Bedrijf X',
    }))).rejects.toThrow('REDIRECT')

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'a@b.c',
      password: 'wachtwoord123',
      email_confirm: true,
    })
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: 'u1',
        bedrijfsnaam: 'Bedrijf X',
        tenant_status: 'pending',
        is_owner: true,
      },
      { onConflict: 'user_id' }
    )
    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'a@b.c',
      password: 'wachtwoord123',
    })
    expect(mockSlack).toHaveBeenCalledWith(
      expect.stringContaining('Bedrijf X')
    )
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })

  it('redirect tóch als profile-upsert faalt, en vlagt in Slack', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u2' } }, error: null,
    })
    mockUpsert.mockResolvedValueOnce({ error: { message: 'boom' } })

    await expect(signupAction({}, makeFormData({
      email: 'b@c.d', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'Y',
    }))).rejects.toThrow('REDIRECT')

    expect(mockSlack).toHaveBeenCalledWith(
      expect.stringContaining('handmatig aanmaken')
    )
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })

  it('redirect tóch als auto-signIn faalt (gebruiker komt op /wachtkamer maar zonder session)', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u3' } }, error: null,
    })
    mockSignIn.mockResolvedValueOnce({ error: { message: 'auth fail' } })

    await expect(signupAction({}, makeFormData({
      email: 'c@d.e', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'Z',
    }))).rejects.toThrow('REDIRECT')

    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
    expect(mockSlack).toHaveBeenCalled()
  })

  it('retourneert error bij admin.createUser failure (geen redirect, geen slack, geen signIn)', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    const result = await signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'X',
    }))

    expect(result.error).toBeDefined()
    expect(mockSignIn).not.toHaveBeenCalled()
    expect(mockSlack).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
