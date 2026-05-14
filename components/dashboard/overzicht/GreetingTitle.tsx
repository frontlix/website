'use client'

import { useEffect, useState } from 'react'
import { getGreeting } from '@/lib/dashboard/greeting'

/**
 * Live tijd-afhankelijke begroeting in de section-head. Krijgt de server-
 * berekende greeting mee als initial-value (hydration-safe) en update
 * vervolgens elke minuut + bij tab-visibility-change zodat de groet vanzelf
 * wisselt rond 12:00 en 18:00 zonder dat de gebruiker hoeft te refreshen.
 */
export function GreetingTitle({
  initialGreeting,
  voornaam,
}: {
  initialGreeting: string
  voornaam: string
}) {
  const [greeting, setGreeting] = useState(initialGreeting)

  useEffect(() => {
    const sync = () => setGreeting(getGreeting(new Date()))

    // Direct sync — vangt het zeldzame geval op dat de server-tijd net vóór
    // de boundary was en de client er net overheen.
    sync()

    // Elke minuut hercheck. Goedkoop, en hoeft geen exacte boundary-math.
    const intervalId = window.setInterval(sync, 60_000)

    // Laptop uit-sluimer / tab-switch → direct opnieuw syncen ipv wachten
    // op de volgende interval-tick.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <>
      {greeting}, {voornaam}
    </>
  )
}
