'use client'

import type { Bericht } from '@/lib/dashboard/database.types'
import { speakerFor } from './inbox-mappers'
import styles from './MessageBubble.module.css'

interface MessageBubbleProps {
  msg: Bericht
  /** Wanneer true: dit bericht is deel van een aaneengesloten reeks
   * van dezelfde spreker — verberg de Surface-label en tail-cut. */
  continued?: boolean
}

/**
 * Eén WhatsApp-stijl chat-bubbel.
 * - klant  → links, witte achtergrond (--wa-in-bg / --wa-in-fg)
 * - surface → rechts, blauw (--wa-surface-bg / --wa-surface-fg)
 * Tail-cut: top-left 0 voor klant (eerste van reeks), top-right 0 voor surface.
 */
export function MessageBubble({ msg, continued = false }: MessageBubbleProps) {
  const speaker = speakerFor(msg.richting)
  const isRight = speaker === 'surface'

  // Tijdstring HH:MM uit ISO-timestamp
  const timeStr = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  const isPhoto = msg.type === 'foto' || msg.type === 'image'
  const isVoice = msg.type === 'voice' || msg.type === 'audio'

  return (
    <div className={`${styles.outer} ${isRight ? styles.outerRight : styles.outerLeft}`}>
      <div
        className={`
          ${styles.bubble}
          ${isRight ? styles.bubbleSurface : styles.bubbleKlant}
          ${!continued ? (isRight ? styles.tailRight : styles.tailLeft) : ''}
        `}
      >
        {/* Surface-label (alleen eerste van een reeks) */}
        {isRight && !continued && (
          <div className={styles.surfaceLabel} aria-hidden="true">
            <span className={styles.surfaceIcon}>
              {/* Sparkle-icoon */}
              <svg width="7" height="7" viewBox="0 0 24 24" fill="white">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </span>
            Surface
          </div>
        )}

        {/* Foto */}
        {isPhoto && msg.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.foto_url}
            alt="Foto van klant"
            className={styles.photo}
          />
        ) : isVoice ? (
          /* Voice-bericht placeholder */
          <div className={styles.voice}>
            {/* Afspeel-knop */}
            <span className={`${styles.voicePlay} ${isRight ? styles.voicePlaySurface : ''}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4l14 8-14 8z"/>
              </svg>
            </span>
            {/* Eenvoudige golfvorm-visualisatie */}
            <span className={styles.waveform} aria-hidden="true">
              {Array.from({ length: 22 }).map((_, i) => {
                const h = 4 + Math.abs(Math.sin(i * 1.7 + 1)) * 14
                return (
                  <span
                    key={i}
                    className={styles.waveBar}
                    style={{ height: `${h}px` }}
                  />
                )
              })}
            </span>
          </div>
        ) : (
          /* Tekst-bericht */
          <span className={styles.text}>
            {msg.bericht ?? ''}
          </span>
        )}

        {/* Tijdstempel rechtsonder (float-right patroon) */}
        <span className={styles.meta} aria-label={`Verstuurd om ${timeStr}`}>
          {timeStr}
        </span>
      </div>
    </div>
  )
}

/* ── DaySeparator ─────────────────────────────────────── */

interface DaySeparatorProps {
  label: string
}

/**
 * Gecentreerde dag-pill tussen berichten (bijv. "Vandaag", "Gisteren").
 */
export function DaySeparator({ label }: DaySeparatorProps) {
  return (
    <div className={styles.daySepOuter} role="separator" aria-label={label}>
      <span className={styles.daySepPill}>{label}</span>
    </div>
  )
}

/* ── SystemBanner ─────────────────────────────────────── */

interface SystemBannerProps {
  text: string
}

/**
 * Systeemmelding (bijv. "Lead binnengekomen via WhatsApp").
 * Iets groter dan DaySeparator, multiline toegestaan.
 */
export function SystemBanner({ text }: SystemBannerProps) {
  return (
    <div className={styles.bannerOuter} role="note">
      <span className={styles.bannerPill}>{text}</span>
    </div>
  )
}
