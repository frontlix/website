import { describe, it, expect } from 'vitest'
import { scaleSeries, toLinePath, toAreaPath, ringGeometry } from './chart-math'

describe('scaleSeries', () => {
  it('maps first/last x across full width and inverts y (svg origin top-left)', () => {
    const pts = scaleSeries([0, 10], { w: 100, h: 50, pad: 0 })
    expect(pts[0]).toEqual([0, 50]) // min value → bottom (y=h)
    expect(pts[1]).toEqual([100, 0]) // max value → top (y=0)
  })

  it('handles a flat series without dividing by zero', () => {
    const pts = scaleSeries([5, 5, 5], { w: 100, h: 50, pad: 4 })
    expect(pts.every(([, y]) => Number.isFinite(y))).toBe(true)
    expect(pts.map(([x]) => Math.round(x))).toEqual([0, 50, 100])
  })
})

describe('toLinePath / toAreaPath', () => {
  it('builds an M..L line path', () => {
    expect(toLinePath([[0, 50], [100, 0]])).toBe('M0.0 50.0 L100.0 0.0')
  })
  it('closes the area down to the baseline', () => {
    expect(toAreaPath([[0, 50], [100, 0]], 100, 60)).toBe(
      'M0.0 50.0 L100.0 0.0 L 100 60 L 0 60 Z',
    )
  })
})

describe('ringGeometry', () => {
  it('computes radius, circumference and dashoffset for a percentage', () => {
    const g = ringGeometry({ size: 62, stroke: 7, pct: 0 })
    expect(g.r).toBeCloseTo(27.5)
    expect(g.dashOffset).toBeCloseTo(g.circumference) // 0% → fully offset
    const half = ringGeometry({ size: 62, stroke: 7, pct: 50 })
    expect(half.dashOffset).toBeCloseTo(half.circumference / 2)
  })
  it('clamps pct to 0..100', () => {
    expect(ringGeometry({ size: 62, stroke: 7, pct: 150 }).dashOffset).toBeCloseTo(0)
    expect(ringGeometry({ size: 62, stroke: 7, pct: -10 }).dashOffset).toBeCloseTo(
      ringGeometry({ size: 62, stroke: 7, pct: 0 }).circumference,
    )
  })
})
