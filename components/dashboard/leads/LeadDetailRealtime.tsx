'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboardSupabaseBrowser } from '@/lib/dashboard/supabase-browser'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'

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
    let active = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    // Filter doen we in de callback i.p.v. via postgres_changes filter-string;
    // die bleek onbetrouwbaar voor TEXT-IDs met hyphens (lead_id heeft die).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onInsert = (payload: any) => {
      console.log('[realtime] insert event RAW', JSON.stringify(payload).slice(0, 300))
      if (payload?.new?.lead_id === leadId) {
        console.log('[realtime] match → router.refresh()')
        router.refresh()
      }
    }

    // Realtime auth: bij @supabase/ssr leeft de session in cookies maar de
    // realtime-websocket pakt die niet altijd automatisch op. Expliciet
    // de access token meegeven garandeert dat RLS-policies kloppen + events
    // de subscriber bereiken. Zonder dit: subscription verbindt wel, maar
    // events worden silently door RLS gefilterd.
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      console.log('[realtime] session?', !!session?.access_token, 'user:', session?.user?.id)
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
        console.log('[realtime] setAuth done')
      } else {
        console.warn('[realtime] NO session/token → RLS zal alle events filteren')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel = (supabase.channel(`lead-${leadId}`) as any)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'berichten' },
          onInsert,
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'fotos' },
          onInsert,
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .subscribe((status: any) => {
          console.log('[realtime] subscribe status', status)
          if (active) setConnected(status === 'SUBSCRIBED')
        })
    })()

    // Polling-fallback: elke 8s router.refresh() ALLEEN als de tab actief
    // is. Realtime is primair, dit is verzekering — als de websocket-events
    // niet doorkomen (RLS-filter, stale token, netwerk-flaky) zien we nieuwe
    // berichten alsnog binnen ~8s. Idle tabs verbruiken niets dankzij de
    // visibilityState-check.
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }, 8000)

    return () => {
      active = false
      clearInterval(pollInterval)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [leadId, router])

  // LiveDot pulseert continu; bij disconnect tonen we niets (de DB-realtime
  // is een silent feature, geen status-indicator op zich). Connected-flag
  // blijft beschikbaar voor toekomstige uitbreiding.
  return connected ? <LiveDot /> : null
}
