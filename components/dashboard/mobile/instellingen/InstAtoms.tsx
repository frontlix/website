'use client'

import {
  Building2,
  Euro,
  List,
  Tag,
  MessageCircle,
  Bell,
  Sparkles,
  Users,
  ChevronRight,
  Check,
  X,
  Plus,
  Minus,
  Mail,
  Smartphone,
  Search,
  type LucideIcon,
} from 'lucide-react'
import type { InstSection } from './instellingen-mock'
import styles from './InstAtoms.module.css'

// ── Icon map (Translation Contract: InstIcon name → lucide-react) ──
export const INST_LUCIDE: Record<InstSection['icon'], LucideIcon> = {
  building: Building2,
  euro: Euro,
  list: List,
  tag: Tag,
  wa: MessageCircle,
  bell: Bell,
  spark: Sparkles,
  users: Users,
}

// Re-exported for consumers that need the full icon set
export { ChevronRight, Check, X, Plus, Minus, Mail, Smartphone, Search }

// ── InstSectionIcon ──
// Renders the lucide icon for `name` in a tinted rounded square.
// small=true → 30×30 radius 8 (search rows); default → 38×38 radius 11 (hub cards).
// Tint is injected via --tint CSS custom property; bg and fg derived via color-mix.
type InstSectionIconProps = {
  name: InstSection['icon']
  tint: string
  size?: number
  small?: boolean
}

export function InstSectionIcon({ name, tint, size = 19, small = false }: InstSectionIconProps) {
  const Icon = INST_LUCIDE[name]
  return (
    <span
      className={`${styles.tintIcon} ${small ? styles.tintIconSmall : styles.tintIconDefault}`}
      style={{ '--tint': tint } as React.CSSProperties}
    >
      <Icon size={size} aria-hidden="true" />
    </span>
  )
}

// ── InstField ──
// Text input with a floating label. Standaard read-only: er is (nog) geen
// save-action voor de bedrijfsvelden, dus we tonen de echte tenant-waarde
// zonder een dode "opslaan"-belofte. Een leeg veld toont een em-dash.
type InstFieldProps = {
  label: string
  value: string | null | undefined
}

export function InstField({ label, value }: InstFieldProps) {
  // Koppel label aan input zodat tikken op het label de input focust (a11y + autofill).
  const id = `inst-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
      <input
        id={id}
        className={styles.fieldInput}
        value={value || '—'}
        readOnly
      />
    </div>
  )
}

// ── InstGroupCard ──
// Surface card container; radius 14, overflow hidden — wraps rows/items.
type InstGroupCardProps = {
  children: React.ReactNode
}

export function InstGroupCard({ children }: InstGroupCardProps) {
  return <div className={styles.groupCard}>{children}</div>
}

// ── InstPrimaryBtn ──
// Full-width blue CTA button. Disabled state uses color-mix to fade the primary color.
type InstPrimaryBtnProps = {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}

export function InstPrimaryBtn({ children, disabled = false, onClick }: InstPrimaryBtnProps) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={styles.primaryBtn}>
      {children}
    </button>
  )
}

// ── InstGhostBtn ──
// Full-width bordered ghost button (primary border + text, transparent bg).
// Children typically include a lucide icon + label text with a gap.
type InstGhostBtnProps = {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}

export function InstGhostBtn({ children, disabled = false, onClick }: InstGhostBtnProps) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={styles.ghostBtn}>
      {children}
    </button>
  )
}
