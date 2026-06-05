import { describe, expect, it } from 'vitest'
import { CHAPTERS } from './chapters'

describe('CHAPTERS', () => {
  it('bevat 12 hoofdstukken: welkom, 10 tour-stappen en een slot', () => {
    expect(CHAPTERS).toHaveLength(12)
    expect(CHAPTERS[0].kind).toBe('welcome')
    expect(CHAPTERS[CHAPTERS.length - 1].kind).toBe('outro')
    expect(CHAPTERS.filter((c) => c.kind === 'tour')).toHaveLength(10)
    const ids = CHAPTERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('heeft voor elk hoofdstuk titel, menuLabel, body en een duur', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.title.length).toBeGreaterThan(0)
      expect(chapter.menuLabel.length).toBeGreaterThan(0)
      expect(chapter.body.length).toBeGreaterThan(20)
      expect(chapter.durSec).toBeGreaterThan(0)
    }
  })

  it('geeft elke tour-stap minstens drie bullets, welkom en slot geen', () => {
    for (const chapter of CHAPTERS) {
      if (chapter.kind === 'tour') {
        expect(chapter.bullets.length).toBeGreaterThanOrEqual(3)
      } else {
        expect(chapter.bullets).toHaveLength(0)
      }
    }
  })

  it('heeft voor elke tour-stap een regie-functie', () => {
    for (const chapter of CHAPTERS) {
      expect(typeof chapter.run).toBe('function')
    }
  })

  it('volgt de huisstijl: geen streepjes in zichtbare teksten', () => {
    for (const chapter of CHAPTERS) {
      for (const tekst of [chapter.title, chapter.menuLabel, chapter.body, ...chapter.bullets]) {
        expect(tekst).not.toMatch(/—|–/)
      }
    }
  })
})
