'use client'

import { useState, useTransition } from 'react'
import {
  togglePrefAction,
  setDailyDigestTijdAction,
} from '@/lib/dashboard/notifications/prefs-actions'
import {
  EVENT_TYPES_ORDERED,
  KANALEN_ORDERED,
  EVENT_LABELS,
  KANAAL_LABELS,
  KANAAL_FASE,
  type NotificationEventType,
  type NotificationKanaal,
  type NotificationPreferenceRow,
} from '@/lib/dashboard/notifications/types'
import styles from './NotificatiesEditor.module.css'
import pageStyles from '@/app/dashboard/(app)/instellingen/page.module.css'

/**
 * Werkende toggle-grid voor notification preferences.
 *
 * Strategie:
 * - State per (event, kanaal) wordt initieel uit `initialPrefs` opgebouwd.
 * - Klik op een toggle → optimistic update + server-action call. Bij
 *   error revert + alert.
 * - Push (fase 3) en WhatsApp (fase 4) zijn nog niet live; die kolommen
 *   tonen "Binnenkort" en hun toggles zijn disabled. Zodra notify.ts
 *   de bezorg-laag implementeert, removen we deze gate per kanaal.
 */

const LIVE_FASE = 2 // huidige fase — toggles voor kanalen met fase > LIVE_FASE disabled (fase 3=push, 4=whatsapp)

export function NotificatiesEditor({
  initialPrefs,
  initialDigestTijd,
}: {
  initialPrefs: NotificationPreferenceRow[]
  initialDigestTijd: string
}) {
  // Map: "event|kanaal" → enabled.
  const initialMap = new Map<string, boolean>()
  for (const p of initialPrefs) {
    initialMap.set(`${p.event_type}|${p.kanaal}`, p.enabled)
  }
  const [prefs, setPrefs] = useState(initialMap)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handleToggle = (
    eventType: NotificationEventType,
    kanaal: NotificationKanaal,
  ) => {
    const key = `${eventType}|${kanaal}`
    const current = prefs.get(key) ?? false
    const next = !current

    // Optimistic update
    setPrefs((prev) => new Map(prev).set(key, next))
    setSavingKey(key)

    startTransition(async () => {
      const result = await togglePrefAction(eventType, kanaal, next)
      setSavingKey(null)
      if (!result.ok) {
        // Revert + waarschuw user
        setPrefs((prev) => new Map(prev).set(key, current))
        alert(result.error)
      }
    })
  }

  return (
    <>
      <div className={pageStyles.notifTable}>
        <div className={pageStyles.notifHead}>
          <div>Event</div>
          {KANALEN_ORDERED.map((kn) => (
            <div key={kn} className={pageStyles.notifCol}>
              {KANAAL_LABELS[kn]}
              {KANAAL_FASE[kn] > LIVE_FASE && (
                <span className={styles.binnenkortBadge}>Binnenkort</span>
              )}
            </div>
          ))}
        </div>
        {EVENT_TYPES_ORDERED.map((evt) => (
          <div key={evt} className={pageStyles.notifRow}>
            <div>
              <div className={pageStyles.notifLabel}>{EVENT_LABELS[evt].titel}</div>
              <div className={pageStyles.notifSub}>{EVENT_LABELS[evt].sub}</div>
            </div>
            {KANALEN_ORDERED.map((kn) => {
              const key = `${evt}|${kn}`
              const enabled = prefs.get(key) ?? false
              const isLive = KANAAL_FASE[kn] <= LIVE_FASE
              const isSaving = savingKey === key
              return (
                <div key={kn} className={pageStyles.notifCol}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${EVENT_LABELS[evt].titel} via ${KANAAL_LABELS[kn]}`}
                    disabled={!isLive || isSaving}
                    onClick={() => handleToggle(evt, kn)}
                    className={[
                      styles.toggle,
                      enabled ? styles.toggleOn : '',
                      !isLive ? styles.toggleDisabled : '',
                      isSaving ? styles.toggleSaving : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <DigestTijdRow initial={initialDigestTijd} />
    </>
  )
}

/**
 * Tijd-input voor de "Dagelijkse samenvatting" — onder de tabel zodat
 * 'ie logisch bij die event-rij hoort zonder de grid-layout te breken.
 * Per-tenant instelbaar (single-tenant nu, dus globaal).
 */
function DigestTijdRow({ initial }: { initial: string }) {
  const [tijd, setTijd] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handleBlur = () => {
    if (tijd === initial) return
    setStatus('saving')
    startTransition(async () => {
      const result = await setDailyDigestTijdAction(tijd)
      if (result.ok) {
        setStatus('ok')
        setTimeout(() => setStatus('idle'), 1500)
      } else {
        setStatus('err')
        setErrMsg(result.error)
      }
    })
  }

  return (
    <div className={styles.digestRow}>
      <div className={styles.digestLabel}>
        Tijdstip &ldquo;Dagelijkse samenvatting&rdquo;
        <div className={styles.digestSub}>
          Wanneer de ochtend-digest binnenkomt (Europe/Amsterdam)
        </div>
      </div>
      <input
        type="time"
        value={tijd}
        onChange={(e) => setTijd(e.target.value)}
        onBlur={handleBlur}
        className={styles.digestInput}
      />
      <div
        className={[
          styles.digestStatus,
          status === 'ok' ? styles.digestStatusOk : '',
          status === 'err' ? styles.digestStatusErr : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {status === 'saving' && 'opslaan…'}
        {status === 'ok' && 'opgeslagen'}
        {status === 'err' && (errMsg ?? 'mislukt')}
      </div>
    </div>
  )
}
