'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { ConfirmDeleteLeadDialog } from '@/components/dashboard/ConfirmDeleteLeadDialog'
import type { MobileLeadCard, MobileLeadStage } from './lead-mappers'
import styles from './LeadExpandedPanel.module.css'

// ── Stage metadata duplicaat (zelfde als LeadCard, bron van waarheid) ────────
const STAGE_META: Record<MobileLeadStage, { label: string; tone: string }> = {
  gesprek: { label: 'In gesprek',   tone: 'blue' },
  review:  { label: 'Owner-review', tone: 'amber' },
  uit:     { label: 'Offerte uit',  tone: 'violet' },
  gepland: { label: 'Ingepland',    tone: 'green' },
  klaar:   { label: 'Afgerond',     tone: 'gray' },
}

// ── Primaire actie per stage ───────────────────────────────────────────────────
const PRIMARY_ACTION: Record<MobileLeadStage, { label: string; href: (id: string) => string }> = {
  gesprek: { label: 'Stuur offerte',    href: (id) => `/leads/${id}` },
  review:  { label: 'Goedkeuren',       href: (id) => `/leads/${id}` },
  uit:     { label: 'WhatsApp opvolgen',href: (id) => `/inbox?lead=${id}` },
  gepland: { label: 'Open afspraak',    href: (id) => `/leads/${id}` },
  klaar:   { label: 'Vraag review',     href: (id) => `/leads/${id}` },
}

// ── Stat cell ─────────────────────────────────────────────────────────────────
function Stat({ value, label, hi, tone }: { value: string; label: string; hi?: boolean; tone?: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue} data-hi={hi ? 'true' : undefined} data-tone={tone}>
        {value}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}

// ── Chevron-down icon ─────────────────────────────────────────────────────────
function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ── Chevron-right icon ────────────────────────────────────────────────────────
function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

interface LeadExpandedPanelProps {
  lead: MobileLeadCard
  onClose: () => void
  onOpenLead: (id: string) => void
  /** Archief-modus: vervang de fase-actie door een "Herstel"-knop. */
  archived?: boolean
  onUnarchive?: (id: string) => void
}

/**
 * LeadExpandedPanel, inline drilldown-panel dat opent onder SwipeableLeadCard.
 *
 * Structuur:
 *  1. Kleurstrip met stage-label + sluit-knop
 *  2. Stats-grid: Oppervlak / Offerte / Binnen (Foto's weggelaten, geen data)
 *  3. Dienst-sectie
 *  4. Surface-context
 *  5. Actie-knoppen (primair per stage + 2 secudaire)
 *  6. "Open volledig dossier" link
 *
 * Reveal-animatie: opacity + translateY(-6px) → 0 in 0.25s var(--ease-ios).
 */
export function LeadExpandedPanel({ lead, onClose, onOpenLead, archived = false, onUnarchive }: LeadExpandedPanelProps) {
  const router = useRouter()
  const meta = STAGE_META[lead.stage]
  const primary = PRIMARY_ACTION[lead.stage]
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className={styles.panel} data-tone={meta.tone}>
      {/* 1. Kleurstrip header */}
      <div className={styles.strip} data-tone={meta.tone}>
        <span className={styles.stageLabel} data-tone={meta.tone}>
          {meta.label}
        </span>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="Sluit panel"
        >
          <ChevronDown />
          <span>Sluit</span>
        </button>
      </div>

      {/* 2. Stats-grid, 3 kolommen (Foto's weggelaten) */}
      <div className={styles.statsGrid}>
        <Stat
          value={lead.m2 != null ? `${lead.m2}m²` : '—'}
          label="Oppervlak"
        />
        <Stat
          value={
            lead.prijs != null
              ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(lead.prijs)
              : '—'
          }
          label="Offerte"
          hi={lead.prijs != null}
          tone={meta.tone}
        />
        <Stat value={lead.binnen} label="Binnen" />
      </div>

      {/* 3. Dienst */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Dienst</div>
        <p className={styles.sectionBody}>{lead.dienst}</p>
      </div>

      {/* 4. Surface-context, 22×22 sparkle icon + "Surface · {context}" */}
      <div className={styles.section}>
        <div className={styles.surfaceRow}>
          {/* Sparkle icon in accent-gradient tile */}
          <span className={styles.sparkTile} aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
          <p className={styles.sectionBody}>
            <strong>Surface · </strong>
            {lead.surfaceContext}
          </p>
        </div>
      </div>

      {/* 5. Hoofdactie, vol breedte, accent gradient. In archief-modus is dat
            "Herstel naar pipeline" i.p.v. de fase-actie (die slaat nergens op
            voor een gearchiveerde lead). */}
      <div className={styles.actionsGrid}>
        {archived ? (
          <>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={(e) => {
                e.stopPropagation()
                onUnarchive?.(lead.id)
              }}
            >
              Herstel naar pipeline
            </button>
            <button
              type="button"
              className={styles.btnDanger}
              onClick={(e) => {
                e.stopPropagation()
                setDeleteOpen(true)
              }}
            >
              <Trash2 size={14} strokeWidth={2.3} aria-hidden="true" />
              Definitief verwijderen
            </button>
          </>
        ) : (
          <Link
            href={primary.href(lead.id)}
            className={styles.btnPrimary}
            onClick={(e) => e.stopPropagation()}
          >
            {primary.label}
          </Link>
        )}
      </div>

      {/* 6. Open volledig dossier */}
      <div className={styles.dossierWrap}>
        <button
          type="button"
          className={styles.btnDossier}
          onClick={(e) => {
            e.stopPropagation()
            onOpenLead(lead.id)
          }}
        >
          Open volledig dossier
          <ChevronRight />
        </button>
      </div>

      <ConfirmDeleteLeadDialog
        open={deleteOpen}
        leadId={lead.id}
        leadNaam={lead.naam}
        requireTyping={false}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
