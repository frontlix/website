'use client'

// Echte notificatie-voorkeuren uit notification_preferences. Elke toggle is
// gewired aan togglePrefAction (optimistic + revert). De digest-tijd gaat via
// setDailyDigestTijdAction. Push (fase 3) doet eerst de browser-permission via
// enablePush/disablePush; WhatsApp (fase 4) is nog niet live → disabled.

import { useState, useTransition } from 'react'
import {
  Bell,
  Mail,
  Smartphone,
  MessageCircle,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { MobileToggle } from '../shared/MobileToggle'
import {
  togglePrefAction,
  setDailyDigestTijdAction,
} from '@/lib/dashboard/notifications/prefs-actions'
import { enablePush, disablePush } from '@/lib/dashboard/notifications/push-client'
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
import styles from './InstNotif.module.css'

// Kanaal → icoon (lucide). Volgorde komt uit KANALEN_ORDERED.
const KANAAL_ICON: Record<NotificationKanaal, LucideIcon> = {
  in_app: Bell,
  email: Mail,
  push: Smartphone,
  whatsapp: MessageCircle,
}

// Huidige live fase, kanalen met fase > LIVE_FASE zijn disabled (fase 4 = whatsapp).
const LIVE_FASE = 3

type Props = {
  prefs: NotificationPreferenceRow[]
  digestTijd: string
}

/** Notificatie-matrix: per event-type een kaart met een rij per kanaal. */
export function InstNotif({ prefs, digestTijd }: Props) {
  // Map "event|kanaal" → enabled, geseed uit de echte prefs.
  const [enabled, setEnabled] = useState<Map<string, boolean>>(() => {
    const m = new Map<string, boolean>()
    for (const p of prefs) m.set(`${p.event_type}|${p.kanaal}`, p.enabled)
    return m
  })
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleToggle(evt: NotificationEventType, kanaal: NotificationKanaal) {
    const key = `${evt}|${kanaal}`
    const current = enabled.get(key) ?? false
    const next = !current

    // Optimistic update.
    setEnabled((prev) => new Map(prev).set(key, next))
    setError(null)
    setSavingKey(key)

    startTransition(async () => {
      // Push: eerst browser-permission + subscription regelen, vóór de pref-write.
      if (kanaal === 'push') {
        const pushRes = next ? await enablePush() : await disablePush()
        if (!pushRes.ok) {
          setEnabled((prev) => new Map(prev).set(key, current))
          setSavingKey(null)
          setError(pushNiceError(pushRes.reason))
          return
        }
      }

      const res = await togglePrefAction(evt, kanaal, next)
      setSavingKey(null)
      if (!res.ok) {
        setEnabled((prev) => new Map(prev).set(key, current))
        setError(res.error)
      }
    })
  }

  return (
    <div className={styles.wrap}>
      {EVENT_TYPES_ORDERED.map((evt) => (
        <div key={evt} className={styles.card}>
          <div className={styles.title}>{EVENT_LABELS[evt].titel}</div>
          <div className={styles.channels}>
            {KANALEN_ORDERED.map((kn) => {
              const Icon = KANAAL_ICON[kn]
              const key = `${evt}|${kn}`
              const isLive = KANAAL_FASE[kn] <= LIVE_FASE
              return (
                <div key={kn} className={styles.row}>
                  <Icon size={15} aria-hidden="true" className={styles.icon} />
                  <span className={styles.label}>
                    {KANAAL_LABELS[kn]}
                    {!isLive && <span className={styles.soon}>binnenkort</span>}
                  </span>
                  <MobileToggle
                    on={enabled.get(key) ?? false}
                    onChange={() => handleToggle(evt, kn)}
                    size={0.85}
                    label={`${EVENT_LABELS[evt].titel}, ${KANAAL_LABELS[kn]}`}
                    disabled={!isLive || savingKey === key}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {error && (
        <div className={styles.error} role="status">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <DigestTijdRow initial={digestTijd} />
    </div>
  )
}

/** User-vriendelijke melding voor mislukte push-permission flow. */
function pushNiceError(reason: string | undefined): string {
  switch (reason) {
    case 'unsupported':
      return 'Deze browser ondersteunt geen push-notificaties.'
    case 'denied':
      return 'Notificatie-permissie geweigerd. Zet dit aan in je browser-instellingen.'
    case 'no-vapid':
      return 'Push is server-side nog niet geconfigureerd.'
    case 'save-failed':
      return 'Subscription kon niet worden opgeslagen, probeer opnieuw.'
    default:
      return 'Push kon niet worden ingeschakeld, probeer opnieuw.'
  }
}

/** Tijdstip voor de dagelijkse samenvatting, opslaan bij blur (geen mock). */
function DigestTijdRow({ initial }: { initial: string }) {
  const [tijd, setTijd] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleBlur() {
    if (tijd === initial) return
    setStatus('saving')
    startTransition(async () => {
      const res = await setDailyDigestTijdAction(tijd)
      if (res.ok) {
        setStatus('ok')
        setTimeout(() => setStatus('idle'), 1500)
      } else {
        setStatus('err')
        setErrMsg(res.error)
      }
    })
  }

  return (
    <div className={styles.card}>
      <div className={styles.title}>Tijdstip dagelijkse samenvatting</div>
      <div className={styles.digestRow}>
        <span className={styles.label}>Ochtend-digest (Europe/Amsterdam)</span>
        <input
          type="time"
          value={tijd}
          onChange={(e) => setTijd(e.target.value)}
          onBlur={handleBlur}
          className={styles.timeInput}
          aria-label="Tijdstip dagelijkse samenvatting"
        />
      </div>
      {status === 'saving' && <div className={styles.digestStatus}>Opslaan…</div>}
      {status === 'ok' && <div className={styles.digestStatus}>Opgeslagen</div>}
      {status === 'err' && (
        <div className={`${styles.digestStatus} ${styles.digestErr}`}>
          {errMsg ?? 'Opslaan mislukt'}
        </div>
      )}
    </div>
  )
}
