'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Inbox, X } from 'lucide-react'
import { getDashboardSupabaseBrowser } from '@/lib/dashboard/supabase-browser'
import styles from './LeadsRealtimeToast.module.css'

type Toast = {
  id: string
  leadId: string
  naam: string
}

/**
 * Luistert op de Supabase realtime kanaal voor nieuwe leads en toont
 * een toast met "Open" CTA. Auto-refresht de leads-pagina zodat de
 * nieuwe rij verschijnt — zonder dat de gebruiker hoeft te refreshen.
 *
 * Mount alleen op /leads (de page-component zet 'm in zijn return).
 */
export function LeadsRealtimeToast() {
  const router = useRouter()
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const supabase = getDashboardSupabaseBrowser()
    const channel = supabase
      .channel('leads-list-rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const row = payload.new as { lead_id: string; naam: string }
          const t: Toast = {
            id: `${row.lead_id}-${Date.now()}`,
            leadId: row.lead_id,
            naam: row.naam,
          }
          setToasts((prev) => [...prev, t])
          router.refresh()
          // Auto-dismiss na 8s
          setTimeout(() => {
            setToasts((prev) => prev.filter((p) => p.id !== t.id))
          }, 8000)
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [router])

  if (toasts.length === 0) return null

  return (
    <div className={styles.stack}>
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast}>
          <div className={styles.icon}>
            <Inbox size={14} />
          </div>
          <div className={styles.body}>
            <div className={styles.title}>Nieuwe lead</div>
            <div className={styles.sub}>{t.naam} — net binnen</div>
          </div>
          <Link href={`/leads/${t.leadId}`} className={styles.openBtn}>
            Open
          </Link>
          <button
            type="button"
            onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
            className={styles.closeBtn}
            aria-label="Sluit melding"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
