'use client'

import { useState } from 'react'
import { Clock, MessageCircle } from 'lucide-react'
import { MobileDrilldownLayer } from './MobileDrilldownLayer'
import type { UrgentItem } from '../overzicht/UrgentBlock'
import styles from './WatNuView.module.css'

type Filter = 'alle' | 'urgent' | 'wachtend' | 'buiten-radius'

type Props = {
  open: boolean
  onClose: () => void
  items: UrgentItem[]
  /**
   * Optional pre-gegroepeerde items. Als niet meegegeven splitst de view zelf
   * op basis van badge: items met badge → "Vandaag eerst", items zonder → "Wachtend op opvolgen".
   */
  groupedByCategory?: {
    vandaagEerst: UrgentItem[]
    wachtendOpOpvolgen: UrgentItem[]
  }
  /** Optional pre-berekende counts voor de chips. */
  counts?: {
    alle: number
    urgent: number
    wachtend: number
    buitenRadius: number
  }
  onOpenItem?: (id: string) => void
  /** Tik op "Chat" → opent het in-app gesprek (/inbox?lead=:id). */
  onChat?: (id: string) => void
}

/**
 * WatNuView — drilldown voor "Wat nu" preview.
 *
 * Layout: filter-chips bovenaan (horizontaal scrollbaar), daaronder twee secties:
 * "Vandaag eerst" (rode label, urgent items) en "Wachtend op opvolgen" (muted label).
 * Elke card toont avatar + naam/subline + optionele tone-badge, context-tekst, en
 * twee actie-knoppen (primary "Open offerte" + secundaire "Chat").
 *
 * Data-contract: `items` is altijd verplicht. `groupedByCategory` en `counts` zijn
 * optional — als parent ze pre-bewerkt levert gebruiken we die, anders berekent de
 * view ze zelf via `splitByGroup` / `filterItems`.
 */
export function WatNuView({
  open,
  onClose,
  items,
  groupedByCategory,
  counts,
  onOpenItem,
  onChat,
}: Props) {
  const [filter, setFilter] = useState<Filter>('alle')

  const filtered = filterItems(items, filter)
  const grouped = groupedByCategory ?? splitByGroup(filtered)
  const total = counts?.alle ?? items.length

  return (
    <MobileDrilldownLayer
      open={open}
      title="Wat nu"
      subtitle={`${total} acties wachten op jou`}
      onClose={onClose}
    >
      <div className={styles.chips}>
        <Chip active={filter === 'alle'} onClick={() => setFilter('alle')}>
          Alle{' '}
          <span className={styles.chipCount}>
            {counts?.alle ?? items.length}
          </span>
        </Chip>
        <Chip active={filter === 'urgent'} onClick={() => setFilter('urgent')}>
          Urgent{' '}
          <span className={styles.chipCount}>
            {counts?.urgent ?? items.filter((i) => i.badge?.tone === 'red').length}
          </span>
        </Chip>
        <Chip
          active={filter === 'wachtend'}
          onClick={() => setFilter('wachtend')}
        >
          Wachtend{' '}
          <span className={styles.chipCount}>
            {counts?.wachtend ??
              items.filter((i) => i.badge?.tone === 'amber').length}
          </span>
        </Chip>
        <Chip
          active={filter === 'buiten-radius'}
          onClick={() => setFilter('buiten-radius')}
        >
          Buiten radius
        </Chip>
      </div>

      {grouped.vandaagEerst.length > 0 && (
        <section className={styles.section}>
          <h3 className={`${styles.sectionTitle} ${styles.sectionTitleRed}`}>
            VANDAAG EERST
          </h3>
          {grouped.vandaagEerst.map((it) => (
            <ItemCard
              key={it.id}
              item={it}
              onOpen={() => onOpenItem?.(it.id)}
              onChat={() => onChat?.(it.id)}
            />
          ))}
        </section>
      )}

      {grouped.wachtendOpOpvolgen.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>WACHTEND OP OPVOLGEN</h3>
          {grouped.wachtendOpOpvolgen.map((it) => (
            <ItemCard
              key={it.id}
              item={it}
              onOpen={() => onOpenItem?.(it.id)}
              onChat={() => onChat?.(it.id)}
            />
          ))}
        </section>
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

function ItemCard({
  item,
  onOpen,
  onChat,
}: {
  item: UrgentItem
  onOpen: () => void
  onChat?: () => void
}) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.avatar} aria-hidden="true">
          {item.initials}
        </span>
        <div className={styles.cardText}>
          <div className={styles.cardName}>{item.naam}</div>
          <div className={styles.cardSub}>{item.subline}</div>
        </div>
        {item.badge && (
          <span className={styles.badge} data-tone={item.badge.tone}>
            <Clock size={12} />
            {item.badge.label}
          </span>
        )}
      </div>
      <div className={styles.context}>{item.context}</div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onOpen}>
          Open offerte
        </button>
        <button type="button" className={styles.secondary} onClick={onChat}>
          <MessageCircle size={14} /> Chat
        </button>
      </div>
    </article>
  )
}

// --- Pure helpers ---------------------------------------------------------

function filterItems(items: UrgentItem[], filter: Filter): UrgentItem[] {
  if (filter === 'alle') return items
  if (filter === 'urgent') return items.filter((i) => i.badge?.tone === 'red')
  if (filter === 'wachtend')
    return items.filter((i) => i.badge?.tone === 'amber')
  // 'buiten-radius' logica zit in data-laag; hier passthrough zodat de chip
  // geen rij leegt zolang we nog geen radius-veld op UrgentItem hebben.
  return items
}

function splitByGroup(items: UrgentItem[]): {
  vandaagEerst: UrgentItem[]
  wachtendOpOpvolgen: UrgentItem[]
} {
  return {
    vandaagEerst: items.filter((i) => i.badge),
    wachtendOpOpvolgen: items.filter((i) => !i.badge),
  }
}
