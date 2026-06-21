import { describe, it, expect } from 'vitest'
import { isValidEmail, resolveReceiveEmail, normalizeWhatsapp } from './owner-contact'

describe('resolveReceiveEmail', () => {
  it('override wint als ingevuld', () => {
    expect(resolveReceiveEmail('a@b.nl', 'basis@b.nl')).toBe('a@b.nl')
  })
  it('volgt basis bij lege override', () => {
    expect(resolveReceiveEmail('', 'basis@b.nl')).toBe('basis@b.nl')
    expect(resolveReceiveEmail('   ', 'basis@b.nl')).toBe('basis@b.nl')
    expect(resolveReceiveEmail(null, 'basis@b.nl')).toBe('basis@b.nl')
  })
  it('geeft null als er niets bruikbaars is', () => {
    expect(resolveReceiveEmail(null, null)).toBeNull()
    expect(resolveReceiveEmail('', '  ')).toBeNull()
  })
  it('trimt de teruggegeven waarde', () => {
    expect(resolveReceiveEmail(' a@b.nl ', null)).toBe('a@b.nl')
  })
})

describe('normalizeWhatsapp', () => {
  it('NL 06-nummer wordt 316...', () => {
    expect(normalizeWhatsapp('0612345678')).toBe('31612345678')
  })
  it('+31 met spaties wordt 31...', () => {
    expect(normalizeWhatsapp('+31 6 12 34 56 78')).toBe('31612345678')
  })
  it('00-prefix wordt gestript', () => {
    expect(normalizeWhatsapp('0031612345678')).toBe('31612345678')
  })
  it('al genormaliseerd blijft gelijk', () => {
    expect(normalizeWhatsapp('31612345678')).toBe('31612345678')
  })
  it('leeg of onzin geeft null', () => {
    expect(normalizeWhatsapp('')).toBeNull()
    expect(normalizeWhatsapp('  ')).toBeNull()
    expect(normalizeWhatsapp('06-123')).toBeNull() // te kort
  })
})

describe('isValidEmail', () => {
  it('herkent geldig en ongeldig', () => {
    expect(isValidEmail('a@b.nl')).toBe(true)
    expect(isValidEmail(' a@b.nl ')).toBe(true)
    expect(isValidEmail('geen-email')).toBe(false)
  })
})
