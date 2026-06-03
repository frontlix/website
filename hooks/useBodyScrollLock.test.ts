import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Reference-counting van de body-scroll-lock. De bug die dit voorkomt:
 * meerdere overlays (modal + drawer + sheet) kunnen tegelijk open staan;
 * zonder telling ontgrendelt het sluiten van ÉÉN de body terwijl een ander
 * nog open is → "scroll maar niets beweegt" / achtergrond scrollt achter
 * een open overlay. De body mag pas vrij als de LAATSTE overlay sluit.
 *
 * Vitest draait in 'node' (geen jsdom), dus we stubben een minimale
 * `document` en resetten de module (module-level teller) per test.
 */
describe('body-scroll-lock reference counting', () => {
  beforeEach(() => {
    vi.resetModules()
    // Minimale document-stub, alleen body.style.overflow is relevant.
    ;(globalThis as unknown as { document: unknown }).document = {
      body: { style: { overflow: '' } },
    }
  })

  it('lockt bij eerste acquire, blijft locked bij tweede, ontgrendelt pas bij de laatste release', async () => {
    const { acquireBodyScrollLock, releaseBodyScrollLock } = await import('./useBodyScrollLock')
    const ov = () => (globalThis as unknown as { document: { body: { style: { overflow: string } } } }).document.body.style.overflow

    acquireBodyScrollLock()
    expect(ov()).toBe('hidden')

    acquireBodyScrollLock() // tweede overlay opent
    expect(ov()).toBe('hidden')

    releaseBodyScrollLock() // eerste overlay sluit, ander nog open
    expect(ov()).toBe('hidden')

    releaseBodyScrollLock() // laatste overlay sluit
    expect(ov()).toBe('')
  })

  it('release zonder voorafgaande acquire onderschrijdt niet (geen negatieve teller)', async () => {
    const { acquireBodyScrollLock, releaseBodyScrollLock } = await import('./useBodyScrollLock')
    const ov = () => (globalThis as unknown as { document: { body: { style: { overflow: string } } } }).document.body.style.overflow

    releaseBodyScrollLock()
    expect(ov()).toBe('')

    // Na een spurieuze release moet een echte acquire nog gewoon locken.
    acquireBodyScrollLock()
    expect(ov()).toBe('hidden')
    releaseBodyScrollLock()
    expect(ov()).toBe('')
  })
})
