'use client'

import { useEffect } from 'react'
import { useSwipeReveal, REVEAL, THRESHOLD } from '@/components/dashboard/mobile/useSwipeReveal'
import type { MobileLeadCard } from './lead-mappers'
import { LeadCard } from './LeadCard'
import styles from './SwipeableLeadCard.module.css'

interface SwipeableLeadCardProps {
  lead: MobileLeadCard
  /** Telefoonnummer voor "Bel" en "WA" acties */
  telefoon: string
  /** Of de expanded panel open is voor dit kaartje */
  expanded: boolean
  onToggleExpand: (id: string) => void
  onArchive: (id: string) => void
}

/**
 * SwipeableLeadCard — wraps LeadCard met drag-to-reveal actie-lanes.
 *
 * Swipe →: onthult "Bel" (accent gradient) + "WA" (whatsapp-groen)
 * Swipe ←: onthult "Archief" (danger)
 * Tik (geen beweging + dx===0): toggle expanded
 *
 * Implementatie via de gedeelde useSwipeReveal hook; disabled wanneer de
 * card expanded is zodat de ExpandedPanel zonder verstoringen werkt.
 */
export function SwipeableLeadCard({
  lead,
  telefoon,
  expanded,
  onToggleExpand,
  onArchive,
}: SwipeableLeadCardProps) {
  // Swipe disabled wanneer expanded — geen actie-lanes, geen drag
  const { dx, dragging, moved, bind, reset } = useSwipeReveal(!expanded)

  // Reset dx zodra de kaart expandeert (zodat hij niet verschoven blijft staan)
  useEffect(() => {
    if (expanded) reset()
  }, [expanded, reset])

  function handleClick() {
    // Als er bewogen is tijdens de drag: niet tappen
    if (moved) return
    // Als de card zijwaarts staat: snap terug, geen tap
    if (Math.abs(dx) > 4) {
      reset()
      return
    }
    onToggleExpand(lead.id)
  }

  // Telefoonnummer: verwijder niet-cijfer tekens voor de tel/wa links
  const tel = telefoon.replace(/\D/g, '')
  // WhatsApp-link: NL-nummers beginnen altijd met 0 → vervang door 31
  const waTel = tel.startsWith('0') ? `31${tel.slice(1)}` : tel

  return (
    <article className={styles.root}>
      {/* ── Actie-lanes — alleen renderen als NIET expanded ─────────────── */}
      {!expanded && (
        <>
          {/* Linker lane (Bel + WA) — verschijnt bij veeg → */}
          <div
            className={styles.laneLeft}
            style={{ opacity: dx > 0 ? 1 : 0, pointerEvents: dx > 0 ? 'auto' : 'none' }}
          >
            <a
              href={`tel:${telefoon}`}
              className={styles.actionBtn}
              data-action="bel"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Telefoon icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012 0h3a2 2 0 012 1.72c.13 1.02.37 2.02.73 2.98A2 2 0 017 6.63l-1.27 1.27a16 16 0 006.37 6.37l1.27-1.27a2 2 0 012.11-.45c.96.37 1.96.61 2.98.73A2 2 0 0122 16.92z" />
              </svg>
              <span>Bel</span>
            </a>
            <a
              href={`https://wa.me/${waTel}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionBtn}
              data-action="wa"
              onClick={(e) => e.stopPropagation()}
            >
              {/* WhatsApp icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.4A10 10 0 1012 2z" />
              </svg>
              <span>WA</span>
            </a>
          </div>

          {/* Rechter lane (Archief) — verschijnt bij veeg ← */}
          <div
            className={styles.laneRight}
            style={{ opacity: dx < 0 ? 1 : 0, pointerEvents: dx < 0 ? 'auto' : 'none' }}
          >
            <button
              type="button"
              className={styles.actionBtn}
              data-action="archief"
              onClick={(e) => {
                e.stopPropagation()
                onArchive(lead.id)
              }}
            >
              {/* Archive box icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
              <span>Archief</span>
            </button>
          </div>
        </>
      )}

      {/* ── De card zelf — verschuift met dx ──────────────────────────────── */}
      <div
        {...bind}
        onClick={handleClick}
        className={styles.cardSlider}
        style={{
          transform: `translateX(${dx}px)`,
          /* Alleen een transitie tijdens snap (niet tijdens drag) */
          transition: dragging ? 'none' : 'transform 0.25s var(--ease-ios)',
        }}
        /* Zorgt dat verticaal scrollen niet geblokkeerd wordt door horizontaal slepen */
        role="button"
        tabIndex={0}
        aria-label={`Lead van ${lead.naam} — tik voor details`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleExpand(lead.id)
          }
        }}
      >
        <LeadCard lead={lead} />
      </div>
    </article>
  )
}
