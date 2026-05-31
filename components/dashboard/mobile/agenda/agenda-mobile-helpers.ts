// agenda-mobile-helpers.ts
// Time / slot helpers (tested) + eventTone / dateLabel ported from ABShared.jsx / AgendaShared.jsx.

import type { AgendaEventKind } from './agenda-mock'

// ── Time helpers (verbatim from plan, Step 3) ─────────────────────────────

export type TimeBlock = { start: string; end: string }

/** Minuten tussen twee 'HH:MM'-tijden (zelfde dag). */
export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

/** Duur als 'Xu Ym' / 'Xu' / 'Ym'. */
export function durStr(start: string, end: string): string {
  const total = minutesBetween(start, end)
  const u = Math.floor(total / 60)
  const m = total % 60
  if (u === 0) return `${m}m`
  if (m === 0) return `${u}u`
  return `${u}u ${m}m`
}

/** Botst een nieuw slot (start + duur in min) met een bestaand bezet-blok? */
export function slotConflict(
  start: string,
  durMin: number,
  busy: TimeBlock[],
): { conflict: true; with: TimeBlock } | { conflict: false } {
  const [sh, sm] = start.split(':').map(Number)
  const s = sh * 60 + sm
  const e = s + durMin
  for (const b of busy) {
    const bs = minutesBetween('00:00', b.start)
    const be = minutesBetween('00:00', b.end)
    if (s < be && e > bs) return { conflict: true, with: b }
  }
  return { conflict: false }
}

// ── Event tone (kind → CSS custom property) ───────────────────────────────
// Translation contract: plaatsbezoek→--color-warning, klus→--color-primary,
// bel→--color-whatsapp, eigen→--color-text-muted.
// Handoff used ev.tone: green(klus)=success, blue(plaatsbezoek)=accent/primary,
// amber(bel/eigen)=warning. We map the typed kind instead.

/**
 * Returns the CSS custom property string for the event's tone colour.
 * Apply as `style={{ '--tone': eventTone(ev.kind) } as React.CSSProperties}`.
 */
export function eventTone(kind: AgendaEventKind): string {
  switch (kind) {
    case 'klus':         return 'var(--color-primary)'
    case 'plaatsbezoek': return 'var(--color-warning)'
    case 'bel':          return 'var(--color-whatsapp)'
    case 'eigen':        return 'var(--color-text-muted)'
  }
}

// ── Date label (ported from AgendaShared.jsx / ABShared.jsx) ──────────────
// Format: 'Vandaag' | 'Morgen' | 'Gisteren' | 'Maandag 11 mei' etc.
// Referentiepunt `todayDate` ('YYYY-MM-DD', Amsterdam) wordt door de caller
// geleverd (geen mock-constante meer).

const NL_WEEKDAY_LONG: Record<number, string> = {
  1: 'maandag',
  2: 'dinsdag',
  3: 'woensdag',
  4: 'donderdag',
  5: 'vrijdag',
  6: 'zaterdag',
  0: 'zondag',
}

const NL_MONTH_SHORT = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
]

/**
 * Human-friendly date label in Dutch.
 * 'Vandaag' / 'Morgen' / 'Gisteren' / 'Woensdag 13 mei'
 */
export function dateLabel(date: string, todayDate: string): string {
  const d = new Date(date + 'T00:00:00')
  const today = new Date(todayDate + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Vandaag'
  if (diff === 1) return 'Morgen'
  if (diff === -1) return 'Gisteren'
  const wd = NL_WEEKDAY_LONG[d.getDay()]
  return wd.charAt(0).toUpperCase() + wd.slice(1) + ' ' + d.getDate() + ' ' + NL_MONTH_SHORT[d.getMonth()]
}
