'use client'

import { useState, type ReactNode } from 'react'
import {
  Calendar,
  Clock,
  Sparkles,
  Zap,
  ChevronRight,
} from 'lucide-react'
import styles from './AgendaNewSheet.module.css'

interface AgendaNewSheetProps {
  open: boolean
  onClose: () => void
  /** Sla de nieuwe afspraak op. v1: no-op (functionele pass koppelt server-action). */
  onSave: () => void
}

// ── Type-chips — kind → tone-token volgens de Translation Contract ────────────
// plaatsbezoek → warning, klus → primary, bel → whatsapp, eigen → text-muted.
type Kind = 'Plaatsbezoek' | 'Klus' | 'Bel' | 'Eigen'
const KIND_TONE: Record<Kind, string> = {
  Plaatsbezoek: 'var(--color-warning)',
  Klus: 'var(--primary)',
  Bel: 'var(--whatsapp)',
  Eigen: 'var(--color-text-muted)',
}
const KINDS: Kind[] = ['Plaatsbezoek', 'Klus', 'Bel', 'Eigen']

/**
 * AgendaNewSheet — bottom-sheet (max-height 88%, scrollbaar) om een nieuwe
 * afspraak te plannen. Port van src/agenda-b/ABNew.jsx.
 *
 * Secties (FieldGroup / FieldRow): Klant, Wanneer (datum/tijd+duur/reminder),
 * Type (kind-chips — geselecteerd krijgt eventTone-achtergrond via --tone),
 * Adres + Dienst, Notitie (textarea).
 *
 * v1: alle waarden in lokale state met demo-defaults; geen persistente write
 * (zie onSave).
 */
export function AgendaNewSheet({ open, onClose, onSave }: AgendaNewSheetProps) {
  // Demo-defaults — in de functionele pass komen deze uit de geselecteerde lead.
  const [kind, setKind] = useState<Kind>('Klus')
  const [note, setNote] = useState('')

  if (!open) return null

  // Hardcoded geselecteerde waarden (statisch ontwerp; later koppelen).
  const klant = 'Bouwbedrijf Korstmos'
  const leadId = 'L-2086'

  return (
    <div className={styles.overlay}>
      {/* Backdrop — klik = sluit */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div role="dialog" aria-modal="true" aria-label="Nieuwe afspraak" className={styles.sheet}>
        {/* Grabber */}
        <div className={styles.handle} aria-hidden="true" />

        {/* Header — Annuleren / titel / Opslaan */}
        <div className={styles.header}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Annuleren
          </button>
          <span className={styles.headerTitle}>Nieuwe afspraak</span>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => {
              // TODO: functional pass — create-appointment server action
              onSave()
            }}
          >
            Opslaan
          </button>
        </div>

        {/* ── Klant ─────────────────────────────────────────────────────────── */}
        <FieldGroup label="Klant">
          <FieldRow last>
            <div className={styles.klantInfo}>
              <span className={styles.avatar} aria-hidden="true">
                {initials(klant)}
              </span>
              <div className={styles.klantText}>
                <div className={styles.klantName}>{klant}</div>
                <div className={styles.klantMeta}>Lead {leadId} · €4.180 offerte</div>
              </div>
            </div>
            <ChevronRight size={14} className={styles.chev} aria-hidden="true" />
          </FieldRow>
        </FieldGroup>

        {/* ── Wanneer ───────────────────────────────────────────────────────── */}
        <FieldGroup label="Wanneer">
          <FieldRow>
            <FieldLabel icon={<Calendar size={14} />}>Datum</FieldLabel>
            <div className={styles.valueRow}>
              <span className={styles.valueChip}>Do 14 mei</span>
              <ChevronRight size={13} className={styles.chev} aria-hidden="true" />
            </div>
          </FieldRow>
          <FieldRow>
            <FieldLabel icon={<Clock size={14} />}>Tijd</FieldLabel>
            <div className={styles.valueRow}>
              <span className={styles.valueChip} data-num="true">
                13:00
              </span>
              <span className={styles.plus}>+</span>
              <span className={styles.valueChip}>3u</span>
              <ChevronRight size={13} className={styles.chev} aria-hidden="true" />
            </div>
          </FieldRow>
          <FieldRow last>
            <FieldLabel icon={<Sparkles size={14} />}>Reminder</FieldLabel>
            <div className={styles.valueRow}>
              <span className={styles.valueText}>1 dag van tevoren</span>
              <ChevronRight size={13} className={styles.chev} aria-hidden="true" />
            </div>
          </FieldRow>
        </FieldGroup>

        {/* ── Type ──────────────────────────────────────────────────────────── */}
        <FieldGroup label="Type">
          <div className={styles.typeChips}>
            {KINDS.map((k) => {
              const on = k === kind
              return (
                <button
                  key={k}
                  type="button"
                  className={styles.typeChip}
                  data-on={on ? 'true' : undefined}
                  style={{ ['--tone' as string]: KIND_TONE[k] }}
                  onClick={() => setKind(k)}
                >
                  {k}
                </button>
              )
            })}
          </div>
        </FieldGroup>

        {/* ── Adres + Dienst ────────────────────────────────────────────────── */}
        <FieldGroup label="Adres">
          <FieldRow>
            <div className={styles.adresText}>
              <div className={styles.adresMain}>Industrieweg 88 · Rotterdam</div>
              <div className={styles.adresSub}>34 km · 28 min vanaf vorige stop</div>
            </div>
            <ChevronRight size={14} className={styles.chev} aria-hidden="true" />
          </FieldRow>
          <FieldRow last>
            <FieldLabel icon={<Zap size={14} />}>Dienst</FieldLabel>
            <div className={styles.valueRow} data-clamp="true">
              <span className={styles.dienstValue}>Onkruidbeheersing + voeg-herstel</span>
              <ChevronRight size={13} className={styles.chev} aria-hidden="true" />
            </div>
          </FieldRow>
        </FieldGroup>

        {/* ── Notitie ───────────────────────────────────────────────────────── */}
        <FieldGroup label="Notitie">
          <div className={styles.notaWrap}>
            <textarea
              className={styles.nota}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Voor de bot: vermeld dat klant betaling per factuur wil…"
              rows={3}
            />
          </div>
        </FieldGroup>

        <div className={styles.bottomSpacer} />
      </div>
    </div>
  )
}

// ── Helper-componenten (lokaal — geport uit ABNew FieldGroup/FieldRow/FieldLabel)

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Initialen uit een naam (max 2 letters) voor de avatar. */
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
