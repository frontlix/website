'use client'

// FlowKlus — Klus-detail, gerenderd als CONTENT binnen MobileDrilldownLayer.
// De layer levert de header (terug + titel); dit component levert alleen de body
// (geen eigen FNav). Data-driven: krijgt het aangetikte event. Toont een live
// "bezig"-staat voor de actieve klus (NOW_ID) en een "gepland"-staat voor
// toekomstige klussen. (Port van handoff src/agenda-b/flow/FKlus.jsx.)

import { Clock, MapPin, Zap, Check } from 'lucide-react'
import {
  FHero,
  FDetailCard,
  FKV,
  FCheckRow,
  FBigAction,
  FMiniMap,
} from './FlowAtoms'
import { NOW_ID, type AgendaEvent } from './agenda-mock'
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
  const isNow = ev.id === NOW_ID

  // Tijd-tracking strip: live 3-kolom als nu bezig, anders start/duur/reistijd.
  const trackCells = isNow
    ? [
        { lbl: 'Aangekomen', v: '09:03', icon: 'check' as const },
        { lbl: 'Nu', v: '10:42', icon: 'clock' as const },
        { lbl: 'Verwacht', v: '11:54', icon: 'zap' as const },
      ]
    : [
        { lbl: 'Start', v: ev.start, icon: 'clock' as const },
        { lbl: 'Duur', v: durStr(ev.start, ev.end), icon: 'zap' as const },
        { lbl: 'Reistijd', v: '12 min', icon: 'pin' as const },
      ]

  return (
    // --tone draagt de event-kleur door naar avatar/badge (color-mix in CSS).
    <div className={styles.root} style={{ '--tone': eventTone(ev.kind) } as React.CSSProperties}>
      <FHero
        ev={ev}
        kindLabel="Klus"
        badge={
          isNow ? (
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              Bezig · nog 1u 12m
            </span>
          ) : (
            <span className={styles.plannedBadge}>Gepland</span>
          )
        }
      />

      {/* Tijd-tracking strip */}
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

      {/* Quick actions — touch-intents nog niet bedraad. */}
      {/* TODO: functional pass — route/bel/whatsapp/foto intents */}
      <div className={styles.actionRow}>
        <FBigAction icon="pin" label="Route" />
        <FBigAction icon="phone" label="Bel" />
        <FBigAction icon="wa" label="WhatsApp" />
        <FBigAction icon="cam" label="Foto" />
      </div>

      {/* Voortgang-checklist (read-only weergave uit mock) */}
      <FDetailCard
        icon="check"
        title="Voortgang"
        dense
        right={<span className={styles.progress}>{isNow ? '2 / 5' : '0 / 5'}</span>}
      >
        <FCheckRow done={isNow} label="Aangekomen + foto's vooraf" time={isNow ? '09:03' : undefined} />
        <FCheckRow done={isNow} label="Oude voeg verwijderd" time={isNow ? '10:02' : undefined} />
        <FCheckRow indeterminate={isNow} label="Nieuwe voeg invegen" time={isNow ? 'bezig' : undefined} />
        <FCheckRow label="Beschermlaag aanbrengen" />
        <FCheckRow label="Foto's achteraf + opruimen" last />
      </FDetailCard>

      {/* Klant + adres */}
      <FDetailCard icon="phone" title="Klant + adres">
        <div className={styles.klantRow}>
          <span className={styles.avatar}>{initials(ev.naam)}</span>
          <div className={styles.klantMeta}>
            <div className={styles.klantNaam}>{ev.naam}</div>
            <div className={styles.klantTel}>+31 6 24 19 88 03</div>
          </div>
          {ev.lead && (
            // TODO: functional pass — link naar lead-dossier
            <button type="button" className={styles.leadChip}>
              Lead
            </button>
          )}
        </div>
        <div className={styles.adres}>{ev.adres}</div>
        <FMiniMap label="9 km · 12 min" />
      </FDetailCard>

      {/* Dienst-details */}
      <FDetailCard icon="bolt" title="Dienst">
        <FKV k="Type" v={ev.dienst ?? '—'} />
        {ev.m2 != null && <FKV k="Oppervlakte" v={`${ev.m2} m²`} />}
        <FKV k="Offerte" v="€640 (akkoord 8 mei)" />
        <FKV k="Materialen" v="Voegzand polymeer · 4 zakken" last />
      </FDetailCard>

      {/* Footer-acties (sticky onderaan) */}
      <div className={styles.footer}>
        {/* TODO: functional pass — open herplan-sheet (reschedule server action) */}
        <button type="button" onClick={onHerplan} className={styles.btnGhost}>
          <Clock size={14} /> Herplannen
        </button>
        {/* TODO: functional pass — open afronden-flow (complete-job server action) */}
        <button type="button" onClick={onAfronden} className={styles.btnPrimary}>
          <Check size={16} /> Klus afronden
        </button>
      </div>
    </div>
  )
}
