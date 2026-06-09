// lib/google-oauth.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { buildConsentUrl, redirectUri } from './google-oauth'

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD = 'http://localhost:3000'
})

describe('buildConsentUrl', () => {
  it('bevat de juiste scopes, offline access en consent-prompt', () => {
    const url = new URL(buildConsentUrl('state-abc'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('test-client-id')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('state')).toBe('state-abc')
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri())
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/calendar')
    expect(url.searchParams.get('scope')).toContain('email')
  })
})
