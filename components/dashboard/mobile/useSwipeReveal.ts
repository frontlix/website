'use client'
import { useRef, useState, useCallback } from 'react'

export const REVEAL = 144
export const THRESHOLD = 40
const MAX = REVEAL + 24

/** Pure snap-beslissing op basis van eind-dx. */
export function resolveSwipe(dx: number): number {
  if (dx > THRESHOLD) return REVEAL
  if (dx < -THRESHOLD) return -REVEAL
  return 0
}

const clamp = (n: number) => Math.max(-MAX, Math.min(MAX, n))

export type SwipeState = {
  dx: number
  dragging: boolean
  moved: boolean
  bind: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }
  reset: () => void
}

/**
 * Drag-to-reveal swipe-hook. `enabled=false` (bv. expanded card) bindt geen
 * gedrag en houdt dx op 0. `moved` onderscheidt een tap van een swipe.
 */
export function useSwipeReveal(enabled = true): SwipeState {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef(0)
  const moved = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled) return
    start.current = e.clientX - dx
    moved.current = false
    setDragging(true)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }, [enabled, dx])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!enabled || !dragging) return
    const next = clamp(e.clientX - start.current)
    if (Math.abs(next) > 4) moved.current = true
    setDx(next)
  }, [enabled, dragging])

  const onPointerUp = useCallback(() => {
    if (!enabled) return
    setDragging(false)
    setDx((cur) => resolveSwipe(cur))
  }, [enabled])

  const reset = useCallback(() => setDx(0), [])

  return { dx, dragging, moved: moved.current, bind: { onPointerDown, onPointerMove, onPointerUp }, reset }
}
