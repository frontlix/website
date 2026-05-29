import { describe, it, expect } from 'vitest'
import {
  voornaam,
  fillTemplate,
  reviewCounts,
  filterReviews,
  type MobileReview,
} from './review-helpers'

const reviews: MobileReview[] = [
  { id: 'a', naam: 'Anna Smit', initial: 'A', color: '#4285F4', sterren: 5, datum: '2 dagen geleden', plaats: 'Den Haag', text: '...', status: 'nieuw' },
  { id: 'b', naam: 'Sandra Janssen', initial: 'S', color: '#EA4335', sterren: 4, datum: '1 week geleden', plaats: 'Pijnacker', text: '...', status: 'beantwoord', reply: 'Bedankt!' },
  { id: 'c', naam: 'Bert Koning', initial: 'B', color: '#5F6368', sterren: 2, datum: '2 weken geleden', plaats: 'Utrecht', text: '...', status: 'nieuw', flag: true },
]

describe('voornaam', () => {
  it('takes the first word', () => expect(voornaam('Anna Smit')).toBe('Anna'))
  it('lowercases the literal "Familie"', () => expect(voornaam('Familie Kuiper')).toBe('familie'))
})

describe('fillTemplate', () => {
  it('substitutes {v} with the first name', () => {
    expect(fillTemplate('Bedankt {v}!', 'Anna Smit')).toBe('Bedankt Anna!')
  })
})

describe('reviewCounts', () => {
  it('counts nieuw/beantwoord/aandacht, respecting locally-placed replies', () => {
    expect(reviewCounts(reviews, {})).toEqual({ nieuw: 2, beantwoord: 1, aandacht: 1 })
    // 'a' beantwoord deze sessie → schuift van nieuw naar beantwoord
    expect(reviewCounts(reviews, { a: 'dank!' })).toEqual({ nieuw: 1, beantwoord: 2, aandacht: 1 })
    // 'c' (flag) beantwoord → verdwijnt uit aandacht
    expect(reviewCounts(reviews, { c: 'sorry' }).aandacht).toBe(0)
  })
})

describe('filterReviews', () => {
  it('nieuw excludes locally-replied', () => {
    expect(filterReviews(reviews, 'nieuw', {}).map((r) => r.id)).toEqual(['a', 'c'])
    expect(filterReviews(reviews, 'nieuw', { a: 'x' }).map((r) => r.id)).toEqual(['c'])
  })
  it('beantwoord includes existing + locally-replied', () => {
    expect(filterReviews(reviews, 'beantwoord', { a: 'x' }).map((r) => r.id)).toEqual(['a', 'b'])
  })
  it('aandacht = flagged & not yet replied', () => {
    expect(filterReviews(reviews, 'aandacht', {}).map((r) => r.id)).toEqual(['c'])
    expect(filterReviews(reviews, 'aandacht', { c: 'x' })).toEqual([])
  })
})
