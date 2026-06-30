import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted() is nodig in vitest 4: vi.mock-factories worden tijdens
// hoisting al uitgevoerd voor modules die eager worden geïmporteerd
// (zoals next/navigation), terwijl `const`-declaraties NIET hoisten.
const { mockCreateUser, mockSignIn, mockUpsert, mockSlack } = vi.hoisted(() => ({
  mockCreateUser: vi.fn(),
  mockSignIn: vi.fn().mockResolvedValue({ error: null }),
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
  mockSlack: vi.fn(),
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
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { signupAction } from './actions'

function makeFormData(values: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

describe('signupAction', () => {
  beforeEach(() => {
    // Signup is standaard dicht (SIGNUP_ENABLED). Deze tests dekken de flow die
    // alléén draait als registratie openstaat, dus zetten we 'm hier aan.
    process.env.SIGNUP_ENABLED = 'true'
    mockCreateUser.mockReset()
    mockSignIn.mockReset()
    mockSignIn.mockResolvedValue({ error: null })
    mockUpsert.mockClear()
    mockUpsert.mockResolvedValue({ error: null })
    mockSlack.mockReset()
  })

  it('weigert registratie als SIGNUP_ENABLED niet aan staat', async () => {
    delete process.env.SIGNUP_ENABLED
    const result = await signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'X',
    }))
    expect(result.error).toMatch(/uitnodiging/i)
    expect(result.redirectTo).toBeUndefined()
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('vereist email, wachtwoord, bedrijfsnaam', async () => {
    const result = await signupAction({}, makeFormData({ email: '', wachtwoord: '', bedrijfsnaam: '' }))
    expect(result.error).toMatch(/vul/i)
    expect(result.redirectTo).toBeUndefined()
  })

  it('vereist wachtwoord van minstens 8 tekens', async () => {
    const result = await signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'kort', bedrijfsnaam: 'X',
    }))
    expect(result.error).toMatch(/wachtwoord/i)
  })

  it('roept admin.createUser met email_confirm=true + upsert + auto-signIn + slack, returnt redirectTo /wachtkamer', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' } },
      error: null,
    })

    const result = await signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'Bedrijf X',
    }))

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
    expect(result.redirectTo).toBe('/wachtkamer')
    expect(result.error).toBeUndefined()
  })

  it('returnt redirectTo /wachtkamer ook als profile-upsert faalt, en vlagt in Slack', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u2' } }, error: null,
    })
    mockUpsert.mockResolvedValueOnce({ error: { message: 'boom' } })

    const result = await signupAction({}, makeFormData({
      email: 'b@c.d', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'Y',
    }))

    expect(mockSlack).toHaveBeenCalledWith(
      expect.stringContaining('handmatig aanmaken')
    )
    expect(result.redirectTo).toBe('/wachtkamer')
  })

  it('returnt redirectTo /wachtkamer ook als auto-signIn faalt', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u3' } }, error: null,
    })
    mockSignIn.mockResolvedValueOnce({ error: { message: 'auth fail' } })

    const result = await signupAction({}, makeFormData({
      email: 'c@d.e', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'Z',
    }))

    expect(result.redirectTo).toBe('/wachtkamer')
    expect(mockSlack).toHaveBeenCalled()
  })

  it('retourneert error bij admin.createUser failure (geen redirectTo, geen slack, geen signIn)', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    const result = await signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'X',
    }))

    expect(result.error).toBeDefined()
    expect(result.redirectTo).toBeUndefined()
    expect(mockSignIn).not.toHaveBeenCalled()
    expect(mockSlack).not.toHaveBeenCalled()
  })
})
