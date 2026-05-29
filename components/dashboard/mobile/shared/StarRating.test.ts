import { describe, it, expect } from 'vitest'
import { starFills } from './star-fills'

describe('starFills', () => {
  it('full stars for an integer rating', () => {
    expect(starFills(5)).toEqual([100, 100, 100, 100, 100])
    expect(starFills(0)).toEqual([0, 0, 0, 0, 0])
  })
  it('partial fill for a fractional rating', () => {
    expect(starFills(4.8)).toEqual([100, 100, 100, 100, 80])
  })
  it('clamps each star between 0 and 100', () => {
    expect(starFills(2)).toEqual([100, 100, 0, 0, 0])
    expect(starFills(3.5)).toEqual([100, 100, 100, 50, 0])
  })
})
