'use client'

import {
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  Camera,
  FileText,
  MessageCircle,
  Sparkles,
  Check,
  Pencil,
  Pause,
  type LucideIcon,
} from 'lucide-react'
import type { DossActity } from './dossier-mock'
import styles from './DossAtoms.module.css'

// ── Icon map (Translation Contract: handoff DLIcon name → lucide-react) ──
// Covers both the contact-row icons and the activity/timeline icons.
export const DOSS_LUCIDE = {
  back: ChevronLeft,
  pin: MapPin,
  phone: Phone,
  mail: Mail,
  cam: Camera,
  doc: FileText,
  wa: MessageCircle,
  spark: Sparkles,
  check: Check,
  edit: Pencil,
  pause: Pause,
} satisfies Record<string, LucideIcon>

export type DossIconName = keyof typeof DOSS_LUCIDE

// Re-exported so consumers (tab bodies) can reach the raw lucide set.
export { ChevronLeft, MapPin, Phone, Mail, Camera, FileText, MessageCircle, Sparkles, Check, Pencil, Pause }

// ── DossLabel ──
// Uppercase section label: 12/700 muted, letter-spacing .05em, padding 0 4px 8px.
type DossLabelProps = {
  children: React.ReactNode
}

export function DossLabel({ children }: DossLabelProps) {
  return <div className={styles.label}>{children}</div>
}

// ── DossRow ──
// Contact row: lucide icon (16, muted) + label(11 muted)/value(14/500),
// plus an optional 30×30 tinted action button. The action tint is injected via
// --tone; bg = color-mix 13% (replaces handoff's tone+'22' alpha-hex), fg = tone.
type DossRowProps = {
  icon: DossIconName
  label: string
  value: string
  action?: { icon: DossIconName; tone: string }
}

export function DossRow({ icon, label, value, action }: DossRowProps) {
  const Icon = DOSS_LUCIDE[icon]
  const ActionIcon = action ? DOSS_LUCIDE[action.icon] : null
  return (
    <div className={styles.row}>
      <Icon className={styles.rowIcon} size={16} aria-hidden="true" />
      <div className={styles.rowText}>
        <div className={styles.rowLabel}>{label}</div>
        <div className={styles.rowValue}>{value}</div>
      </div>
      {action && ActionIcon && (
        <span
          className={styles.rowAction}
          style={{ '--tone': action.tone } as React.CSSProperties}
        >
          <ActionIcon size={15} aria-hidden="true" />
        </span>
      )}
    </div>
  )
}

// ── DossPhoto ──
// 120px striped placeholder (135° repeating-linear-gradient on the two photo-stripe
// tokens) with a monospace tag chip bottom-left.
type DossPhotoProps = {
  tag: string
}

export function DossPhoto({ tag }: DossPhotoProps) {
  return (
    <div className={styles.photo}>
      <span className={styles.photoTag}>{tag}</span>
    </div>
  )
}

// ── DossCheckPill ──
// Check icon + text pill: bg color-mix(--color-primary 8%, transparent), text primary.
type DossCheckPillProps = {
  children: React.ReactNode
}

export function DossCheckPill({ children }: DossCheckPillProps) {
  return (
    <span className={styles.checkPill}>
      <Check size={12} aria-hidden="true" /> {children}
    </span>
  )
}

// ── DossDotRow ──
// 7×7 rounded dot (--tone) + label(flex) + value(12.5 soft); padding 11px 14px.
type DossDotRowProps = {
  tone: string
  label: string
  value: string
}

export function DossDotRow({ tone, label, value }: DossDotRowProps) {
  return (
    <div className={styles.dotRow}>
      <span className={styles.dot} style={{ '--tone': tone } as React.CSSProperties} />
      <span className={styles.dotLabel}>{label}</span>
      <span className={styles.dotValue}>{value}</span>
    </div>
  )
}

// ── DossCheckbox ──
// 20×20 circle: done → --color-success fill + white Check (12, stroke 3);
// pending → 1.5px border.
type DossCheckboxProps = {
  done: boolean
}

export function DossCheckbox({ done }: DossCheckboxProps) {
  return (
    <span className={styles.checkbox} data-done={done || undefined}>
      {done && <Check size={12} strokeWidth={3} aria-hidden="true" />}
    </span>
  )
}

// ── DossTimelineItem ──
// 28×28 tinted bubble (--tone, color-mix 14%) + lucide icon, optional connector
// line below, plus text(13.5)/time(11 muted).
type DossTimelineItemProps = {
  icon: DossActity['icon']
  tone: string
  text: string
  time: string
  connector?: boolean
}

export function DossTimelineItem({ icon, tone, text, time, connector = false }: DossTimelineItemProps) {
  const Icon = DOSS_LUCIDE[icon]
  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineRail}>
        <span
          className={styles.timelineBubble}
          style={{ '--tone': tone } as React.CSSProperties}
        >
          <Icon size={14} aria-hidden="true" />
        </span>
        {connector && <span className={styles.timelineConnector} />}
      </div>
      <div className={styles.timelineBody}>
        <div className={styles.timelineText}>{text}</div>
        <div className={styles.timelineTime}>{time}</div>
      </div>
    </div>
  )
}
