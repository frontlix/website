'use client'

// ── FlowAtoms ────────────────────────────────────────────────────────────
// Shared primitives for the mobile Agenda click-flows (Klus / Plaatsbezoek /
// Afronden). Ported from handoff src/agenda-b/flow/FlowShared.jsx.
// Translation Contract: handoff inline styles → colocated .module.css + tokens;
// per-event color via eventTone(kind) injected as --tone custom property +
// color-mix (replaces the handoff's c+'14'/c+'20'/c+'30' alpha-hex); custom SVG
// icons → lucide-react. No inline theme styles.
// ──────────────────────────────────────────────────────────────────────────

import {
  ChevronLeft,
  Clock,
  MapPin,
  Check,
  Zap,
  Phone,
  MessageCircle,
  Camera,
  Route,
  Pencil,
  Euro,
  Star,
  Bell,
  Sparkles,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import type React from 'react'
import type { AgendaEvent } from './agenda-mock'
import { durStr, eventTone } from './agenda-mobile-helpers'
import styles from './FlowAtoms.module.css'

// ── Icon map (Translation Contract: handoff AIcon name → lucide-react) ──
// Detail-card header icons + big-action icons are passed by name; consumers
// (FlowKlus / FlowPlaatsbezoek / FlowAfronden) pick names from this set.
export const FLOW_LUCIDE = {
  back: ChevronLeft,
  clock: Clock,
  pin: MapPin,
  check: Check,
  bolt: Zap,
  phone: Phone,
  wa: MessageCircle,
  cam: Camera,
  foto: Camera,
  route: Route,
  edit: Pencil,
  euro: Euro,
  star: Star,
  bell: Bell,
  spark: Sparkles,
  doc: FileText,
} satisfies Record<string, LucideIcon>

export type FlowIconName = keyof typeof FLOW_LUCIDE

// ── FNav ───────────────────────────────────────────────────────────────────
// Top nav bar for the full-height Afronden sheet only. When flow content lives
// inside MobileDrilldownLayer the layer already provides back+title, so this is
// NOT used there — it is for the standalone full-height sheet.
type FNavProps = {
  title: string
  sub?: string
  rightLabel?: string
  onBack: () => void
  onRight?: () => void
}

export function FNav({ title, sub, rightLabel = 'Bewerk', onBack, onRight }: FNavProps) {
  return (
    <div className={styles.nav}>
      <button type="button" className={styles.navBack} onClick={onBack} aria-label="Terug">
        <ChevronLeft size={22} aria-hidden="true" />
      </button>
      <div className={styles.navTitleWrap}>
        <div className={styles.navTitle}>{title}</div>
        {sub && <div className={styles.navSub}>{sub}</div>}
      </div>
      <button type="button" className={styles.navRight} onClick={onRight}>
        {rightLabel}
      </button>
    </div>
  )
}

// ── FHero ────────────────────────────────────────────────────────────────────
// Event-tone gradient banner: kind badge (+ optional extra badge), name,
// clock-line with time range + duration. Tone is derived from ev.kind via
// eventTone() and injected as --tone; the gradient/border use color-mix
// (replaces handoff c+'14' / c+'04' / c+'30').
type FHeroProps = {
  ev: AgendaEvent
  kindLabel: string
  badge?: React.ReactNode
}

export function FHero({ ev, kindLabel, badge }: FHeroProps) {
  const tone = eventTone(ev.kind)
  return (
    <div className={styles.hero} style={{ '--tone': tone } as React.CSSProperties}>
      <div className={styles.heroBody}>
        <div className={styles.heroBadges}>
          <span className={styles.heroKind}>{kindLabel}</span>
          {badge}
        </div>
        <div className={styles.heroName}>{ev.naam}</div>
        <div className={styles.heroTime}>
          <Clock size={13} aria-hidden="true" />
          <span className={styles.heroTimeText}>
            {ev.start} – {ev.end} · {durStr(ev.start, ev.end)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── FDetailCard ──────────────────────────────────────────────────────────────
// Surface card with an uppercase header (lucide icon + title + optional right
// slot) and a body. dense → tighter top/bottom body padding.
type FDetailCardProps = {
  icon?: FlowIconName
  title: string
  right?: React.ReactNode
  dense?: boolean
  children: React.ReactNode
}

export function FDetailCard({ icon, title, right, dense = false, children }: FDetailCardProps) {
  const Icon = icon ? FLOW_LUCIDE[icon] : null
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardHeadLeft}>
          {Icon && <Icon size={13} className={styles.cardHeadIcon} aria-hidden="true" />}
          <span className={styles.cardTitle}>{title}</span>
        </div>
        {right}
      </div>
      <div className={styles.cardBody} data-dense={dense || undefined}>
        {children}
      </div>
    </div>
  )
}

// ── FKV ──────────────────────────────────────────────────────────────────────
// Key/value row inside a detail card: key(12 muted) left, value(13/500) right.
// last → no divider.
type FKVProps = {
  k: React.ReactNode
  v: React.ReactNode
  last?: boolean
}

export function FKV({ k, v, last }: FKVProps) {
  return (
    <div className={styles.kv} data-last={last || undefined}>
      <span className={styles.kvKey}>{k}</span>
      <span className={styles.kvVal}>{v}</span>
    </div>
  )
}

// ── FCheckRow ──────────────────────────────────────────────────────────────────
// Checklist row: 22×22 circular checkbox (done → success fill + white check;
// indeterminate → warning ring + warning dot; pending → soft border) + label
// (struck-through + muted when done) + optional time. last → no divider.
type FCheckRowProps = {
  done?: boolean
  indeterminate?: boolean
  label: string
  time?: string
  last?: boolean
}

export function FCheckRow({ done = false, indeterminate = false, label, time, last }: FCheckRowProps) {
  return (
    <div className={styles.checkRow} data-last={last || undefined}>
      <span
        className={styles.checkBox}
        data-done={done || undefined}
        data-indeterminate={!done && indeterminate ? true : undefined}
      >
        {done && <Check size={12} strokeWidth={3} aria-hidden="true" />}
        {!done && indeterminate && <span className={styles.checkDot} />}
      </span>
      <div className={styles.checkLabel} data-done={done || undefined}>
        {label}
      </div>
      {time && <div className={styles.checkTime}>{time}</div>}
    </div>
  )
}

// ── FBigAction ──────────────────────────────────────────────────────────────────
// Large stacked action button (icon over label). primary → primary bg + white
// fg + primary glow shadow; default → surface.
type FBigActionProps = {
  icon: FlowIconName
  label: string
  primary?: boolean
  onClick?: () => void
}

export function FBigAction({ icon, label, primary, onClick }: FBigActionProps) {
  const Icon = FLOW_LUCIDE[icon]
  return (
    <button
      type="button"
      className={styles.bigAction}
      data-primary={primary || undefined}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
      <span className={styles.bigActionLabel}>{label}</span>
    </button>
  )
}

// ── FMiniMap ──────────────────────────────────────────────────────────────────
// Static route-preview: subtle grid background, dashed primary route, a pin
// marker, and a distance/duration label chip bottom-right. The grid pattern id
// is keyed off `label` so multiple maps on one screen stay unique.
type FMiniMapProps = {
  label: string
}

export function FMiniMap({ label }: FMiniMapProps) {
  // Sanitize the label into a DOM-safe id fragment for the SVG <pattern>.
  const patternId = `fmm-grid-${label.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <div className={styles.miniMap}>
      <svg viewBox="0 0 320 100" width="100%" height="100" className={styles.miniMapSvg}>
        <defs>
          <pattern id={patternId} width="22" height="22" patternUnits="userSpaceOnUse">
            <path
              d="M 22 0 L 0 0 0 22"
              fill="none"
              className={styles.miniMapGrid}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="320" height="100" fill={`url(#${patternId})`} />
        <path
          d="M 20 70 Q 100 55 160 50 Q 220 45 300 30"
          fill="none"
          className={styles.miniMapRoute}
          strokeWidth="2.5"
          strokeDasharray="4 5"
        />
        <circle cx="160" cy="50" r="9" className={styles.miniMapPin} />
        <circle cx="160" cy="50" r="9" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M 160 41 L 162 49 L 160 56 L 158 49 Z" fill="#fff" />
      </svg>
      <div className={styles.miniMapLabel}>{label}</div>
    </div>
  )
}
