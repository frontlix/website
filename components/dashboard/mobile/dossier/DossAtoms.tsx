'use client'

import Image from 'next/image'
import Link from 'next/link'
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
  // `href` gezet → het actie-icoon wordt een echte link (tel:/wa.me/maps);
  // anders blijft het een niet-interactief gekleurd icoon (huidig gedrag).
  action?: { icon: DossIconName; tone: string; href?: string }
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
        action.href ? (
          action.href.startsWith('http') ? (
            // Externe link (tel:-fallback, maps, …) → nieuw tabblad.
            <a
              className={styles.rowAction}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ '--tone': action.tone } as React.CSSProperties}
            >
              <ActionIcon size={15} aria-hidden="true" />
            </a>
          ) : (
            // Interne route (bv. /inbox?lead=…) → soepele client-side navigatie.
            <Link
              className={styles.rowAction}
              href={action.href}
              style={{ '--tone': action.tone } as React.CSSProperties}
            >
              <ActionIcon size={15} aria-hidden="true" />
            </Link>
          )
        ) : (
          <span
            className={styles.rowAction}
            style={{ '--tone': action.tone } as React.CSSProperties}
          >
            <ActionIcon size={15} aria-hidden="true" />
          </span>
        )
      )}
    </div>
  )
}

// ── DossPhoto ──
// 120px striped placeholder (135° repeating-linear-gradient on the two photo-stripe
// tokens) with a monospace tag chip bottom-left.
// `fit` bepaalt object-fit: 'cover' (standaard, beeldvullend) of 'contain'
// (hele foto zichtbaar met letterboxing). In de Foto's-tab gebruiken we
// 'contain' zodat de klantfoto nooit bijgesneden wordt.
// `onOpen` gezet → de tegel wordt een knop die de lightbox opent.
type DossPhotoProps = {
  tag: string
  /** Echte foto-URL (Supabase public_url); ontbreekt → gestreepte placeholder. */
  url?: string | null
  /** Bijsnijden (cover) of hele foto tonen (contain). Standaard cover. */
  fit?: 'cover' | 'contain'
  /** Klik-handler; gezet → tegel wordt een klikbare knop (cursor pointer). */
  onOpen?: () => void
}

export function DossPhoto({ tag, url, fit = 'cover', onOpen }: DossPhotoProps) {
  const content = (
    <>
      {url && (
        // unoptimized: zelfde aanpak als de desktop LeadPhotos, geen
        // next/image domain-config of optimalisatie nodig voor Supabase-URLs.
        <Image
          src={url}
          alt={tag}
          fill
          sizes="50vw"
          unoptimized
          className={fit === 'contain' ? styles.photoImgContain : styles.photoImg}
        />
      )}
      <span className={styles.photoTag}>{tag}</span>
    </>
  )

  // Met echte foto → neutrale letterbox-achtergrond i.p.v. de placeholder-strepen.
  const hasPhoto = Boolean(url) || undefined

  // Klikbaar (lightbox) → echte <button> voor toetsenbord/tik-toegankelijkheid.
  if (onOpen && url) {
    return (
      <button
        type="button"
        className={`${styles.photo} ${styles.photoButton}`}
        data-photo={hasPhoto}
        onClick={onOpen}
        aria-label={`Foto ${tag} groot bekijken`}
      >
        {content}
      </button>
    )
  }

  return <div className={styles.photo} data-photo={hasPhoto}>{content}</div>
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
