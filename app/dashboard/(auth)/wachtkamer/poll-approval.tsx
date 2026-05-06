'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createDashboardClient } from '@/lib/dashboard/supabase-browser'

/**
 * Detecteert wanneer de huidige user wordt goedgekeurd door Frontlix-admin
 * en ververst de pagina (waarna de Server Component naar /leads redirect).
 *
 * Werkt via realtime channel — geen polling-loop, dus geen onnodige load.
 */
export function PollApproval() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createDashboardClient()
    let cancelled = false

    async function setup() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel(`profile:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dashboard_user_profiles',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newRow = payload.new as { tenant_status?: string }
            if (newRow?.tenant_status === 'approved' && !cancelled) {
              router.refresh()
            }
          }
        )
        .subscribe()

      return () => {
        cancelled = true
        void supabase.removeChannel(channel)
      }
    }

    const cleanup = setup()
    return () => {
      void cleanup.then((fn) => fn?.())
    }
  }, [router])

  return null
}
