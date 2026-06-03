'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export const REVEAL = 144
export const THRESHOLD = 40
const MAX = REVEAL + 24

/**
 * Pure snap-beslissing. `base` = de stand bij het begin van de drag:
 * - base 0 (gesloten): open in de veegrichting bij verplaatsing > THRESHOLD.
 * - base > 0 (open naar rechts): terugslepen voorbij THRESHOLD sluit → 0,
 *   anders blijft 'ie open. Zo kun je een open kaart terugvegen i.p.v. tikken.
 * - base < 0 (open naar links): idem gespiegeld.
 */
export function resolveSwipe(dx: number, base = 0): number {
  if (base > 0) return dx <= REVEAL - THRESHOLD ? 0 : REVEAL
  if (base < 0) return dx >= -(REVEAL - THRESHOLD) ? 0 : -REVEAL
  if (dx > THRESHOLD) return REVEAL
  if (dx < -THRESHOLD) return -REVEAL
  return 0
}

const clamp = (n: number) => Math.max(-MAX, Math.min(MAX, n))

// Beslis-drempel + horizontale bias voor de richting-lock.
const DECIDE_PX = 10 // pas richting bepalen na deze verplaatsing
const VERT_DOMINANCE = 1.3 // alleen 'scroll' als verticaal dít keer horizontaal overtreft

/** Settled-richting: 1 = links-lane open (veeg →), -1 = rechts-lane open (veeg ←), 0 = dicht. */
export type SwipeOpen = -1 | 0 | 1

export type SwipeReveal = {
  /** Hang aan het schuivende element; de hook koppelt touch-listeners en schrijft transform er rechtstreeks op. */
  ref: React.RefObject<HTMLDivElement | null>
  /** Gesettelde stand (verandert alléén bij snap/reset, niet per move). */
  open: SwipeOpen
  /** Snap terug naar 0 (met animatie). */
  reset: () => void
  /** True wanneer de laatste interactie écht bewoog, om tap te onderscheiden. */
  movedRef: React.MutableRefObject<boolean>
}

/**
 * Drag-to-reveal swipe-hook, NATIVE TOUCH + PERFORMANT.
 *
 * Waarom native touch-events i.p.v. React-pointer-events:
 *  - We koppelen `touchmove` als NON-passive listener, zodat we `preventDefault()`
 *    kunnen aanroepen zodra het gebaar horizontaal is. Daarmee claimen we de swipe
 *    hard, iOS kan 'm niet meer halverwege als lijst-scroll afpakken (de oorzaak
 *    van "kaart beweegt een stukje en springt terug / 2× moeten slepen").
 *  - Geen setPointerCapture nodig → geen capture-hitch mid-gebaar.
 *
 * Richting-lock met horizontale bias: pas na DECIDE_PX bepalen we de as; we kiezen
 * alleen 'verticaal' (laat scrollen) als verticaal duidelijk wint (× VERT_DOMINANCE),
 * zodat lichte verticale jitter een horizontale swipe niet saboteert.
 *
 * De transform wordt RECHTSTREEKS op het element geschreven (geen React-render per
 * frame). `open` verandert alleen bij settle/reset, genoeg voor de lanes + parent-
 * coördinatie. `onSettle(open)` vuurt SYNCHROON in touchend, zodat een parent z'n
 * eigen "welke kaart is open"-state in dezelfde batch kan zetten (geen stale-read).
 *
 * `enabled=false` (bv. expanded kaart) koppelt geen listeners → geen swipe.
 */
export function useSwipeReveal(
  enabled = true,
  onSettle?: (open: SwipeOpen) => void,
): SwipeReveal {
  const ref = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState<SwipeOpen>(0)

  const cur = useRef(0) // huidige/gesettelde dx (overleeft tussen gebaren)
  const movedRef = useRef(false)

  // onSettle in een ref zodat het effect niet herkoppelt bij een inline callback.
  const onSettleRef = useRef(onSettle)
  onSettleRef.current = onSettle

  // Schrijf de transform direct naar de DOM. Altijd translateX(…px) (ook 0) zodat
  // de snap-transitie soepel interpoleert.
  const paint = useCallback((dx: number, animate: boolean) => {
    const el = ref.current
    if (!el) return
    el.style.transition = animate ? 'transform 0.22s var(--ease-ios)' : 'none'
    el.style.transform = `translateX(${dx}px)`
  }, [])

  const reset = useCallback(() => {
    cur.current = 0
    paint(0, true)
    setOpen((prev) => (prev === 0 ? prev : 0))
  }, [paint])

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    // Per-gebaar transient state (closure-lokaal; overleeft via de listeners).
    let dragging = false
    let axis: 'none' | 'h' | 'v' = 'none'
    let startX = 0
    let startY = 0
    let base = 0

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      dragging = true
      axis = 'none'
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      base = cur.current
      movedRef.current = false
    }

    const onMove = (e: TouchEvent) => {
      if (!dragging) return
      const t = e.touches[0]
      if (!t) return
      const ddx = t.clientX - startX
      const ddy = t.clientY - startY

      if (axis === 'none') {
        const ax = Math.abs(ddx)
        const ay = Math.abs(ddy)
        if (ax < DECIDE_PX && ay < DECIDE_PX) return // nog te klein om te beslissen
        if (ay > ax * VERT_DOMINANCE) {
          // Verticaal wint duidelijk → laat de lijst scrollen; niet onze swipe.
          axis = 'v'
          dragging = false
          return
        }
        axis = 'h'
      }
      if (axis !== 'h') return

      // Claim de horizontale swipe (vereist passive:false) → iOS scrollt/steelt niet.
      e.preventDefault()
      const dx = clamp(base + ddx)
      cur.current = dx
      if (Math.abs(dx) > 4) movedRef.current = true
      paint(dx, false)
    }

    const settle = () => {
      if (!dragging) return
      dragging = false
      if (axis !== 'h') return // tap of verticaal gebaar → niets snappen
      const target = resolveSwipe(cur.current, base)
      cur.current = target
      paint(target, true)
      const next: SwipeOpen = target > 0 ? 1 : target < 0 ? -1 : 0
      setOpen((prev) => (prev === next ? prev : next))
      // Synchroon melden (binnen touchend) → batcht met de parent-state.
      onSettleRef.current?.(next)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', settle, { passive: true })
    el.addEventListener('touchcancel', settle, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', settle)
      el.removeEventListener('touchcancel', settle)
    }
  }, [enabled, paint])

  return { ref, open, reset, movedRef }
}
