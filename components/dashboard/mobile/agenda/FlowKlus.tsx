'use client'

// FlowKlus, Klus-detail, gerenderd als CONTENT binnen MobileDrilldownLayer.
// De layer levert de header (terug + titel); dit component levert alleen de body
// (geen eigen FNav). Data-driven: krijgt het aangetikte event en toont UITSLUITEND
// echte velden uit de afspraak (naam, adres, telefoon, start/duur, dienst, m², afstand).
// Een live "bezig"-staat (ev.current) krijgt een Bezig-badge; verder is er bewust
// geen verzonnen voortgang/track-data, de DB kent die kolommen (nog) niet.

import { Clock, MapPin, Zap, Check } from 'lucide-react'
import {
  FHero,
  FDetailCard,
  FKV,
  FBigAction,
  FMiniMap,
} from './FlowAtoms'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type AgendaEvent } from './agenda-mock'
import { eventTone, durStr } from './agenda-mobile-helpers'
import styles from './FlowKlus.module.css'

type FlowKlusProps = {
  ev: AgendaEvent
  onHerplan: () => void
  onAfronden: () => void
}

// Stabiele initialen voor de klant-avatar.
function initials(naam: string): string {
  const parts = naam.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Tijd-tracking cel-icoon → lucide, klein + muted (tint via CSS-klasse).
function TrackIcon({ kind }: { kind: 'check' | 'clock' | 'zap' | 'pin' }) {
  if (kind === 'check') return <Check size={11} className={styles.trackIcon} />
  if (kind === 'clock') return <Clock size={11} className={styles.trackIcon} />
  if (kind === 'zap') return <Zap size={11} className={styles.trackIcon} />
  return <MapPin size={11} className={styles.trackIcon} />
}

export function FlowKlus({ ev, onHerplan, onAfronden }: FlowKlusProps) {
  const router = useRouter()
  // Live = de afspraak loopt nu (mapper zet ev.current op absolute tijd).
  const isNow = !!ev.current

  // Echte contact-/route-velden (geen nepdata): tel: ongewijzigd.
  const telDigits = (ev.telefoon ?? '').replace(/\D/g, '')
  const hasAdres = !!ev.adres && ev.adres !== '—'
  const mapsHref = hasAdres
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.adres)}`
    : null

  // Tijd-strip: Start + (geschatte) Duur + Afstand, allemaal afgeleid uit
  // echte velden. Geen verzonnen "aangekomen/nu/verwacht"-tijden meer.
  const trackCells = [
    { lbl: 'Start', v: ev.start, icon: 'clock' as const },
    { lbl: 'Duur', v: durStr(ev.start, ev.end), icon: 'zap' as const },
    { lbl: 'Afstand', v: ev.afstandKm != null ? `${ev.afstandKm} km` : '—', icon: 'pin' as const },
  ]

  return (
    // --tone draagt de event-kleur door naar avatar/badge (color-mix in CSS).
    <div
      className={styles.root}
      data-flush-footer
      style={{ '--tone': eventTone(ev.kind) } as React.CSSProperties}
    >
      <FHero
        ev={ev}
        kindLabel="Klus"
        badge={
          isNow ? (
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              Bezig
            </span>
          ) : (
            <span className={styles.plannedBadge}>Gepland</span>
          )
        }
      />

      {/* Tijd-strip (echte start/duur/afstand) */}
      <div className={styles.trackStrip}>
        {trackCells.map((cell, i) => (
          <div key={cell.lbl} className={styles.trackCell} data-divider={i < 2 || undefined}>
            <div className={styles.trackHead}>
              <TrackIcon kind={cell.icon} />
              <span className={styles.trackLabel}>{cell.lbl}</span>
            </div>
            <div className={styles.trackValue}>{cell.v}</div>
          </div>
        ))}
      </div>

      {/* Quick actions, alleen gerenderd als er echte data achter zit. */}
      <div className={styles.actionRow}>
        {mapsHref && (
          <FBigAction
            icon="pin"
            label="Route"
            onClick={() => window.open(mapsHref, '_blank', 'noopener,noreferrer')}
          />
        )}
        {telDigits && (
          <FBigAction
            icon="phone"
            label="Bel"
            onClick={() => {
              window.location.href = `tel:${telDigits}`
            }}
          />
        )}
        {ev.lead && (
          <FBigAction
            icon="wa"
            label="WhatsApp"
            // In-app gesprek met deze lead (inbox-thread), niet de externe
            // WhatsApp-app. Consistent met de leads-lijst en het lead-dossier.
            onClick={() => router.push(`/inbox?lead=${ev.lead}`)}
          />
        )}
      </div>

      {/* Klant + adres (echte velden) */}
      <FDetailCard icon="phone" title="Klant + adres">
        <div className={styles.klantRow}>
          <span className={styles.avatar}>{initials(ev.naam)}</span>
          <div className={styles.klantMeta}>
            <div className={styles.klantNaam}>{ev.naam}</div>
            {ev.telefoon && <div className={styles.klantTel}>{ev.telefoon}</div>}
          </div>
          {ev.lead && (
            // Echte ingang naar het lead-dossier (ev.lead = lead_id).
            <Link href={`/leads/${ev.lead}`} className={styles.leadChip}>
              Lead
            </Link>
          )}
        </div>
        <div className={styles.adres}>{ev.adres}</div>
        {ev.afstandKm != null && <FMiniMap label={`${ev.afstandKm} km`} />}
      </FDetailCard>

      {/* Dienst-details (echte velden; offerte/materialen komen uit het dossier) */}
      <FDetailCard icon="bolt" title="Dienst">
        <FKV k="Type" v={ev.dienst ?? '—'} last={ev.m2 == null} />
        {ev.m2 != null && <FKV k="Oppervlakte" v={`${ev.m2} m²`} last />}
      </FDetailCard>

      {/* Footer-acties (sticky onderaan) */}
      <div className={styles.footer}>
        <button type="button" onClick={onHerplan} className={styles.btnGhost}>
          <Clock size={14} /> Herplannen
        </button>
        <button type="button" onClick={onAfronden} className={styles.btnPrimary}>
          <Check size={16} /> Klus afronden
        </button>
      </div>
    </div>
  )
}
