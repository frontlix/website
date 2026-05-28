'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type Bericht } from '@/lib/dashboard/database.types'
import { type InboxLeadContext } from '@/lib/dashboard/inbox-queries'
import { InboxMarkRead } from '@/components/dashboard/inbox/InboxMarkRead'
import { MessageBubble, DaySeparator, SystemBanner } from './MessageBubble'
import { MobileChatComposer } from './MobileChatComposer'
import { MobileLeadInfoSheet } from './MobileLeadInfoSheet'
import styles from './MobileChatDetail.module.css'

interface MobileChatDetailProps {
  leadId: string
  messages: Bericht[]
  lead: InboxLeadContext
  chatbotNaam: string
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

/**
 * Volledig-scherm WhatsApp-stijl chat.
 * Bevat: WA-groene header (back + identiteit + bel/meer),
 * Surface-toggle-banner, chat-area (bubbles + separators),
 * composer en lead-info-sheet.
 */
export function MobileChatDetail({
  leadId,
  messages,
  lead,
  chatbotNaam,
}: MobileChatDetailProps) {
  const router = useRouter()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  // Initialiseer uit lead.botGepauzeerd; toggle doet API-call + router.refresh
  const [surfaceOn, setSurfaceOn] = useState(!lead.botGepauzeerd)
  const [togglePending, startToggle] = useTransition()

  // Scroll naar het nieuwste bericht bij mount
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
    }
  }, [])

  function handleSurfaceToggle() {
    const nextPaused = surfaceOn // surfaceOn true → we gaan pauzeren
    setSurfaceOn((v) => !v) // optimistische update

    startToggle(async () => {
      try {
        const res = await fetch(`/api/dashboard/lead/${leadId}/bot-pauzeren`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paused: nextPaused }),
        })
        if (!res.ok) {
          // Terugdraaien bij fout
          setSurfaceOn((v) => !v)
        } else {
          router.refresh()
        }
      } catch {
        setSurfaceOn((v) => !v)
      }
    })
  }

  // Groepeer berichten op dag voor DaySeparator
  type MsgItem =
    | { kind: 'system'; text: string }
    | { kind: 'separator'; label: string }
    | { kind: 'msg'; msg: Bericht; continued: boolean }

  const items: MsgItem[] = []
  let lastDayKey = ''
  let lastRichting = ''

  // Altijd een systeemmelding bovenaan
  items.push({ kind: 'system', text: 'Lead binnengekomen via WhatsApp' })

  for (const msg of messages) {
    const dayKey = msg.timestamp
      ? new Date(msg.timestamp).toLocaleDateString('nl-NL', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : ''

    if (dayKey && dayKey !== lastDayKey) {
      items.push({ kind: 'separator', label: dayKey })
      lastDayKey = dayKey
      lastRichting = ''
    }

    // `continued=true` als dezelfde richting als vorige bericht op zelfde dag
    const continued = msg.richting === lastRichting
    items.push({ kind: 'msg', msg, continued })
    lastRichting = msg.richting
  }

  return (
    <div className={styles.root}>
      {/* Onzichtbaar side-effect: markeer gelezen */}
      <InboxMarkRead leadId={leadId} />

      {/* ── Header (WA-groen) ─────────────────────────────── */}
      <header className={styles.header}>
        {/* Terug-knop */}
        <Link
          href="/dashboard/inbox"
          className={styles.backBtn}
          aria-label="Terug naar inbox"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>

        {/* Identiteits-knop → opent sheet */}
        <button
          type="button"
          className={styles.identityBtn}
          onClick={() => setSheetOpen(true)}
          aria-label={`Toon info over ${lead.naam}`}
        >
          <div className={styles.headerAvatar} aria-hidden="true">
            {initials(lead.naam)}
          </div>
          <div className={styles.headerIdentityText}>
            <div className={styles.headerNaam}>{lead.naam}</div>
            <div className={styles.headerSub}>
              {lead.plaats ?? 'tik voor info'}
            </div>
          </div>
        </button>

        {/* Telefoon-knop */}
        <a
          href={`tel:${lead.telefoon}`}
          className={styles.iconBtn}
          aria-label={`Bel ${lead.naam}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.4 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.9.6 2.9.7A2 2 0 0122 16.9z"/>
          </svg>
        </a>

        {/* Menu-knop (v1: geen actie) */}
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Meer opties"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </header>

      {/* ── Surface-toggle-banner ─────────────────────────── */}
      <SurfaceBanner
        on={surfaceOn}
        chatbotNaam={chatbotNaam}
        onToggle={handleSurfaceToggle}
        pending={togglePending}
      />

      {/* ── Chat-area ─────────────────────────────────────── */}
      <div ref={scrollerRef} className={styles.chatArea}>
        {items.map((item, idx) => {
          if (item.kind === 'system') {
            return <SystemBanner key={`sys-${idx}`} text={item.text} />
          }
          if (item.kind === 'separator') {
            return <DaySeparator key={`sep-${idx}`} label={item.label} />
          }
          return (
            <MessageBubble
              key={item.msg.id}
              msg={item.msg}
              continued={item.continued}
            />
          )
        })}
      </div>

      {/* ── Composer ─────────────────────────────────────── */}
      <MobileChatComposer
        leadId={leadId}
        botPaused={!surfaceOn}
      />

      {/* ── Lead-info sheet ──────────────────────────────── */}
      <MobileLeadInfoSheet
        lead={lead}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}

/* ── Surface-toggle banner ───────────────────────────── */

interface SurfaceBannerProps {
  on: boolean
  chatbotNaam: string
  onToggle: () => void
  pending: boolean
}

function SurfaceBanner({ on, chatbotNaam, onToggle, pending }: SurfaceBannerProps) {
  const BLUE = '#0C7AB8'

  return (
    <div className={`${styles.banner} ${on ? styles.bannerOn : styles.bannerOff}`}>
      {/* Icoon-tile */}
      <span className={`${styles.bannerIcon} ${on ? styles.bannerIconOn : styles.bannerIconOff}`}>
        {on ? (
          /* Sparkle */
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
        ) : (
          /* Pauze */
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#D97706">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        )}
      </span>

      {/* Tekst */}
      <div className={styles.bannerText}>
        <span className={`${styles.bannerTitle} ${on ? styles.bannerTitleOn : styles.bannerTitleOff}`}>
          {on ? `${chatbotNaam} beantwoordt automatisch` : 'Jij neemt het gesprek over'}
        </span>
        <span className={styles.bannerSub}>
          {on
            ? `Tik om ${chatbotNaam} uit te zetten`
            : `${chatbotNaam} gepauzeerd — berichten gaan via jou`}
        </span>
      </div>

      {/* Toggle-switch */}
      <button
        type="button"
        className={`${styles.toggle} ${on ? styles.toggleOn : styles.toggleOff}`}
        onClick={onToggle}
        disabled={pending}
        aria-label={on ? `${chatbotNaam} uitschakelen` : `${chatbotNaam} inschakelen`}
        aria-pressed={on}
      >
        <span className={`${styles.toggleKnob} ${on ? styles.knobOn : styles.knobOff}`} />
      </button>
    </div>
  )
}
