'use client'

import { useState } from 'react'
import { Sparkles, Smartphone, Mail, type LucideIcon } from 'lucide-react'
import { MobileToggle } from '../shared/MobileToggle'
import { INST_NOTIF } from './instellingen-mock'
import styles from './InstNotif.module.css'

// Kanalen per notificatie-type — icoon (lucide), label en de prefs-sleutel.
type Channel = { k: 'app' | 'push' | 'mail'; Icon: LucideIcon; l: string }
const CHANS: Channel[] = [
  { k: 'app', Icon: Sparkles, l: 'In-app' },
  { k: 'push', Icon: Smartphone, l: 'Push' },
  { k: 'mail', Icon: Mail, l: 'E-mail' },
]

type Prefs = Record<string, { app: boolean; push: boolean; mail: boolean }>

/** Notificatie-matrix: per type een kaart met 3 kanaal-rijen (app/push/mail).
 *  v1 = lokale state, geseed uit INST_NOTIF defs (zie plan-context). */
export function InstNotif() {
  // Geneste prefs-map: { [typeKey]: { app, push, mail } }.
  const [prefs, setPrefs] = useState<Prefs>(() =>
    Object.fromEntries(INST_NOTIF.map((e) => [e.k, { ...e.def }])),
  )

  // Eén kanaal van één type omschakelen.
  const toggle = (k: string, ch: Channel['k']) =>
    setPrefs((p) => ({ ...p, [k]: { ...p[k], [ch]: !p[k][ch] } }))

  return (
    <div className={styles.wrap}>
      {INST_NOTIF.map((e) => (
        <div key={e.k} className={styles.card}>
          <div className={styles.title}>{e.l}</div>
          <div className={styles.channels}>
            {CHANS.map((c) => (
              <div key={c.k} className={styles.row}>
                <c.Icon size={15} aria-hidden="true" className={styles.icon} />
                <span className={styles.label}>{c.l}</span>
                <MobileToggle
                  on={prefs[e.k][c.k]}
                  onChange={() => toggle(e.k, c.k)}
                  size={0.85}
                  label={`${e.l} — ${c.l}`}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
