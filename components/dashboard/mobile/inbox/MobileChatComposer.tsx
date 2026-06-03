'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import styles from './MobileChatComposer.module.css'

interface MobileChatComposerProps {
  leadId: string
  /** true = bot is gepauzeerd, owner mag zelf typen */
  botPaused: boolean
}

/**
 * WhatsApp-stijl message-composer onderaan MobileChatDetail.
 * POST naar /api/dashboard/lead/[id]/send-message, zelfde route als
 * WhatsAppComposer (desktop). Guard: alleen versturen als botPaused.
 *
 * Visueel: input-pill (emoji + veld + bijlage) + ronde send/mic-knop
 * in WA-header-groen (--wa-header).
 */
export function MobileChatComposer({ leadId, botPaused }: MobileChatComposerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const hasText = draft.trim().length > 0

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!botPaused || !hasText) return
    const bericht = draft.trim()
    setError(null)

    startTransition(async () => {
      try {
        const res = await fetch(`/api/dashboard/lead/${leadId}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bericht }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.ok === false) {
          setError(typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`)
          return
        }
        setDraft('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Netwerkfout.')
      }
    })
  }

  return (
    <div className={styles.root}>
      {/* Hint wanneer Surface actief is */}
      {!botPaused && (
        <div className={styles.hint} role="status">
          Pauzeer Surface om zelf te reageren
        </div>
      )}

      {/* Foutmelding */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <form className={styles.row} onSubmit={handleSubmit}>
        {/* Input-pill */}
        <div className={styles.pill}>
          {/* Emoji-knop (decoratief, geen functie in v1) */}
          <button
            type="button"
            className={styles.sideBtn}
            aria-label="Emoji"
            tabIndex={-1}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#54656F" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>

          <input
            type="text"
            className={styles.input}
            placeholder={botPaused ? 'Bericht' : 'Surface beantwoordt…'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!botPaused || pending}
            autoComplete="off"
            aria-label="Bericht typen"
          />

          {/* Bijlage-knop (decoratief v1) */}
          <button
            type="button"
            className={styles.sideBtn}
            aria-label="Bijlage"
            tabIndex={-1}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#54656F" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          {/* Camera (alleen zichtbaar als input leeg) */}
          {!hasText && (
            <button
              type="button"
              className={styles.sideBtn}
              aria-label="Camera"
              tabIndex={-1}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#54656F" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          )}
        </div>

        {/* Send / Mic-knop */}
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={!botPaused || pending}
          aria-label={hasText ? 'Verstuur bericht' : 'Voice memo opnemen'}
        >
          {hasText ? (
            /* Paper-plane send */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M2.5 21l19-9-19-9 0 7 14 2-14 2z"/>
            </svg>
          ) : (
            /* Microfoon */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3"/>
              <path d="M5 11a7 7 0 0014 0"/>
              <path d="M12 18v3"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}
