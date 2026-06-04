'use client'

import { useEffect, useRef, useState } from 'react'
import { isComplete, phaseDuration, remainingAfter } from './timeline'
import type { SceneProps } from './types'

/**
 * Speelt een reeks fases af (durations in ms) en geeft de huidige
 * fase-index terug; index === durations.length betekent eindstand.
 * Pauze (playing=false) onthoudt de resterende tijd van de lopende fase.
 */
export function useSceneTimeline(
  durations: readonly number[],
  { playing, finished, onSceneEnd }: SceneProps
): number {
  const [phase, setPhase] = useState(0)
  const remainingRef = useRef<number | null>(null)
  const endedRef = useRef(false)
  const onSceneEndRef = useRef(onSceneEnd)
  onSceneEndRef.current = onSceneEnd

  // finished (reduced motion of overslaan) → direct naar de eindstand
  useEffect(() => {
    if (finished) setPhase(durations.length)
  }, [finished, durations.length])

  // meld éénmalig dat de eindstand is bereikt
  useEffect(() => {
    if (isComplete(phase, durations.length) && !endedRef.current) {
      endedRef.current = true
      onSceneEndRef.current()
    }
  }, [phase, durations.length])

  // timer voor de lopende fase; cleanup onthoudt resterende tijd bij pauze
  useEffect(() => {
    if (finished || !playing) return
    const duration = phaseDuration(durations, phase)
    if (duration === null) return

    const wait = remainingRef.current ?? duration
    const startedAt = Date.now()
    let fired = false
    const timer = setTimeout(() => {
      fired = true
      remainingRef.current = null
      setPhase((p) => p + 1)
    }, wait)

    return () => {
      clearTimeout(timer)
      if (!fired) remainingRef.current = remainingAfter(wait, startedAt, Date.now())
    }
  }, [playing, finished, phase, durations])

  return phase
}
