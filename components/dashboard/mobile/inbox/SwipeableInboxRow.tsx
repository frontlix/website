'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { type ConversationPreview } from '@/lib/dashboard/inbox-queries'
import { archiveLead } from '@/lib/dashboard/lead-actions'
import { useSwipeReveal } from '@/components/dashboard/mobile/useSwipeReveal'
import { InboxRow } from './InboxRow'
import styles from './SwipeableInboxRow.module.css'

interface SwipeableInboxRowProps {
  convo: ConversationPreview
  /** Toon scheidingslijn onder de rij (alle rijen behalve de laatste) */
  divider?: boolean
}

/**
 * Omhult InboxRow met swipe-acties (links: Bel / WA; rechts: Archief).
 * Tap zonder beweging navigeert naar `/inbox?lead={id}`.
 */
export function SwipeableInboxRow({ convo, divider = false }: SwipeableInboxRowProps) {
  const router = useRouter()
  const [archivePending, startArchive] = useTransition()
  const { ref, open, reset, movedRef } = useSwipeReveal()

  const tel = convo.telefoon

  function handleTap() {
    // Bewogen tijdens drag, of rij staat uitgeschoven → terugsnappen i.p.v. navigeren.
    if (movedRef.current) { reset(); return }
    if (open !== 0) { reset(); return }
    router.push(`/inbox?lead=${convo.leadId}`)
  }

  // WA-swipe-actie: open het gesprek IN de webapp (zelfde bestemming als een tik
  // op de rij) i.p.v. de externe WhatsApp-app. reset() klapt de swipe-lade dicht.
  function openConversation() {
    reset()
    router.push(`/inbox?lead=${convo.leadId}`)
  }

  function handleArchive() {
    // Bevestiging: archiveren haalt de lead uit de pipeline. Een swipe is zo
    // gemaakt, dus vraag het eerst. Bij annuleren klapt de swipe-lade dicht.
    if (!window.confirm(`Gesprek met ${convo.naam} archiveren? De lead verdwijnt dan uit de pipeline. Je kunt 'm later met "Herstel" terughalen.`)) {
      reset()
      return
    }
    startArchive(async () => {
      await archiveLead(convo.leadId)
      router.refresh()
    })
  }

  return (
    <div
      className={`${styles.wrapper} ${divider ? styles.divider : ''}`}
      aria-label={`Gesprek met ${convo.naam}`}
    >
      {/* Linker actie-lade: Bel + WhatsApp (verschijnt bij swipe rechts) */}
      <div
        className={styles.leftActions}
        style={{ pointerEvents: open === 1 ? 'auto' : 'none' }}
        aria-hidden={open !== 1}
      >
        <a
          href={`tel:${tel}`}
          className={`${styles.actionBtn} ${styles.actionBel}`}
          tabIndex={open === 1 ? 0 : -1}
          aria-label={`Bel ${convo.naam}`}
        >
          {/* Telefoon-icoon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.4 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.9.6 2.9.7A2 2 0 0122 16.9z"/>
          </svg>
          <span className={styles.actionLabel}>Bel</span>
        </a>
        <button
          type="button"
          onClick={openConversation}
          className={`${styles.actionBtn} ${styles.actionWa}`}
          tabIndex={open === 1 ? 0 : -1}
          aria-label={`Open WhatsApp-gesprek met ${convo.naam}`}
        >
          {/* WhatsApp-icoon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.4A10 10 0 1012 2z"/>
          </svg>
          <span className={styles.actionLabel}>WA</span>
        </button>
      </div>

      {/* Rechter actie-lade: Archief (verschijnt bij swipe links) */}
      <div
        className={styles.rightActions}
        style={{ pointerEvents: open === -1 ? 'auto' : 'none' }}
        aria-hidden={open !== -1}
      >
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.actionArchief}`}
          onClick={handleArchive}
          disabled={archivePending}
          tabIndex={open === -1 ? 0 : -1}
          aria-label={`Archiveer gesprek met ${convo.naam}`}
        >
          {/* Archief-icoon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
          <span className={styles.actionLabel}>Archief</span>
        </button>
      </div>

      {/* De rij zelf, schuift via directe DOM-transform (hook, geen state) */}
      <div
        ref={ref}
        onClick={handleTap}
        className={styles.card}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleTap()}
        aria-label={`Open gesprek met ${convo.naam}`}
      >
        <InboxRow convo={convo} />
      </div>
    </div>
  )
}
