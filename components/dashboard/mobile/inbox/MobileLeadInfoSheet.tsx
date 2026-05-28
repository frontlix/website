'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { type InboxLeadContext } from '@/lib/dashboard/inbox-queries'
import { archiveLead } from '@/lib/dashboard/lead-actions'
import { useBotAction } from '@/components/dashboard/bot-actions/use-bot-action'
import styles from './MobileLeadInfoSheet.module.css'

interface MobileLeadInfoSheetProps {
  lead: InboxLeadContext
  open: boolean
  onClose: () => void
}

/** Initialen uit naam (max 2 letters). */
function initials(naam: string): string {
  return naam
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** Omschrijving van de huidige gesprek-fase als leesbaar label. */
function faseLabel(fase: string | null | undefined): string {
  const map: Record<string, string> = {
    info_verzamelen:    'In gesprek',
    offerte_besproken:  'Offerte verstuurd',
    onderhandelen:      'Onderhandelen',
    datum_kiezen:       'Datum kiezen',
    afspraak_bevestigd: 'Ingepland',
  }
  return fase ? (map[fase] ?? fase) : 'Nieuw'
}

/** Formatteer een ISO-datum naar dd/mm/yyyy. */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Bottom-sheet met lead-details vanuit de chat-header.
 * Bevat: drag-handle, identiteit, stats-grid, dienst, acties, sluit-knop.
 * Slide-animatie vanuit onderin (--ease-ios 300ms).
 */
export function MobileLeadInfoSheet({ lead, open, onClose }: MobileLeadInfoSheetProps) {
  const router = useRouter()
  const [archivePending, startArchive] = useTransition()
  const { run: toggleBot, pending: botPending } = useBotAction(
    `/api/dashboard/lead/${lead.lead_id}/bot-pauzeren`,
  )

  if (!open) return null

  function handleArchive() {
    startArchive(async () => {
      await archiveLead(lead.lead_id)
      onClose()
      router.push('/inbox')
    })
  }

  function handleBotToggle() {
    toggleBot({ paused: !lead.botGepauzeerd })
    onClose()
  }

  const dienst = lead.sub_diensten
    ? (Array.isArray(lead.sub_diensten)
        ? (lead.sub_diensten as string[]).join(', ')
        : String(lead.sub_diensten))
    : lead.hoofdcategorie ?? '—'

  return (
    <>
      {/* Backdrop */}
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Sluit lead-info"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
      />

      {/* Sheet */}
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`Lead-info: ${lead.naam}`}
      >
        {/* Drag-handle */}
        <div className={styles.handle} aria-hidden="true" />

        {/* Identiteit */}
        <div className={styles.identity}>
          <div className={styles.avatar} aria-hidden="true">
            {initials(lead.naam)}
          </div>
          <div className={styles.identityText}>
            <div className={styles.identityNaam}>{lead.naam}</div>
            <div className={styles.identityMeta}>
              {lead.lead_id} · {lead.plaats ?? '—'}
            </div>
          </div>
          <span className={styles.stagePill}>{faseLabel(lead.gesprek_fase)}</span>
        </div>

        {/* Stats-grid: 4 kolommen */}
        <div className={styles.statsGrid}>
          <StatCell value={lead.m2 ? `${lead.m2}m²` : '—'} label="Oppervlak" />
          <StatCell value={String(lead.fotosCount)} label="Foto's" />
          <StatCell
            value={
              lead.totaal_prijs
                ? new Intl.NumberFormat('nl-NL', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  }).format(lead.totaal_prijs)
                : '—'
            }
            label="Offerte"
            highlight={Boolean(lead.totaal_prijs)}
          />
          <StatCell value={fmtDate(lead.aangemaakt)} label="Laatste" />
        </div>

        {/* Dienst */}
        <div className={styles.dienstSection}>
          <div className={styles.sectionLabel}>Dienst</div>
          <div className={styles.dienstText}>{dienst}</div>
        </div>

        {/* Acties */}
        <div className={styles.actiesSection}>
          <div className={styles.sectionLabel}>Acties</div>
          <div className={styles.actiesGrid}>
            {/* Primaire actie: stuur offerte → leads-pagina */}
            <Link
              href="/leads?nieuwe-offerte=1"
              className={`${styles.actionBtn} ${styles.actionPrimary}`}
              onClick={onClose}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Stuur offerte
            </Link>

            {/* Plan afspraak */}
            <button
              type="button"
              className={styles.actionBtn}
              onClick={onClose}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Plan afspraak
            </button>

            {/* Surface overnemen / teruggeven */}
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleBotToggle}
              disabled={botPending}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {lead.botGepauzeerd ? 'Surface hervatten' : 'Surface overnemen'}
            </button>

            {/* Archiveer */}
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleArchive}
              disabled={archivePending}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8"/>
                <rect x="1" y="3" width="22" height="5"/>
                <line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
              Archiveer
            </button>
          </div>

          {/* Sluit-knop */}
          <button
            type="button"
            className={styles.sluitBtn}
            onClick={onClose}
          >
            Sluit
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Hulp-component: statistiek-cel ─────────────────── */

interface StatCellProps {
  value: string
  label: string
  highlight?: boolean
}

function StatCell({ value, label, highlight = false }: StatCellProps) {
  return (
    <div className={styles.statCell}>
      <span className={`${styles.statValue} ${highlight ? styles.statValueHi : ''}`}>
        {value}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}
