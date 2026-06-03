'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, MessageCircle, Flame } from 'lucide-react'
import { MobileToggle } from '../shared/MobileToggle'
import { durStr, minutesBetween, slotConflict } from './agenda-mobile-helpers'
import type { TimeBlock } from './agenda-mobile-helpers'
import type { AgendaEvent } from './agenda-mock'
import { rescheduleAppointment } from '@/lib/dashboard/agenda-actions'
import { useModalSheet } from '@/hooks/useModalSheet'
import styles from './AgendaHerplanSheet.module.css'

interface AgendaHerplanSheetProps {
  ev: AgendaEvent
  /** Alle week-events, voor bezet-niveau per dag + conflict-detectie. */
  events: AgendaEvent[]
  open: boolean
  onClose: () => void
  /** Sluit de sheet (parent). De write + refresh doet de sheet zelf. */
  onConfirm: () => void
}

const NL_WDAY = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const NL_MONTH = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

// Kandidaat-tijdslots (08:00–16:30, halfuur). Bezet-status komt uit de echte
// afspraken van de gekozen dag.
const SLOT_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
]

type DayBusy = 'full' | 'mid' | 'open'
const BUSY_TONE: Record<DayBusy, string> = {
  full: 'var(--color-danger)',
  mid: 'var(--color-warning)',
  open: 'var(--color-success)',
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Relatief datumlabel t.o.v. de ECHTE vandaag. */
function dayLabelReal(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'Vandaag'
  if (diff === 1) return 'Morgen'
  if (diff === -1) return 'Gisteren'
  return `${cap(NL_WDAY[d.getDay()])} ${d.getDate()} ${NL_MONTH[d.getMonth()]}`
}

/**
 * AgendaHerplanSheet, bottom-sheet om een afspraak te verzetten. De dagen zijn
 * de 7 komende dagen (echt), de bezet-blokken + slot-status komen uit de echte
 * week-afspraken, en Bevestig slaat het nieuwe tijdstip op via
 * rescheduleAppointment (afspraak_geboekt_op).
 */
export function AgendaHerplanSheet({ ev, events, open, onClose, onConfirm }: AgendaHerplanSheetProps) {
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // 7 komende dagen vanaf vandaag (lokale tz = Amsterdam voor de gebruiker).
  const days = useMemo(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      const date = ymd(d)
      const count = events.filter((e) => e.date === date).length
      const busy: DayBusy = count >= 4 ? 'full' : count >= 2 ? 'mid' : 'open'
      const label = i === 0 ? 'Vandaag' : i === 1 ? 'Morgen' : `${d.getDate()} ${NL_MONTH[d.getMonth()]}`
      return { date, wday: NL_WDAY[d.getDay()], day: d.getDate(), month: d.getMonth(), busy, label }
    })
  }, [events])

  const [activeDay, setActiveDay] = useState<string>(() => days[1]?.date ?? days[0]?.date ?? '')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [notifyWa, setNotifyWa] = useState(true)

  // Bezet-blokken voor de gekozen dag uit de echte afspraken.
  const busyBlocks = useMemo<TimeBlock[]>(
    () => events.filter((e) => e.date === activeDay).map((e) => ({ start: e.start, end: e.end })),
    [events, activeDay],
  )

  // Scroll-lock + Escape + focus-move/-restore (vóór de early return, zodat de
  // hook-volgorde stabiel blijft). Ref komt op de role="dialog"-div.
  const dialogRef = useModalSheet<HTMLDivElement>(open, onClose)

  if (!open) return null

  const orig = ev
  const durMin = minutesBetween(orig.start, orig.end)

  const conflict = selectedSlot
    ? slotConflict(selectedSlot, durMin, busyBlocks)
    : { conflict: false as const }
  const hasConflict = conflict.conflict
  const conflictEnd =
    hasConflict && selectedSlot
      ? minToHHMM(minutesBetween('00:00', selectedSlot) + durMin)
      : ''

  const activeEntry = days.find((d) => d.date === activeDay)
  const slotsTitle = activeEntry
    ? `Beschikbare tijden, ${cap(activeEntry.wday)} ${activeEntry.day} ${NL_MONTH[activeEntry.month]}`
    : 'Beschikbare tijden'
  const monthLabel = activeEntry
    ? `${cap(NL_MONTH[activeEntry.month])} ${new Date(`${activeDay}T00:00:00`).getFullYear()}`
    : ''

  // Slot bezet als de start binnen een bestaand blok van de gekozen dag valt.
  function slotBusy(time: string): boolean {
    const s = minutesBetween('00:00', time)
    return busyBlocks.some(
      (b) => s >= minutesBetween('00:00', b.start) && s < minutesBetween('00:00', b.end),
    )
  }

  function handleConfirm() {
    const leadId = orig.lead ?? orig.id
    if (!leadId || !selectedSlot || !activeDay) return
    // Lokale (Amsterdam) datum+tijd → ISO/UTC. De gebruiker zit in NL, dus
    // new Date('YYYY-MM-DDTHH:MM:00') interpreteert correct als Amsterdam-tijd.
    const local = new Date(`${activeDay}T${selectedSlot}:00`)
    if (!Number.isFinite(local.getTime())) {
      setError('Ongeldige datum/tijd.')
      return
    }
    setError(null)
    startSaving(async () => {
      const res = await rescheduleAppointment(leadId, local.toISOString())
      if (res.ok) {
        router.refresh() // agenda herladen → afspraak staat op de nieuwe tijd
        onConfirm()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className={styles.overlay}>
      {/* Backdrop, klik = sluit */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Herplannen"
        className={styles.sheet}
      >
        {/* Grabber */}
        <div className={styles.handle} aria-hidden="true" />

        {/* Header, Annuleren / titel / Bevestig (disabled bij conflict) */}
        <div className={styles.header}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Annuleren
          </button>
          <span className={styles.headerTitle}>Herplannen</span>
          <button
            type="button"
            className={styles.confirmBtn}
            disabled={hasConflict || selectedSlot === null || saving}
            onClick={handleConfirm}
          >
            {saving ? 'Bezig…' : 'Bevestig'}
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
                {dayLabelReal(orig.date)} · {orig.start}, {orig.end}
              </div>
            </div>
            <div className={styles.currentName}>{orig.naam}</div>
          </div>
        </div>

        {/* Dag-label + maand */}
        <div className={styles.dayHeader}>
          <span className={styles.dayHeaderTitle}>Kies een nieuwe dag</span>
          <span className={styles.monthBtn}>{monthLabel}</span>
        </div>

        {/* DayPicker, 7 komende dagen */}
        <div className={styles.dayPicker}>
          {days.map((d) => {
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

        {/* SlotsGrid, beschikbare tijden voor de gekozen dag */}
        <div className={styles.slotsWrap}>
          <div className={styles.slotsTitle}>{slotsTitle}</div>
          <div className={styles.slotsGrid}>
            {SLOT_TIMES.map((time) => {
              const busy = slotBusy(time)
              const sel = time === selectedSlot
              return (
                <button
                  key={time}
                  type="button"
                  className={styles.slot}
                  data-busy={busy ? 'true' : undefined}
                  data-selected={sel ? 'true' : undefined}
                  disabled={busy}
                  onClick={() => setSelectedSlot(time)}
                >
                  <span className={styles.slotTime}>{time}</span>
                  {sel && hasConflict && <span className={styles.slotConflictTag}>botst</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Conflict-banner, alleen tonen wanneer het gekozen slot botst */}
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
                {conflictEnd}, over de volgende afspraak heen. Kies een later slot of
                verzet de andere afspraak.
              </div>
            </div>
          </div>
        )}

        {/* Foutmelding bij opslaan */}
        {error && <div className={styles.saveError}>{error}</div>}

        {/* WhatsApp-notify toggle, UI; automatische WA-notificatie is nog niet ingericht. */}
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

// ── Helpers (lokaal) ──────────────────────────────────────────────────────────

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
