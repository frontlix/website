'use client'
import { useEffect, useState } from 'react'

/**
 * SSR-safe matchMedia check. Geëxporteerd voor unit-testing
 * los van React-rendering (vitest draait in node-env zonder jsdom).
 */
export function getInitialMatch(query: string): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

/**
 * Reactive CSS media-query hook. Server-rendered als `false` om
 * hydration-mismatch te voorkomen; na mount checkt hij de echte
 * viewport en luistert hij op changes.
 */
export function useMediaQuery(query: string): boolean {
  // Altijd `false` als initial state, anders zou de client-init via
  // getInitialMatch() afwijken van de server-render (true vs false),
  // wat Next.js als hydration-mismatch logt. useEffect zet de echte
  // waarde direct na mount.
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
