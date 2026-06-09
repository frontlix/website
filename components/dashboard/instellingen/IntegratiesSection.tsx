'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import styles from './IntegratiesSection.module.css'

export interface IntegratiesSectionProps {
  connected: boolean
  googleEmail: string | null
  calendarId: string | null
}

export function IntegratiesSection({ connected, googleEmail, calendarId }: IntegratiesSectionProps) {
  const [busy, setBusy] = useState(false)

  async function disconnect() {
    setBusy(true)
    await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' })
    window.location.href = '/instellingen?section=integraties'
  }

  return (
    <div className={`${styles.card} dash-card`}>
      <div className={styles.cardHead}>
        <Calendar size={18} />
        <div>
          <div className={styles.cardTitle}>Google Agenda</div>
          <div className={styles.cardSub}>
            Koppel je agenda zodat de bot je vrije tijden ziet en afspraken inplant.
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {connected ? (
          <>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Gekoppeld account</span>
              <span>
                <strong>{googleEmail ?? 'onbekend account'}</strong> (agenda: {calendarId ?? 'primary'})
              </span>
            </div>
            <div className={styles.actions}>
              <a className={styles.primaryBtn} href="/api/integrations/google-calendar/authorize">
                Opnieuw koppelen
              </a>
              <button type="button" className={styles.secondaryBtn} onClick={disconnect} disabled={busy}>
                {busy ? 'Bezig…' : 'Ontkoppelen'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.intro}>
              Koppel je Google Agenda zodat de bot je vrije tijden ziet en afspraken inplant.
            </p>
            <div className={styles.actions}>
              <a className={styles.primaryBtn} href="/api/integrations/google-calendar/authorize">
                Koppel Google Agenda
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
