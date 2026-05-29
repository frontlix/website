'use client'

import { ChevronRight } from 'lucide-react'
import { INST_REMINDERS } from './instellingen-mock'
import styles from './InstReminders.module.css'

/** Reminders-detailscherm — drie reminder-kaarten met tinted nummer-badge.
 *  --tint injected per kaart via CSS custom property. Geen lokale state nodig
 *  (v1: read-only lijst; tik → toekomstig edit-drilldown). */
export function InstReminders() {
  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Surface stuurt deze berichten automatisch wanneer een klant niet op de
        offerte reageert.
      </p>

      {INST_REMINDERS.map((r, i) => (
        <div
          key={i}
          className={styles.card}
          /* --tint is a per-item data value (hex color) — injected via style */
          style={{ '--tint': r.tone } as React.CSSProperties}
        >
          {/* Tinted number badge — bg via color-mix, fg via --tint */}
          <div className={styles.badge}>{i + 1}</div>

          <div className={styles.info}>
            <div className={styles.label}>{r.label}</div>
            <div className={styles.sub}>{r.sub}</div>
          </div>

          {/* Day count column */}
          <div className={styles.dayCol}>
            <div className={styles.dayValue}>{r.dag}d</div>
            <div className={styles.dayMeta}>na offerte</div>
          </div>

          <ChevronRight size={16} aria-hidden="true" className={styles.chev} />
        </div>
      ))}
    </div>
  )
}
