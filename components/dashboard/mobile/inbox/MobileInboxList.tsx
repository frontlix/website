'use client'

import Link from 'next/link'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import { type ConversationPreview } from '@/lib/dashboard/inbox-queries'
import { bucketFor, type InboxBucket } from './inbox-mappers'
import { SwipeableInboxRow } from './SwipeableInboxRow'
import styles from './MobileInboxList.module.css'

interface MobileInboxListProps {
  conversations: ConversationPreview[]
  ongelezenCount: number
  liveCount: number
}

/** Sectie-metadata: label, tint-kleur, sublabel voor 'live'. */
const SECTIONS: Array<{
  key: InboxBucket
  label: string
  tint: string
  sub?: string
}> = [
  { key: 'live',  label: 'Nu actief',  tint: 'var(--color-danger)',   sub: 'Laatste 30 minuten' },
  { key: 'today', label: 'Vandaag',    tint: 'var(--color-primary)' },
  { key: 'yest',  label: 'Gisteren',   tint: 'var(--fg-muted)' },
  { key: 'older', label: 'Eerder',     tint: 'var(--fg-muted)' },
]

/**
 * Inbox-lijst scherm (Screen A). Groepeert gesprekken in tijdlijn-secties
 * (Nu actief / Vandaag / Gisteren / Eerder). Elke sectie met 0 items
 * wordt weggelaten.
 */
export function MobileInboxList({
  conversations,
  ongelezenCount,
  liveCount,
}: MobileInboxListProps) {
  // Groepeer conversations per bucket
  const grouped = new Map<InboxBucket, ConversationPreview[]>()
  for (const c of conversations) {
    const bucket = bucketFor(c.laatsteBericht.timestamp)
    const existing = grouped.get(bucket)
    if (existing) {
      existing.push(c)
    } else {
      grouped.set(bucket, [c])
    }
  }

  const activeSections = SECTIONS.filter((s) => (grouped.get(s.key)?.length ?? 0) > 0)

  return (
    <div className={styles.root}>
      {/* ── Header ───────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Inbox</h1>
            <p className={styles.subtitle}>
              <LiveDot />
              {liveCount} live · {ongelezenCount} ongelezen
            </p>
          </div>
          {/* Zoek-knop → /inbox?q= */}
          <Link
            href="/inbox?q="
            className={styles.searchBtn}
            aria-label="Zoek in inbox"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Sectie-lijst ─────────────────────────────────── */}
      <div className={styles.sections}>
        {activeSections.map((section) => {
          const list = grouped.get(section.key) ?? []
          const unreadInSection = list.filter((c) => {
            if (c.laatsteBericht.richting !== 'inkomend') return false
            if (c.inboxGelezenOp === null) return true
            return c.laatsteBericht.timestamp > c.inboxGelezenOp
          }).length

          return (
            <div key={section.key} className={styles.section}>
              {/* Sectie-header */}
              <div className={styles.sectionHead}>
                <span
                  className={styles.sectionIconTile}
                  style={{ background: `${section.tint}18`, color: section.tint }}
                  aria-hidden="true"
                >
                  <SectionIcon bucket={section.key} tint={section.tint} />
                </span>

                <div className={styles.sectionHeadText}>
                  <span className={styles.sectionLabel}>{section.label}</span>
                  <span className={styles.sectionCount}>{list.length}</span>
                  {section.sub && (
                    <span className={styles.sectionSub}>· {section.sub}</span>
                  )}
                  {/* Pulserende stip voor live-sectie */}
                  {section.key === 'live' && (
                    <span className={styles.livePulse} aria-hidden="true" />
                  )}
                </div>

                {/* "Markeer gelezen" bij ongelezen berichten in de sectie */}
                {unreadInSection > 0 && (
                  <span className={styles.markRead} aria-label="Markeer alles gelezen">
                    Markeer gelezen
                  </span>
                )}
              </div>

              {/* Card-groep: alle rijen in een surface-kaart */}
              <div className={styles.cardGroup} role="list">
                {list.map((c, i) => (
                  <SwipeableInboxRow
                    key={c.leadId}
                    convo={c}
                    divider={i < list.length - 1}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {activeSections.length === 0 && (
          <div className={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className={styles.emptyIcon}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p className={styles.emptyTitle}>Geen gesprekken</p>
            <p className={styles.emptySub}>
              Nieuwe WhatsApp-leads verschijnen hier automatisch.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sectie-icoon per bucket ─────────────────────────── */

function SectionIcon({ bucket, tint }: { bucket: InboxBucket; tint: string }) {
  const color = tint

  switch (bucket) {
    case 'live':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      )
    case 'today':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      )
    case 'yest':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      )
    case 'older':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      )
  }
}
