'use client'

import type { MobileLeadCard, MobileLeadStage } from './lead-mappers'
import styles from './LeadCard.module.css'

// ── Stage metadata — label + CSS class that drives color tokens ──────────────
const STAGE_META: Record<
  MobileLeadStage,
  { label: string; tone: string; emph: 'meta' | 'price' | 'datum' }
> = {
  gesprek: { label: 'In gesprek',   tone: 'blue',   emph: 'meta' },
  review:  { label: 'Owner-review', tone: 'amber',  emph: 'price' },
  uit:     { label: 'Offerte uit',  tone: 'violet', emph: 'price' },
  gepland: { label: 'Ingepland',    tone: 'green',  emph: 'datum' },
  klaar:   { label: 'Afgerond',     tone: 'gray',   emph: 'datum' },
}

// ── Avatar: colored circle with 1-2 initials ─────────────────────────────────
// Tint-index bepaalt welke achtergrondkleur wordt gekozen (stabiel per naam).
const AVATAR_COLORS = [
  '#1A56FF', '#0C7AB8', '#7C3AED', '#10B981', '#F59E0B',
  '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#F97316',
]

function getInitials(naam: string): string {
  const parts = naam.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarColor(naam: string): string {
  let hash = 0
  for (let i = 0; i < naam.length; i++) hash = (hash * 31 + naam.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ── LASource dot: wa=green / form=gray chip ───────────────────────────────────
function SourceDot({ bron }: { bron: 'wa' | 'form' }) {
  return (
    <span className={styles.sourceDot} data-bron={bron} aria-hidden="true">
      {bron === 'wa' ? (
        // WhatsApp icon
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.4A10 10 0 1012 2z" />
        </svg>
      ) : (
        // Document icon
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
    </span>
  )
}

// ── Right-side metric — varies by stage emphasis ──────────────────────────────
function RightMetric({
  lead,
  emph,
  tone,
}: {
  lead: MobileLeadCard
  emph: 'meta' | 'price' | 'datum'
  tone: string
}) {
  if (emph === 'datum' && lead.datum) {
    // Split "ma 19 mei" → weekday + date
    const parts = lead.datum.split(' ')
    const weekday = parts[0]
    const rest = parts.slice(1).join(' ')
    return (
      <div className={styles.metricDatum} data-tone={tone}>
        <span className={styles.metricDatumDay}>{weekday}</span>
        <span className={styles.metricDatumDate}>{rest}</span>
      </div>
    )
  }
  if (emph === 'price' && lead.prijs) {
    return (
      <div className={styles.metricPrice}>
        {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(lead.prijs)}
      </div>
    )
  }
  // Gesprek: geen prijs/datum beschikbaar
  return (
    <div className={styles.metricMeta}>
      Nog<br />geen prijs
    </div>
  )
}

// ── Stage pill ────────────────────────────────────────────────────────────────
export function LAStagePill({ stage }: { stage: MobileLeadStage }) {
  const meta = STAGE_META[stage]
  return (
    <span className={styles.stagePill} data-tone={meta.tone}>
      <span className={styles.stageDot} data-tone={meta.tone} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

// ── LeadCard (medium density) — presentational ───────────────────────────────
interface LeadCardProps {
  lead: MobileLeadCard
}

export function LeadCard({ lead }: LeadCardProps) {
  const meta = STAGE_META[lead.stage]
  const initials = getInitials(lead.naam)
  const avatarColor = getAvatarColor(lead.naam)

  return (
    <div className={styles.card}>
      {/* Top row: avatar / naam / metric */}
      <div className={styles.topRow}>
        {/* Avatar with source dot */}
        <div className={styles.avatarWrap}>
          <div
            className={styles.avatar}
            style={{ background: avatarColor }}
            aria-label={lead.naam}
          >
            {initials}
          </div>
          <SourceDot bron={lead.bron} />
        </div>

        {/* Name + meta */}
        <div className={styles.nameCol}>
          <p className={styles.name}>{lead.naam}</p>
          <p className={styles.meta}>
            {lead.plaats}
            {lead.m2 != null ? ` · ${lead.m2}m²` : ''}
            {lead.dienst ? ` · ${lead.dienst}` : ''}
          </p>
        </div>

        {/* Right metric */}
        <RightMetric lead={lead} emph={meta.emph} tone={meta.tone} />
      </div>

      {/* Bottom row: stage pill + time */}
      <div className={styles.bottomRow}>
        <LAStagePill stage={lead.stage} />
        <time className={styles.binnen} dateTime={lead.binnen}>
          {lead.binnen}
        </time>
      </div>
    </div>
  )
}
