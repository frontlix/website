// lib/crypto/calendar-token.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { encryptToken, decryptToken } from './calendar-token'

const KEY_B64 = Buffer.alloc(32, 7).toString('base64') // 32 bytes, deterministisch

beforeAll(() => {
  process.env.CALENDAR_TOKEN_ENC_KEY = KEY_B64
})

describe('calendar-token crypto', () => {
  it('round-trips een token', () => {
    const plain = '1//04abcDEF_refresh-token-example'
    const enc = encryptToken(plain)
    expect(enc).not.toContain(plain)
    expect(decryptToken(enc)).toBe(plain)
  })

  it('produceert elke keer een andere ciphertext (random IV)', () => {
    expect(encryptToken('zelfde')).not.toBe(encryptToken('zelfde'))
  })

  it('faalt op een gemanipuleerde ciphertext (auth-tag)', () => {
    const enc = encryptToken('geheim')
    const raw = Buffer.from(enc, 'base64')
    raw[raw.length - 1] ^= 0xff // laatste byte van de ciphertext flippen
    expect(() => decryptToken(raw.toString('base64'))).toThrow()
  })
})
