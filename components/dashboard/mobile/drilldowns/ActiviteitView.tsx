'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  FileText,
  MessageCircle,
  User,
  type LucideIcon,
} from 'lucide-react'
import { MobileDrilldownLayer } from './MobileDrilldownLayer'
import type { ActivityItem, ActivityType } from '../overzicht/ActivityFeedBlock'
import styles from './ActiviteitView.module.css'

type FilterKey = 'alles' | 'leads' | 'offertes' | 'whatsapp' | 'afspraken'

type Props = {
  open: boolean
  onClose: () => void
  items: ActivityItem[]
}

// Strict-typed map ActivityType → lucide-react icon (geen any nodig).
const ICONS: Record<ActivityType, LucideIcon> = {
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
 * ActiviteitView, full-screen drilldown vanaf "Alles bekijken" in ActivityFeedBlock.
 *
 * - Subtitle toont live-indicator + totaal aantal events.
 * - Horizontaal scrollable filter-chips (Alles / Leads / Offertes / WhatsApp / Afspraken).
 * - Twee secties op tijd-buckets: "NET BINNEN" (timeAgo eindigt op 'm' = minuten)
 *   en "EERDER VANDAAG" (alle andere formats, bv. "1u", "2u", "1d").
 * - Empty-state wanneer beide buckets leeg zijn na filtering.
 */
export function ActiviteitView({ open, onClose, items }: Props) {
  const [filter, setFilter] = useState<FilterKey>('alles')

  const filtered = items.filter((it) => {
    if (filter === 'alles') return true
    if (filter === 'leads') return it.type === 'NIEUWE_LEAD'
    if (filter === 'offertes') return it.type === 'OFFERTE'
    if (filter === 'whatsapp') return it.type === 'WHATSAPP'
    if (filter === 'afspraken') return it.type === 'AFSPRAAK'
    return true
  })

  // Pattern "Nm" = recent (binnen het uur). "Nu" / "Nd" / langer = ouder.
  const isRecent = (t: string) => /^\d+m$/.test(t)
  const netBinnen = filtered.filter((it) => isRecent(it.timeAgo))
  const eerderVandaag = filtered.filter((it) => !isRecent(it.timeAgo))

  return (
    <MobileDrilldownLayer
      open={open}
      title="Activiteit"
      subtitle={`live · ${items.length} events`}
      onClose={onClose}
    >
      <div className={styles.chips}>
        <Chip active={filter === 'alles'} onClick={() => setFilter('alles')}>
          Alles
        </Chip>
        <Chip active={filter === 'leads'} onClick={() => setFilter('leads')}>
          Leads
        </Chip>
        <Chip active={filter === 'offertes'} onClick={() => setFilter('offertes')}>
          Offertes
        </Chip>
        <Chip active={filter === 'whatsapp'} onClick={() => setFilter('whatsapp')}>
          WhatsApp
        </Chip>
        <Chip active={filter === 'afspraken'} onClick={() => setFilter('afspraken')}>
          Afspraken
        </Chip>
      </div>

      {netBinnen.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>NET BINNEN</h3>
          {netBinnen.map((it) => (
            <Row key={it.id} item={it} />
          ))}
        </section>
      )}

      {eerderVandaag.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>EERDER VANDAAG</h3>
          {eerderVandaag.map((it) => (
            <Row key={it.id} item={it} />
          ))}
        </section>
      )}

      {netBinnen.length === 0 && eerderVandaag.length === 0 && (
        <p className={styles.empty}>Geen activiteit voor dit filter.</p>
      )}
    </MobileDrilldownLayer>
  )
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
    >
      {children}
    </button>
  )
}

function Row({ item }: { item: ActivityItem }) {
  const Icon = ICONS[item.type]
  // Gedeelde kaart-inhoud, identiek voor de link- en fallback-variant.
  const content = (
    <>
      <span className={styles.iconBox} data-type={item.type}>
        <Icon size={18} />
      </span>
      <div className={styles.text}>
        <div className={styles.name}>{item.naam}</div>
        <div className={styles.desc}>{item.description}</div>
        <div className={styles.label} data-type={item.type}>
          {LABELS[item.type]}
        </div>
      </div>
      <span className={styles.time}>{item.timeAgo}</span>
    </>
  )
  // Guard: zonder leadId geen (kapotte) link, dan de statische <article>.
  if (!item.leadId) {
    return <article className={styles.row}>{content}</article>
  }
  return (
    <Link href={`/leads/${item.leadId}`} className={styles.row}>
      {content}
    </Link>
  )
}
