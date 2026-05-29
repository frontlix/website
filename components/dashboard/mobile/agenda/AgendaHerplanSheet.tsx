'use client'

import { useState } from 'react'
import { Clock, MessageCircle, Flame } from 'lucide-react'
import { MobileToggle } from '../shared/MobileToggle'
import { durStr, minutesBetween, slotConflict, dateLabel } from './agenda-mobile-helpers'
import type { TimeBlock } from './agenda-mobile-helpers'
import type { AgendaEvent } from './agenda-mock'
import { AG_EVENTS } from './agenda-mock'
import styles from './AgendaHerplanSheet.module.css'

interface AgendaHerplanSheetProps {
  ev: AgendaEvent
  open: boolean
  onClose: () => void
  /** Bevestig herplanning. v1: no-op (functionele pass koppelt server-action). */
  onConfirm: () => void
}

// ── Mini-week dagen (5 dagen vooruit) — busy-niveau bepaalt dot-tone ──────────
// busy: 'full' → danger, 'mid' → warning, 'open' → success (via --tone)
type DayBusy = 'full' | 'mid' | 'open'
const DAYS: { date: string; wday: string; day: number; busy: DayBusy; label: string }[] = [
  { date: '2026-05-13', wday: 'wo', day: 13, busy: 'full', label: 'Vandaag' },
  { date: '2026-05-14', wday: 'do', day: 14, busy: 'mid', label: 'Morgen' },
  { date: '2026-05-15', wday: 'vr', day: 15, busy: 'full', label: '15 mei' },
  { date: '2026-05-16', wday: 'za', day: 16, busy: 'open', label: '16 mei' },
  { date: '2026-05-17', wday: 'zo', day: 17, busy: 'open', label: '17 mei' },
]

// Per busy-niveau het kleur-token voor de dot (geleverd via --tone).
const BUSY_TONE: Record<DayBusy, string> = {
  full: 'var(--color-danger)',
  mid: 'var(--color-warning)',
  open: 'var(--color-success)',
}

// ── Tijd-slots voor de geselecteerde dag ──────────────────────────────────────
// `busy`-slots zijn al geboekt (niet kiesbaar); de overige zijn vrij. De
// conflict-banner wordt berekend met slotConflict() i.p.v. een hardcoded vlag.
type SlotStatus = 'free' | 'busy'
const SLOTS: { time: string; status: SlotStatus; label?: string }[] = [
  { time: '08:00', status: 'free' },
  { time: '08:30', status: 'free' },
  { time: '09:00', status: 'free' },
  { time: '09:30', status: 'free' },
  { time: '10:00', status: 'busy', label: 'VVE intake' },
  { time: '10:30', status: 'busy' },
  { time: '11:00', status: 'busy' },
  { time: '11:30', status: 'free' },
  { time: '13:00', status: 'busy', label: 'Inkoop' },
  { time: '14:00', status: 'free' },
  { time: '14:30', status: 'free' },
  { time: '15:00', status: 'free' },
]

// Bezet-blokken voor conflictdetectie (afgeleid uit de busy-slots; demo).
const BUSY_BLOCKS: TimeBlock[] = [
  { start: '10:00', end: '11:30' },
  { start: '13:00', end: '14:00' },
]

/**
 * AgendaHerplanSheet — bottom-sheet (backdrop + slide-up) om een afspraak te
 * verzetten. Toont het huidige slot, een 5-daagse mini-kalender, een 3-koloms
 * tijd-slot-grid en een live conflict-banner (berekend via slotConflict uit
 * agenda-mobile-helpers). De Bevestig-knop is disabled zolang het gekozen slot
 * botst met een bestaande afspraak. Onderaan een WhatsApp-notify toggle.
 *
 * v1: alle keuzes in lokale state; geen persistente write (zie onConfirm).
 */
export function AgendaHerplanSheet({ ev, open, onClose, onConfirm }: AgendaHerplanSheetProps) {
  // Fallback naar het live-event (C1) als ev ontbreekt — matcht handoff-gedrag.
  const orig = ev ?? AG_EVENTS.find((e) => e.id === 'C1')!

  // Geselecteerde dag (default: morgen, 2e item).
  const [activeDay, setActiveDay] = useState<string>(DAYS[1].date)
  // Geselecteerd vrij tijdslot (start 'HH:MM'); null = nog niets gekozen.
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  // WhatsApp-klant-informeren — standaard aan.
  const [notifyWa, setNotifyWa] = useState(true)

  if (!open) return null

  // Duur van de te verzetten klus in minuten (voor conflict-berekening).
  const durMin = minutesBetween(orig.start, orig.end)

  // Conflict-status van het gekozen slot t.o.v. de bezet-blokken.
  const conflict = selectedSlot
    ? slotConflict(selectedSlot, durMin, BUSY_BLOCKS)
    : { conflict: false as const }

  const hasConflict = conflict.conflict
  // Eindtijd van het gekozen slot (voor de banner-tekst).
  const conflictEnd =
    hasConflict && selectedSlot
      ? minToHHMM(minutesBetween('00:00', selectedSlot) + durMin)
      : ''

  // Slot-titel volgt de gekozen dag i.p.v. een hardcoded label.
  const activeDayEntry = DAYS.find((d) => d.date === activeDay)
  const slotsTitle = activeDayEntry
    ? `Beschikbare tijden — ${activeDayEntry.wday.charAt(0).toUpperCase()}${activeDayEntry.wday.slice(1)} ${activeDayEntry.day} mei`
    : 'Beschikbare tijden'

  return (
    <div className={styles.overlay}>
      {/* Backdrop — klik = sluit */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div role="dialog" aria-modal="true" aria-label="Herplannen" className={styles.sheet}>
        {/* Grabber */}
        <div className={styles.handle} aria-hidden="true" />

        {/* Header — Annuleren / titel / Bevestig (disabled bij conflict) */}
        <div className={styles.header}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Annuleren
          </button>
          <span className={styles.headerTitle}>Herplannen</span>
          <button
            type="button"
            className={styles.confirmBtn}
            disabled={hasConflict || selectedSlot === null}
            onClick={() => {
              // TODO: functional pass — reschedule server action
              onConfirm()
            }}
          >
            Bevestig
          </button>
        </div>

        {/* Huidig geplande slot */}
        <div className={styles.currentWrap}>
          <div className={styles.currentChip}>
            <div className={styles.currentIcon}>
              <Clock size={14} />
            </div>
            <div className={styles.currentBody}>
              <div className={styles.currentLabel}>NU GEPLAND</div>
              <div className={styles.currentValue}>
                {dateLabel(orig.date)} · {orig.start} — {orig.end}
              </div>
            </div>
            <div className={styles.currentName}>{orig.naam}</div>
          </div>
        </div>

        {/* Dag-label + maand-knop */}
        <div className={styles.dayHeader}>
          <span className={styles.dayHeaderTitle}>Kies een nieuwe dag</span>
          <button type="button" className={styles.monthBtn}>
            Mei 2026
          </button>
        </div>

        {/* DayPicker — 5-daagse mini-kalender */}
        <div className={styles.dayPicker}>
          {DAYS.map((d) => {
            const on = d.date === activeDay
            return (
              <button
                key={d.date}
                type="button"
                className={styles.dayCell}
                data-active={on ? 'true' : undefined}
                onClick={() => {
                  setActiveDay(d.date)
                  setSelectedSlot(null) // reset slotkeuze bij dag-wissel
                }}
              >
                <span className={styles.dayWday}>{d.wday}</span>
                <span className={styles.dayNum}>{d.day}</span>
                <span
                  className={styles.dayDot}
                  style={{ ['--tone' as string]: BUSY_TONE[d.busy] }}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>

        {/* SlotsGrid — beschikbare tijden voor de gekozen dag */}
        <div className={styles.slotsWrap}>
          <div className={styles.slotsTitle}>{slotsTitle}</div>
          <div className={styles.slotsGrid}>
            {SLOTS.map((s) => {
              const busy = s.status === 'busy'
              const sel = s.time === selectedSlot
              return (
                <button
                  key={s.time}
                  type="button"
                  className={styles.slot}
                  data-busy={busy ? 'true' : undefined}
                  data-selected={sel ? 'true' : undefined}
                  disabled={busy}
                  onClick={() => setSelectedSlot(s.time)}
                >
                  <span className={styles.slotTime}>{s.time}</span>
                  {s.label && <span className={styles.slotLabel}>{s.label}</span>}
                  {sel && hasConflict && <span className={styles.slotConflictTag}>botst</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Conflict-banner — alleen tonen wanneer het gekozen slot botst */}
        {hasConflict && (
          <div className={styles.conflictBanner}>
            <div className={styles.conflictIcon}>
              <Flame size={14} />
            </div>
            <div className={styles.conflictBody}>
              <div className={styles.conflictTitle}>
                {selectedSlot} botst met een afspraak om {conflict.with.start}
              </div>
              <div className={styles.conflictSub}>
                De klus duurt {durStr(orig.start, orig.end)}, dus deze loopt door tot{' '}
                {conflictEnd} — over de volgende afspraak heen. Kies een later slot of
                verzet de andere afspraak.
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp-notify toggle */}
        <div className={styles.notifyRow}>
          <MessageCircle size={18} className={styles.notifyIcon} aria-hidden="true" />
          <div className={styles.notifyBody}>
            <div className={styles.notifyTitle}>Klant via WhatsApp informeren</div>
            <div className={styles.notifySub}>
              Verstuurt automatisch: &ldquo;Hoi {firstName(orig.naam)}, ik moet onze
              afspraak verzetten…&rdquo;
            </div>
          </div>
          <MobileToggle on={notifyWa} onChange={setNotifyWa} label="WhatsApp informeren" />
        </div>
      </div>
    </div>
  )
}

// ── Helpers (lokaal — geen herbruik elders nodig) ─────────────────────────────

/** Minuten-since-middernacht → 'HH:MM'. */
function minToHHMM(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Eerste woord van een naam (voor de WA-preview). */
function firstName(name: string): string {
  return name.split(' ')[0]
}
