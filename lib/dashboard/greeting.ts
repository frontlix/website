import type { User } from '@supabase/supabase-js'

/**
 * Tijd-afhankelijke begroeting (Nederlands):
 *  - 05:00 t/m 11:59 → "Goedemorgen"
 *  - 12:00 t/m 17:59 → "Goedemiddag"
 *  - 18:00 t/m 04:59 → "Goedeavond"
 *
 * Gebruikt Europe/Amsterdam zodat de begroeting altijd bij de lokale tijd
 * van de gebruiker past, onafhankelijk van de server-timezone.
 */
export function getGreeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('nl-NL', {
      timeZone: 'Europe/Amsterdam',
      hour: '2-digit',
      hour12: false,
    }).format(now)
  )
  if (hour >= 5 && hour < 12) return 'Goedemorgen'
  if (hour >= 12 && hour < 18) return 'Goedemiddag'
  return 'Goedeavond'
}

/**
 * Voornaam afleiden uit een Supabase user. Probeert in volgorde:
 *  1. user_metadata.first_name
 *  2. eerste woord van user_metadata.full_name / name
 *  3. deel vóór '@' in het e-mailadres (capitalize)
 *  4. fallback "daar"
 */
export function getVoornaam(user: User | null | undefined): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>

  const first = pickString(meta.first_name)
  if (first) return first

  const full = pickString(meta.full_name) ?? pickString(meta.name)
  if (full) {
    const head = full.trim().split(/\s+/)[0]
    if (head) return capitalize(head)
  }

  const email = user?.email
  if (email) {
    const local = email.split('@')[0] ?? ''
    // "jan.de.vries" → "Jan", "j_smith" → "J", "christiaan" → "Christiaan"
    const head = local.split(/[._-]/)[0] ?? local
    if (head) return capitalize(head)
  }

  return 'daar'
}

function pickString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function capitalize(s: string): string {
  if (!s) return s
  return s[0].toUpperCase() + s.slice(1).toLowerCase()
}
