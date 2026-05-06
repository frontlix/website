import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Supabase server-client voordat we onze module importeren.
const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import { getCurrentUser, getCurrentUserProfile } from './auth'

describe('getCurrentUser', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
  })

  it('retourneert de user als ingelogd', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' } },
      error: null,
    })

    const user = await getCurrentUser()

    expect(user).not.toBeNull()
    expect(user!.id).toBe('u1')
  })

  it('retourneert null als niet ingelogd', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const user = await getCurrentUser()

    expect(user).toBeNull()
  })

  it('retourneert null bij Supabase-error (geen exceptie)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired' },
    })

    const user = await getCurrentUser()

    expect(user).toBeNull()
  })
})

describe('getCurrentUserProfile', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockMaybeSingle.mockReset()
    mockSelect.mockClear()
    mockFrom.mockClear()
    mockEq.mockClear()
  })

  it('retourneert de profile-rij als user ingelogd is', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    mockMaybeSingle.mockResolvedValue({
      data: {
        user_id: 'u1',
        tenant_status: 'approved',
        bedrijfsnaam: 'Schoon Straatje',
        is_owner: true,
        onboarding_voltooid_op: null,
      },
      error: null,
    })

    const profile = await getCurrentUserProfile()

    expect(profile).not.toBeNull()
    expect(profile!.tenant_status).toBe('approved')
    expect(mockFrom).toHaveBeenCalledWith('dashboard_user_profiles')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('retourneert null als user niet ingelogd is (skipt query)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const profile = await getCurrentUserProfile()

    expect(profile).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('retourneert null als profile-rij niet bestaat', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const profile = await getCurrentUserProfile()

    expect(profile).toBeNull()
  })
})
