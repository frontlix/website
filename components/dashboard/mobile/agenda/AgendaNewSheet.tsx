'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Calendar, Clock, Search, Check, X } from 'lucide-react'
import { useModalSheet } from '@/hooks/useModalSheet'
import type { KlantOptie } from '@/components/dashboard/v2/agenda/KlantSelect'
import styles from './AgendaNewSheet.module.css'

/** Wat de sheet teruggeeft om een afspraak te boeken (bot bepaalt zelf de duur). */
export type NieuweAfspraakInput = {
  leadId: string
  datum: string // 'YYYY-MM-DD'
  tijd: string // 'HH:MM'
  notifyWhatsapp: boolean
  notifyEmail: boolean
}

interface AgendaNewSheetProps {
  open: boolean
  onClose: () => void
  /** Bestaande leads om aan te koppelen (afspraak boeken vereist een lead). */
  klanten: KlantOptie[]
  /** True terwijl de boeking loopt (knop toont "Bezig…", inputs vergrendeld). */
  busy?: boolean
  /** Boek de afspraak (echte server-action in de parent). */
  onSave: (a: NieuweAfspraakInput) => void
}

/**
 * AgendaNewSheet, bottom-sheet om een nieuwe afspraak te plannen. Functioneel:
 * kies een bestaande lead (zoeken), datum + tijd, en of de klant per WhatsApp
 * en/of e-mail geïnformeerd wordt. De bot maakt het Google-event + bevestiging
 * (zelfde flow als desktop). Duur/reminder laat de bot zelf bepalen, dus die
 * vragen we niet meer (waren statische demo-velden).
 */
export function AgendaNewSheet({ open, onClose, klanten, busy = false, onSave }: AgendaNewSheetProps) {
  const [gekozen, setGekozen] = useState<KlantOptie | null>(null)
  const [zoek, setZoek] = useState('')
  const [datum, setDatum] = useState('')
  const [tijd, setTijd] = useState('')
  const [notifyWa, setNotifyWa] = useState(true)
  const [notifyMail, setNotifyMail] = useState(false)

  const dialogRef = useModalSheet<HTMLDivElement>(open, onClose)

  // Gefilterde klantenlijst (naam/plaats), alleen leads met een leadId.
  const matches = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    const koppelbaar = klanten.filter((k) => k.leadId)
    if (!q) return koppelbaar.slice(0, 8)
    return koppelbaar
      .filter((k) => `${k.naam} ${k.plaats ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [klanten, zoek])

  if (!open) return null

  // De afspraaktijd MOET op een heel of half uur vallen (DB-constraint op
  // afspraak_starttijd). Een tijd als 17:36 wordt anders door de bot stil
  // geweigerd en verschijnt als losse Google-afspraak. We tonen de knop pas
  // actief bij een geldig slot.
  const geldigSlot = /^([01][0-9]|2[0-3]):(00|30)$/.test(tijd)
  const kanOpslaan = !!gekozen?.leadId && !!datum && geldigSlot && !busy

  const opslaan = () => {
    if (!gekozen?.leadId || !datum || !geldigSlot) return
    onSave({ leadId: gekozen.leadId, datum, tijd, notifyWhatsapp: notifyWa, notifyEmail: notifyMail })
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Nieuwe afspraak"
        className={styles.sheet}
      >
        <div className={styles.handle} aria-hidden="true" />

        <div className={styles.header}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Annuleren
          </button>
          <span className={styles.headerTitle}>Nieuwe afspraak</span>
          <button type="button" className={styles.saveBtn} onClick={opslaan} disabled={!kanOpslaan}>
            {busy ? 'Bezig…' : 'Opslaan'}
          </button>
        </div>

        {/* ── Klant ── */}
        <FieldGroup label="Klant">
          {gekozen ? (
            <FieldRow last>
              <div className={styles.klantInfo}>
                <span className={styles.avatar} aria-hidden="true">
                  {initials(gekozen.naam)}
                </span>
                <div className={styles.klantText}>
                  <div className={styles.klantName}>{gekozen.naam}</div>
                  <div className={styles.klantMeta}>
                    {[gekozen.plaats, gekozen.afstandKm != null ? `${gekozen.afstandKm} km` : null]
                      .filter(Boolean)
                      .join(' · ') || 'Bestaande lead'}
                  </div>
                </div>
              </div>
              <button type="button" className={styles.wijzigBtn} onClick={() => setGekozen(null)}>
                Wijzig
              </button>
            </FieldRow>
          ) : (
            <>
              <div className={styles.searchRow}>
                <Search size={15} className={styles.searchIcon} aria-hidden="true" />
                <input
                  className={styles.search}
                  value={zoek}
                  onChange={(e) => setZoek(e.target.value)}
                  placeholder="Zoek een lead op naam of plaats…"
                  autoFocus
                />
              </div>
              <div className={styles.klantList}>
                {matches.length === 0 ? (
                  <div className={styles.leeg}>Geen leads gevonden.</div>
                ) : (
                  matches.map((k) => (
                    <button
                      key={k.leadId}
                      type="button"
                      className={styles.klantItem}
                      onClick={() => {
                        setGekozen(k)
                        setZoek('')
                      }}
                    >
                      <span className={styles.avatarSm} aria-hidden="true">
                        {initials(k.naam)}
                      </span>
                      <span className={styles.klantItemText}>
                        <span className={styles.klantItemNaam}>{k.naam}</span>
                        {k.plaats && <span className={styles.klantItemPlaats}>{k.plaats}</span>}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </FieldGroup>

        {/* ── Wanneer ── */}
        <FieldGroup label="Wanneer">
          <FieldRow>
            <FieldLabel icon={<Calendar size={14} />}>Datum</FieldLabel>
            <input
              type="date"
              className={styles.dtInput}
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </FieldRow>
          <FieldRow last>
            <FieldLabel icon={<Clock size={14} />}>Tijd</FieldLabel>
            <input
              type="time"
              step={1800}
              className={styles.dtInput}
              value={tijd}
              onChange={(e) => setTijd(e.target.value)}
            />
          </FieldRow>
        </FieldGroup>
        {tijd && !geldigSlot && (
          <p className={styles.hint}>Kies een tijd op een heel of half uur (bijv. 09:00 of 09:30).</p>
        )}

        {/* ── Klant informeren ── */}
        <FieldGroup label="Klant informeren">
          <ToggleRow label="Via WhatsApp" on={notifyWa} onToggle={() => setNotifyWa((v) => !v)} />
          <ToggleRow label="Via e-mail" on={notifyMail} onToggle={() => setNotifyMail((v) => !v)} last />
        </FieldGroup>

        <p className={styles.hint}>
          De bot plant de afspraak in de agenda en stuurt de gekozen bevestiging. De duur bepaalt de bot zelf.
        </p>

        <div className={styles.bottomSpacer} />
      </div>
    </div>
  )
}

// ── Helper-componenten ──

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fieldGroup}>
      <div className={styles.fieldGroupLabel}>{label}</div>
      <div className={styles.fieldGroupBody}>{children}</div>
    </div>
  )
}

function FieldRow({ last, children }: { last?: boolean; children: ReactNode }) {
  return (
    <div className={styles.fieldRow} data-last={last ? 'true' : undefined}>
      {children}
    </div>
  )
}

function FieldLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.fieldLabel}>
      <span className={styles.fieldLabelIcon} aria-hidden="true">
        {icon}
      </span>
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  on,
  onToggle,
  last,
}: {
  label: string
  on: boolean
  onToggle: () => void
  last?: boolean
}) {
  return (
    <div className={styles.fieldRow} data-last={last ? 'true' : undefined}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={styles.toggle}
        data-on={on ? 'true' : undefined}
        onClick={onToggle}
      >
        <span className={styles.toggleKnob} aria-hidden="true">
          {on ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
        </span>
      </button>
    </div>
  )
}

/** Initialen uit een naam (max 2 letters) voor de avatar. */
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
