'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboardSupabaseBrowser } from '@/lib/dashboard/supabase-browser'
import { LiveIndicator } from './LiveIndicator'

/**
 * Onzichtbaar (qua data-flow) component dat Supabase Realtime abonneert
 * op INSERTs in `berichten` en `fotos` voor het huidige lead_id, en bij
 * elke event `router.refresh()` triggert. Server fetcht opnieuw,
 * page re-rendert — geen client-state-mutations.
 *
 * Rendert wel een kleine LiveIndicator zodat de user de connection-status ziet.
 */
export function LeadDetailRealtime({ leadId }: { leadId: string }) {
  const router = useRouter()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const supabase = getDashboardSupabaseBrowser()

    // Cast to any to avoid Supabase typings not cleanly exposing postgres_changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase.channel(`lead-${leadId}`) as any)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'berichten',
          filter: `lead_id=eq.${leadId}`,
        },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fotos',
          filter: `lead_id=eq.${leadId}`,
        },
        () => router.refresh()
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .subscribe((status: any) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [leadId, router])

  return <LiveIndicator connected={connected} />
}
