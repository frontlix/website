import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted() is nodig in vitest 4: vi.mock-factories worden tijdens
// hoisting al uitgevoerd voor modules die eager worden geïmporteerd
// (zoals next/navigation), terwijl `const`-declaraties NIET hoisten.
// Zonder hoisted() krijg je TDZ-errors bij module-import.
const { mockSignUp, mockUpsert, mockSlack, mockRedirect } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
  mockSlack: vi.fn(),
  mockRedirect: vi.fn(() => { throw new Error('REDIRECT') }),
}))

vi.mock('@/lib/dashboard/supabase-admin', () => ({
  getDashboardAdmin: () => ({
    auth: { admin: {} },
    from: () => ({ upsert: mockUpsert }),
  }),
}))
vi.mock('@/lib/dashboard/supabase-server', () => ({
  getDashboardSupabase: async () => ({
    auth: { signUp: mockSignUp },
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
    mockSignUp.mockReset()
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

  it('roept Supabase signUp + upsert profile + slack-notify, dan redirect', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' } },
      error: null,
    })

    await expect(signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'Bedrijf X',
    }))).rejects.toThrow('REDIRECT')

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'a@b.c',
      password: 'wachtwoord123',
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
    expect(mockSlack).toHaveBeenCalledWith(
      expect.stringContaining('Bedrijf X')
    )
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })

  it('redirect tóch als profile-upsert faalt, en vlagt in Slack', async () => {
    mockSignUp.mockResolvedValue({
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

  it('retourneert error bij Supabase signUp failure (geen redirect, geen slack)', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    const result = await signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'X',
    }))

    expect(result.error).toBeDefined()
    expect(mockSlack).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
