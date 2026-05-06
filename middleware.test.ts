import { describe, it, expect, vi, beforeEach } from 'vitest'

// We mocken @supabase/ssr volledig — middleware moet werken zonder echte DB.
const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

import { middleware } from './middleware'

function makeRequest(host: string, pathname: string, hasSession = false) {
  const url = new URL(`https://${host}${pathname}`)
  const cookies = hasSession
    ? { 'sb-access-token': 'fake' }
    : ({} as Record<string, string>)

  return {
    nextUrl: { ...url, pathname, clone: () => new URL(url.toString()) },
    url: url.toString(),
    headers: new Headers({ host }),
    cookies: {
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      get: (name: string) =>
        cookies[name] ? { name, value: cookies[name] } : undefined,
      set: vi.fn(),
    },
  } as unknown as Parameters<typeof middleware>[0]
}

describe('middleware host-based routing', () => {
  beforeEach(() => mockGetUser.mockReset())

  it('app.frontlix.com / met session → rewrite naar /dashboard/', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const req = makeRequest('app.frontlix.com', '/', true)

    const res = await middleware(req)

    expect(res.headers.get('x-middleware-rewrite')).toMatch(/\/dashboard$|\/dashboard\//)
  })

  it('frontlix.com / → laat door, geen rewrite, geen redirect', async () => {
    const req = makeRequest('frontlix.com', '/', false)

    const res = await middleware(req)

    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
    expect(res.status).not.toBe(307)
    expect(res.status).not.toBe(308)
  })

  it('frontlix.com /dashboard/leads → 404 (block dashboard via marketing host)', async () => {
    const req = makeRequest('frontlix.com', '/dashboard/leads', false)

    const res = await middleware(req)

    expect(res.status).toBe(404)
  })

  it('app.frontlix.com /leads zonder session → redirect naar /login met next param', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('app.frontlix.com', '/leads', false)

    const res = await middleware(req)

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/\/login/)
    expect(location).toMatch(/next=%2Fleads/)
  })

  it('app.frontlix.com /login zonder session → rewrite naar /dashboard/login (laat door)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('app.frontlix.com', '/login', false)

    const res = await middleware(req)

    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-rewrite')).toMatch(/\/dashboard\/login/)
  })

  it('app.frontlix.com /login MET session → redirect naar /leads (skip auth-pagina)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const req = makeRequest('app.frontlix.com', '/login', true)

    const res = await middleware(req)

    expect(res.headers.get('location')).toMatch(/\/leads/)
  })

  it('app.frontlix.com /wachtkamer zonder session → rewrite naar /dashboard/wachtkamer (publiek)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('app.frontlix.com', '/wachtkamer', false)

    const res = await middleware(req)

    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-rewrite')).toMatch(/\/dashboard\/wachtkamer/)
  })

  it('app.frontlix.com /dashboard/leads (expliciet getypte prefix) → redirect naar /leads', async () => {
    const req = makeRequest('app.frontlix.com', '/dashboard/leads', false)

    const res = await middleware(req)

    expect(res.headers.get('location')).toMatch(/\/leads$/)
  })
})
