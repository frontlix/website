import type { Lead } from './database.types'

/**
 * Basis-URL van de Schoon Straatje bot die de magic-link host. De link
 * die in het web-chat paneel getoond wordt is `${BOT_BASE_URL}/chat/${token}`.
 *
 * Hardcoded omdat er momenteel één bot is. Zodra Frontlix voor meerdere
 * klanten met eigen subdomains gaat draaien moet dit verhuizen naar een
 * env var of per-tenant config-tabel.
 */
export const BOT_BASE_URL = 'https://schoonstraatje.frontlix.com'

export function buildWebChatUrl(token: string | null): string | null {
  if (!token) return null
  return `${BOT_BASE_URL}/chat/${token}`
}

export type WebChatSubStatus =
  | 'voltooid'
  | 'chat_actief'
  | 'mail_reminder'
  | 'mail_verzonden'
  | 'onbereikbaar'

/**
 * Pill-tone, mapt 1-op-1 op de `dash-pill-*` CSS-classes uit
 * `styles/dashboard.css`. We hergebruiken de bestaande pill-kleuren in plaats
 * van een eigen palet, `gray` voor "mail verzonden" (neutrale wacht-status),
 * `amber` voor "reminder verzonden" (zwakke alarm-toon).
 */
export type WebChatTone = 'green' | 'blue' | 'amber' | 'gray' | 'red'

export type WebChatStatusInfo = {
  key: WebChatSubStatus
  label: string
  tone: WebChatTone
}

/**
 * Leidt de sub-status van een web-chat lead af uit de timestamp-velden,
 * volgens de mapping in de bot-team hand-over:
 *
 *   voltooid_op    → "Web-chat voltooid"  (groen)
 *   geopend_op     → "Chat actief"        (blauw)
 *   reminder_op    → "Mail + reminder"    (amber)
 *   email_op       → "Mail verzonden"     (gray)
 *   (niets)        → "Onbereikbaar"       (rood, edge case)
 *
 * Eerste die toepasselijk is wint. Alleen relevant voor leads met
 * `kanaal === 'web'`; voor whatsapp-leads is dit `null`.
 */
export function deriveWebChatStatus(lead: Lead): WebChatStatusInfo | null {
  if (lead.kanaal !== 'web') return null

  if (lead.web_chat_voltooid_op) {
    return { key: 'voltooid', label: 'Web-chat voltooid', tone: 'green' }
  }
  if (lead.web_chat_geopend_op) {
    return { key: 'chat_actief', label: 'Chat actief', tone: 'blue' }
  }
  if (lead.web_chat_reminder_verzonden_op) {
    return { key: 'mail_reminder', label: 'Mail + reminder', tone: 'amber' }
  }
  if (lead.web_chat_fallback_email_verzonden_op) {
    return { key: 'mail_verzonden', label: 'Mail verzonden', tone: 'gray' }
  }
  return { key: 'onbereikbaar', label: 'Onbereikbaar', tone: 'red' }
}

/**
 * True als de magic-link binnen 3 dagen verloopt (waarschuwing in UI).
 * False bij geen expiry-datum.
 */
export function isWebChatTokenExpiringSoon(
  expiresAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false
  const expires = new Date(expiresAt)
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000
  return expires.getTime() - now.getTime() < threeDaysMs
}

/**
 * Format helper voor de timeline in het web-chat paneel.
 * Geeft bv. "14 mei 2026, 10:32" terug; null bij lege input.
 */
export function formatWebChatTimestamp(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
