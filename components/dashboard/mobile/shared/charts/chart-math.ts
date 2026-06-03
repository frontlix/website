/**
 * Pure SVG-chart geometry helpers (geen React, geen DOM), los te testen.
 * Overgenomen uit het design-prototype (MobileAnalyses MaArea/MaDonut) en
 * gegeneraliseerd. Coördinaten in SVG-ruimte: y=0 is boven.
 */

export type Point = [number, number]

export type ScaleOpts = { w: number; h: number; pad?: number }

/** Schaal een getallenreeks naar [x,y]-punten binnen w×h (met verticale pad). */
export function scaleSeries(data: number[], { w, h, pad = 0 }: ScaleOpts): Point[] {
  if (data.length === 0) return []
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = Math.max(1, max - min)
  const dx = data.length > 1 ? w / (data.length - 1) : 0
  return data.map((v, i) => {
    const x = i * dx
    const y = h - pad - ((v - min) / span) * (h - pad * 2)
    return [x, y]
  })
}

/** 'M x y L x y L …' lijn-pad. */
export function toLinePath(pts: Point[]): string {
  if (pts.length === 0) return ''
  return 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L')
}

/** Lijn-pad gesloten naar de baseline (gevuld vlak). */
export function toAreaPath(pts: Point[], w: number, h: number): string {
  const line = toLinePath(pts)
  if (!line) return ''
  return `${line} L ${w} ${h} L 0 ${h} Z`
}

export type RingOpts = { size: number; stroke: number; pct: number }
export type RingGeometry = {
  r: number
  circumference: number
  dashOffset: number
  center: number
}

/** Donut/voortgangsring-geometrie. pct wordt geclampt naar 0..100. */
export function ringGeometry({ size, stroke, pct }: RingOpts): RingGeometry {
  const clamped = Math.max(0, Math.min(100, pct))
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  return {
    r,
    circumference,
    dashOffset: circumference * (1 - clamped / 100),
    center: size / 2,
  }
}
