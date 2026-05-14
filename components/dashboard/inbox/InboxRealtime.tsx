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
 * achter elkaar) 5 refreshes triggert — alleen de laatste telt.
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

    // Cast naar any: Supabase JS-typings exposen postgres_changes niet
    // cleanly via de generieke .channel().on() overloads.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase.channel('inbox-list-rt') as any)
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
