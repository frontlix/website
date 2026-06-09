// lib/crypto/calendar-token.ts
import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const b64 = process.env.CALENDAR_TOKEN_ENC_KEY
  if (!b64) throw new Error('CALENDAR_TOKEN_ENC_KEY ontbreekt')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('CALENDAR_TOKEN_ENC_KEY moet 32 bytes zijn (base64)')
  return key
}

/** Versleutelt UTF-8 plaintext. Output: base64(iv[12] + authTag[16] + ciphertext). */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

/** Ontsleutelt het base64(iv + authTag + ciphertext) formaat terug naar UTF-8. */
export function decryptToken(payload: string): string {
  const raw = Buffer.from(payload, 'base64')
  const iv = raw.subarray(0, IV_LEN)
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = raw.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
