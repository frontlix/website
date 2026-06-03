'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { markInboxRead } from '@/lib/dashboard/lead-actions'

/**
 * Onzichtbaar side-effect component. Roept de markInboxRead server-action
 * aan zodra een gesprek geselecteerd wordt (parent geeft leadId mee via
 * ?lead=... URL-param). Na succes triggert het router.refresh() zodat de
 * "Ongelezen" count in de filter-tabs vanzelf bijwerkt.
 *
 * Idempotent: re-mounten op hetzelfde leadId zet de timestamp gewoon
 * opnieuw, geen probleem.
 */
export function InboxMarkRead({ leadId }: { leadId: string }) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const result = await markInboxRead(leadId)
      if (!cancelled && result.ok) {
        // Server-side counts en filter zijn nu bijgewerkt, page refreshen
        // zodat de unread-count in de UI synchroon loopt.
        router.refresh()
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [leadId, router])

  return null
}
