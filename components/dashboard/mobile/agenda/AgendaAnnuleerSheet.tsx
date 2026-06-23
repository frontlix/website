'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, MessageCircle } from 'lucide-react'
import { MobileToggle } from '../shared/MobileToggle'
import type { AgendaEvent } from './agenda-mock'
import { cancelAppointment } from '@/lib/dashboard/agenda-actions'
import { useModalSheet } from '@/hooks/useModalSheet'
import styles from './AgendaHerplanSheet.module.css'

interface AgendaAnnuleerSheetProps {
  ev: AgendaEvent
  open: boolean
  onClose: () => void
  /** Sluit de sheet (parent). De write + refresh doet de sheet zelf. */
  onConfirm: () => void
}

const NL_WDAY = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const NL_MONTH = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

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

/** Eerste woord van een naam (voor de notify-preview). */
function firstName(name: string): string {
  return name.split(' ')[0]
}

/**
 * AgendaAnnuleerSheet, bottom-sheet om een afspraak te annuleren. Bevestig laat
 * de bot het Google-event verwijderen en de afspraak-velden leegmaken via
 * cancelAppointment. De notify-toggle bepaalt of de klant een annuleringsbericht
 * (WhatsApp + e-mail) krijgt (default aan).
 */
export function AgendaAnnuleerSheet({ ev, open, onClose, onConfirm }: AgendaAnnuleerSheetProps) {
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notifyWa, setNotifyWa] = useState(true)

  // Scroll-lock + Escape + focus-move/-restore (vóór de early return, zodat de
  // hook-volgorde stabiel blijft). Ref komt op de role="dialog"-div.
  const dialogRef = useModalSheet<HTMLDivElement>(open, onClose)

  if (!open) return null

  function handleConfirm() {
    // Alleen lead-gekoppelde afspraken kunnen geannuleerd worden. Externe
    // (lead-loze) Google-afspraken hebben geen ev.lead; ev.id ("ext-…") mag
    // NOOIT als leadId naar de bot, dus we breken hier af.
    const leadId = ev.lead
    if (!leadId) return
    setError(null)
    startSaving(async () => {
      const res = await cancelAppointment(leadId, { notifyWhatsapp: notifyWa, notifyEmail: notifyWa })
      if (res.ok) {
        router.refresh() // agenda herladen, afspraak is weg
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
        aria-label="Annuleren"
        className={styles.sheet}
      >
        {/* Grabber */}
        <div className={styles.handle} aria-hidden="true" />

        {/* Header, Annuleren / titel / Bevestig */}
        <div className={styles.header}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Annuleren
          </button>
          <span className={styles.headerTitle}>Annuleren</span>
          <button
            type="button"
            className={styles.confirmBtn}
            disabled={saving}
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
                {dayLabelReal(ev.date)} · {ev.start}, {ev.end}
              </div>
            </div>
            <div className={styles.currentName}>{ev.naam}</div>
          </div>
        </div>

        {/* Bevestigingstekst */}
        <div className={styles.dayHeader}>
          <span className={styles.dayHeaderTitle}>
            Afspraak met {firstName(ev.naam)} annuleren? De afspraak verdwijnt uit je agenda.
          </span>
        </div>

        {/* Foutmelding bij opslaan */}
        {error && <div className={styles.saveError}>{error}</div>}

        {/* Notify-toggle: klant een annuleringsbericht sturen. */}
        <div className={styles.notifyRow}>
          <MessageCircle size={18} className={styles.notifyIcon} aria-hidden="true" />
          <div className={styles.notifyBody}>
            <div className={styles.notifyTitle}>Klant via WhatsApp informeren</div>
            <div className={styles.notifySub}>
              Verstuurt automatisch een annuleringsbericht naar de klant.
            </div>
          </div>
          <MobileToggle on={notifyWa} onChange={setNotifyWa} label="WhatsApp informeren" />
        </div>
      </div>
    </div>
  )
}
