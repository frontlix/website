'use client'

import type { ComponentType } from 'react'
import {
  Calendar,
  ChevronRight,
  FileText,
  MessageCircle,
  User,
} from 'lucide-react'
import styles from './ActivityFeedBlock.module.css'

export type ActivityType = 'WHATSAPP' | 'NIEUWE_LEAD' | 'AFSPRAAK' | 'OFFERTE'

export type ActivityItem = {
  id: string
  type: ActivityType
  naam: string
  description: string
  timeAgo: string // "2m", "12m", "1u"
}

type Props = {
  items: ActivityItem[]
  onOpenAll: () => void
}

/**
 * ICONS — map van ActivityType naar lucide-react component.
 * Strict-typed met ComponentType<{size: number}> zodat lucide-icons
 * via dynamic key-access correct getypeerd worden (geen any).
 */
const ICONS: Record<ActivityType, ComponentType<{ size: number }>> = {
  WHATSAPP: MessageCircle,
  NIEUWE_LEAD: User,
  AFSPRAAK: Calendar,
  OFFERTE: FileText,
}

const LABELS: Record<ActivityType, string> = {
  WHATSAPP: 'WHATSAPP',
  NIEUWE_LEAD: 'NIEUWE LEAD',
  AFSPRAAK: 'AFSPRAAK',
  OFFERTE: 'OFFERTE',
}

/**
 * ActivityFeedBlock — "Recent" preview (top-3 events) op mobile Overzicht.
 * Icon-box met type-gekleurde tinten, naam + description + uppercase label,
 * tijd-ago rechts. Empty-state copy als items leeg.
 */
export function ActivityFeedBlock({ items, onOpenAll }: Props) {
  return (
    <section className={styles.block}>
      <div className={styles.head}>
        <h2 className={styles.title}>Recent</h2>
        <button
          type="button"
          onClick={onOpenAll}
          className={styles.allLink}
        >
          Alles bekijken <ChevronRight size={14} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Nog geen activiteit vandaag.</p>
      ) : (
        <ul className={styles.list}>
          {items.slice(0, 3).map((item) => {
            const Icon = ICONS[item.type]
            return (
              <li key={item.id} className={styles.row}>
                <span className={styles.iconBox} data-type={item.type}>
                  <Icon size={18} />
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{item.naam}</span>
                  <span className={styles.desc}>{item.description}</span>
                  <span className={styles.label} data-type={item.type}>
                    {LABELS[item.type]}
                  </span>
                </span>
                <span className={styles.time}>{item.timeAgo}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
