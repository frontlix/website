import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockGetProfile, mockRedirect } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetProfile: vi.fn(),
  mockRedirect: vi.fn(() => { throw new Error('REDIRECT') }),
}))

vi.mock('./auth', () => ({
  getCurrentUser: mockGetUser,
  getCurrentUserProfile: mockGetProfile,
}))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

import { requireApprovedUser } from './require-approved-user'

describe('requireApprovedUser', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockGetProfile.mockReset()
    mockRedirect.mockClear()
  })

  it('returnt {user, profile} als ingelogd én approved', async () => {
    const user = { id: 'u1', email: 'a@b.c' } as any
    const profile = {
      user_id: 'u1',
      tenant_status: 'approved',
      bedrijfsnaam: 'Schoon Straatje',
      is_owner: true,
      onboarding_voltooid_op: null,
    }
    mockGetUser.mockResolvedValue(user)
    mockGetProfile.mockResolvedValue(profile)

    const result = await requireApprovedUser()

    expect(result.user).toBe(user)
    expect(result.profile).toBe(profile)
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirect naar /login als niet ingelogd', async () => {
    mockGetUser.mockResolvedValue(null)

    await expect(requireApprovedUser()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirect naar /wachtkamer als ingelogd maar tenant_status pending', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1' })
    mockGetProfile.mockResolvedValue({
      user_id: 'u1', tenant_status: 'pending', bedrijfsnaam: null, is_owner: true, onboarding_voltooid_op: null,
    })

    await expect(requireApprovedUser()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })

  it('redirect naar /wachtkamer als profile-rij ontbreekt', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1' })
    mockGetProfile.mockResolvedValue(null)

    await expect(requireApprovedUser()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })

  it('redirect naar /wachtkamer als tenant_status rejected', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1' })
    mockGetProfile.mockResolvedValue({
      user_id: 'u1', tenant_status: 'rejected', bedrijfsnaam: null, is_owner: true, onboarding_voltooid_op: null,
    })

    await expect(requireApprovedUser()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })
})
