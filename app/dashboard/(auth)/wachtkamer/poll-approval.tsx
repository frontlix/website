'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboardSupabaseBrowser } from '@/lib/dashboard/supabase-browser'

/**
 * Detecteert wanneer de huidige user wordt goedgekeurd en ververst de
 * pagina. Toont subtiele "we kijken mee"-indicator zodat de pending user
 * weet dat de pagina niet bevroren is.
 */
export function PollApproval() {
  const router = useRouter()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const supabase = getDashboardSupabaseBrowser()
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            const newRow = payload.new as { tenant_status?: string }
            if (newRow?.tenant_status === 'approved' && !cancelled) {
              router.refresh()
            }
          }
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .subscribe((status: any) => {
          if (!cancelled && status === 'SUBSCRIBED') {
            setConnected(true)
          }
        })

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

  return (
    <p
      style={{
        margin: '12px 0 0',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
      }}
    >
      {connected ? '✓ Verbonden, we sturen je automatisch door zodra je toegang krijgt.' : 'Verbinden…'}
    </p>
  )
}
