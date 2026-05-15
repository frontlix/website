'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Sparkle, MessageCircle, Calendar, FileText } from 'lucide-react'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import styles from './LiveActivityFeed.module.css'

export type ActivityItem = {
  leadId: string
  naam: string
  /** 'new' = nieuwe lead, 'wa' = WhatsApp bericht, 'appt' = afspraak, 'quote' = offerte */
  kind: 'new' | 'wa' | 'appt' | 'quote'
  text: string
  timestamp: string
}

const KIND_ICONS = {
  new: Sparkle,
  wa: MessageCircle,
  appt: Calendar,
  quote: FileText,
}

type TabKey = 'alles' | 'wa' | 'quote' | 'appt' | 'new'

const TABS: Array<{ key: TabKey; label: string; icon?: typeof MessageCircle }> = [
  { key: 'alles', label: 'Alles' },
  { key: 'wa', label: 'Chat', icon: MessageCircle },
  { key: 'quote', label: 'Offerte', icon: FileText },
  { key: 'appt', label: 'Agenda', icon: Calendar },
  { key: 'new', label: 'Nieuw', icon: Sparkle },
]

/**
 * Live-activity-feed met tab-filter (Alles · Chat · Offerte · Agenda · Nieuw).
 * Per rij krijgt de linkerrand een accent-kleur die matched met het icoon
 * van het event-type. Live-pulse-dot in de header signaleert "actief".
 *
 * Voor V1 server-rendered op page load; realtime-subscriptie staat op de
 * roadmap (zie comment in page.tsx::buildActivityFeed).
 */
export function LiveActivityFeed({ items }: { items: ActivityItem[] }) {
  const [tab, setTab] = useState<TabKey>('alles')

  const filtered = useMemo(
    () => (tab === 'alles' ? items : items.filter((it) => it.kind === tab)),
    [items, tab],
  )

  return (
    <div className={`dash-card ${styles.card}`}>
      <div className="dash-card-head">
        <div>
          <div className="dash-card-title">Live activiteit</div>
          <div className="dash-card-sub">Wat Surface op dit moment doet</div>
        </div>
        <LiveDot />
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {Icon && <Icon size={13} />}
              {t.label}
            </button>
          )
        })}
      </div>

      <div className={styles.countBar}>
        NET BINNEN · {filtered.length}
      </div>

      <div className={styles.feed}>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            {tab === 'alles'
              ? 'Nog geen activiteit. Komt zodra de eerste lead binnenkomt.'
              : 'Niets in deze categorie.'}
          </div>
        )}
        {filtered.map((item) => {
          const Icon = KIND_ICONS[item.kind]
          return (
            <Link
              key={`${item.timestamp}-${item.leadId}-${item.kind}`}
              href={`/leads/${item.leadId}`}
              className={`${styles.row} ${styles[`row_${item.kind}`]}`}
            >
              <div className={`${styles.icon} ${styles[`icon_${item.kind}`]}`}>
                <Icon size={15} />
              </div>
              <div className={styles.body}>
                <div className={styles.naam}>{item.naam}</div>
                <div className={styles.meta}>{item.text}</div>
              </div>
              <div className={styles.time}>{relativeTime(item.timestamp)}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/* ── Helper ─────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'nu'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} u`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

