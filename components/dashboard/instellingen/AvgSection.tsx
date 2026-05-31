'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, AlertTriangle } from 'lucide-react'
import {
  requestAccountDeleteAction,
  requestDataExportAction,
} from '@/lib/dashboard/avg-actions'
import styles from './AccountSection.module.css'

export function AvgSection() {
  return (
    <div className={styles.stack}>
      <ExportCard />
      <DeleteCard />
    </div>
  )
}

function ExportCard() {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const onClick = () => {
    setMsg(null)
    startTransition(async () => {
      const result = await requestDataExportAction()
      setMsg(result.ok ? { ok: true, text: result.message ?? 'Aanvraag genoteerd.' } : { ok: false, text: result.error })
    })
  }

  return (
    <div className={`${styles.card} dash-card`}>
      <div className={styles.cardHead}>
        <Download size={18} />
        <div>
          <div className={styles.cardTitle}>Exporteer mijn data</div>
          <div className={styles.cardSub}>
            We verzamelen al je leads, gesprekken, foto&apos;s en offertes. Na je aanvraag neemt Frontlix contact met je op zodra je data klaarstaat.
          </div>
        </div>
      </div>
      {msg && <div className={msg.ok ? styles.ok : styles.error}>{msg.text}</div>}
      <button type="button" onClick={onClick} disabled={pending} className={styles.submitBtn}>
        <Download size={13} /> {pending ? 'Aanvragen…' : 'Vraag export aan'}
      </button>
    </div>
  )
}

function DeleteCard() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMsg(null)
    startTransition(async () => {
      const result = await requestAccountDeleteAction(fd)
      if (result.ok) {
        setMsg({ ok: true, text: result.message ?? 'Verzoek genoteerd.' })
        // Na een korte beat naar /login — de session is ongeldig gemaakt.
        setTimeout(() => router.push('/login'), 1500)
      } else {
        setMsg({ ok: false, text: result.error })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className={`${styles.card} dash-card`} style={{ borderColor: 'rgba(220, 38, 38, 0.3)' }}>
      <div className={styles.cardHead} style={{ color: '#991b1b' }}>
        <AlertTriangle size={18} />
        <div>
          <div className={styles.cardTitle}>Verwijder mijn account</div>
          <div className={styles.cardSub}>
            Onomkeerbaar. Alle leads, gesprekken en offertes worden binnen 30 dagen permanent verwijderd. Je wordt direct uitgelogd.
          </div>
        </div>
      </div>
      <div className={styles.fields}>
        <label className={styles.label}>
          <span>Bevestig door &ldquo;VERWIJDER&rdquo; te typen</span>
          <input type="text" name="bevestiging" required className={styles.input} placeholder="VERWIJDER" />
        </label>
      </div>
      {msg && <div className={msg.ok ? styles.ok : styles.error}>{msg.text}</div>}
      <button
        type="submit"
        disabled={pending}
        className={styles.submitBtn}
        style={{ background: '#dc2626' }}
      >
        <AlertTriangle size={13} /> {pending ? 'Bezig…' : 'Account verwijderen'}
      </button>
    </form>
  )
}
