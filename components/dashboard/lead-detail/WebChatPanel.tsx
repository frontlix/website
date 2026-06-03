'use client'

import { useState } from 'react'
import { Globe, Copy, Check, Mail, RefreshCw, AlertTriangle } from 'lucide-react'
import type { Lead } from '@/lib/dashboard/database.types'
import { useBotAction } from '@/components/dashboard/bot-actions/use-bot-action'
import {
  buildWebChatUrl,
  deriveWebChatStatus,
  isWebChatTokenExpiringSoon,
  formatWebChatTimestamp,
} from '@/lib/dashboard/web-chat-status'
import styles from './WebChatPanel.module.css'

/**
 * Web-chat fallback paneel. Toont alleen content als `lead.kanaal === 'web'`
 *, voor klanten die geen WhatsApp hebben en via magic-link in de browser
 * chatten. Bevat:
 *  - status-pill afgeleid uit timestamps (deriveWebChatStatus)
 *  - magic-link met kopieer-knop
 *  - expiry-datum (rood als binnen 3 dagen)
 *  - timeline van mail/reminder/geopend/voltooid events
 *  - twee acties: mail opnieuw versturen + token regenereren
 *
 * Renders `null` voor whatsapp-leads zodat de parent geen guard hoeft.
 */
export function WebChatPanel({ lead }: { lead: Lead }) {
  if (lead.kanaal !== 'web') return null

  const status = deriveWebChatStatus(lead)
  const url = buildWebChatUrl(lead.web_chat_token)
  const expiresSoon = isWebChatTokenExpiringSoon(lead.web_chat_token_expires_at)
  const expiresLabel = formatWebChatTimestamp(lead.web_chat_token_expires_at)

  return (
    <section className={styles.panel} aria-label="Web-chat status">
      <header className={styles.header}>
        <Globe size={16} className={styles.headerIcon} />
        <h3 className={styles.title}>Web-chat</h3>
        {status && (
          <span className={`dash-pill dash-pill-${status.tone}`}>
            {status.label}
          </span>
        )}
      </header>

      {url && <MagicLinkRow url={url} />}

      {expiresLabel && (
        <div className={`${styles.expiryRow} ${expiresSoon ? styles.expirySoon : ''}`}>
          {expiresSoon && <AlertTriangle size={13} />}
          <span className={styles.expiryLabel}>Verloopt op:</span>
          <span className={styles.expiryValue}>{expiresLabel}</span>
        </div>
      )}

      <WebChatTimeline lead={lead} />

      <WebChatActions leadId={lead.lead_id} />
    </section>
  )
}

function MagicLinkRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      // Reset na 2s zodat een tweede klik weer "Kopieer" toont.
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API faalt op insecure contexts, gebruiker kan handmatig
      // de tekst uit het readonly veld kopiëren.
    }
  }

  return (
    <div className={styles.linkRow}>
      <input
        type="text"
        readOnly
        value={url}
        className={styles.linkInput}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Magic-link voor web-chat"
      />
      <button
        type="button"
        className={styles.copyBtn}
        onClick={onCopy}
        aria-label="Kopieer link"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        <span>{copied ? 'Gekopieerd' : 'Kopieer'}</span>
      </button>
    </div>
  )
}

function WebChatTimeline({ lead }: { lead: Lead }) {
  const events: Array<{ label: string; at: string }> = []
  if (lead.web_chat_fallback_email_verzonden_op) {
    const at = formatWebChatTimestamp(lead.web_chat_fallback_email_verzonden_op)
    if (at) events.push({ label: 'Mail verzonden', at })
  }
  if (lead.web_chat_reminder_verzonden_op) {
    const at = formatWebChatTimestamp(lead.web_chat_reminder_verzonden_op)
    if (at) events.push({ label: 'Reminder verzonden', at })
  }
  if (lead.web_chat_geopend_op) {
    const at = formatWebChatTimestamp(lead.web_chat_geopend_op)
    if (at) events.push({ label: 'Klant heeft link geopend', at })
  }
  if (lead.web_chat_voltooid_op) {
    const at = formatWebChatTimestamp(lead.web_chat_voltooid_op)
    if (at) events.push({ label: 'Chat voltooid', at })
  }

  if (events.length === 0) return null

  return (
    <ul className={styles.timeline}>
      {events.map((ev) => (
        <li key={ev.label} className={styles.timelineItem}>
          <span className={styles.timelineDot} aria-hidden="true" />
          <span className={styles.timelineLabel}>{ev.label}</span>
          <time className={styles.timelineAt}>{ev.at}</time>
        </li>
      ))}
    </ul>
  )
}

function WebChatActions({ leadId }: { leadId: string }) {
  const resend = useBotAction(`/api/dashboard/lead/${leadId}/web-chat-link/resend`)
  const regen = useBotAction(`/api/dashboard/lead/${leadId}/web-chat-link/regenereer`)

  const onRegen = () => {
    const ok = window.confirm(
      'Hierna werkt de oude link niet meer en wordt een nieuwe mail verstuurd. Doorgaan?',
    )
    if (!ok) return
    regen.run({})
  }

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => resend.run({})}
        disabled={resend.pending || regen.pending}
      >
        <Mail size={13} />
        <span>{resend.pending ? 'Bezig…' : 'Stuur mail opnieuw'}</span>
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={onRegen}
        disabled={resend.pending || regen.pending}
      >
        <RefreshCw size={13} />
        <span>{regen.pending ? 'Bezig…' : 'Genereer nieuwe link'}</span>
      </button>
      {(resend.success || regen.success) && (
        <span className={styles.successMsg}>{resend.success ?? regen.success}</span>
      )}
      {(resend.error || regen.error) && (
        <span className={styles.errorMsg}>{resend.error ?? regen.error}</span>
      )}
    </div>
  )
}
