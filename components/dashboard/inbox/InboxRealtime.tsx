'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboardSupabaseBrowser } from '@/lib/dashboard/supabase-browser'

/**
 * Onzichtbaar realtime-component voor de inbox-lijst. Abonneert op INSERT
 * events op de `berichten` tabel (alle leads) en triggert een gedebounced
 * `router.refresh()` zodat:
 *   - nieuwe gesprekken automatisch in de lijst verschijnen
 *   - "laatste bericht" previews vanzelf updaten
 *   - de Ongelezen-count meebeweegt
 *
 * Debounce van 500ms voorkomt dat een burst van berichten (klant typt 5x
 * achter elkaar) 5 refreshes triggert, alleen de laatste telt.
 */
export function InboxRealtime() {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = getDashboardSupabaseBrowser()

    const scheduleRefresh = () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        router.refresh()
      }, 500)
    }

    // Unieke topic per effect-run. realtime-js `channel(topic)` geeft een
    // BESTAAND kanaal met dezelfde topic terug; onder React StrictMode (dev)
    // wordt het kanaal bij de directe remount hergebruikt vóór de async
    // removeChannel klaar is → `.on('postgres_changes')` ná `subscribe()` →
    // throw. Een unieke naam voorkomt die hergebruik-race. (Math.random
    // i.p.v. crypto.randomUUID: dat laatste bestaat niet in een insecure
    // context zoals testen via http://LAN-IP.)
    const topic = `inbox-list-rt-${Date.now()}-${Math.random().toString(36).slice(2)}`
    // Cast naar any: Supabase JS-typings exposen postgres_changes niet
    // cleanly via de generieke .channel().on() overloads.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase.channel(topic) as any)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'berichten' },
        scheduleRefresh,
      )
      .subscribe()

    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
