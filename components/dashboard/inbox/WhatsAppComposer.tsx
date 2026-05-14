'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, AlertCircle } from 'lucide-react'
import styles from './WhatsAppComposer.module.css'

/**
 * Composer onderaan de WhatsApp-pane. Wanneer de owner `bot_gepauzeerd=true`
 * zet (via de Bot pauzeren-knop) wordt `botPaused` true en mag de owner zelf
 * typen. POST naar /api/dashboard/lead/[id]/send-message → Surface verstuurt
 * via Meta WhatsApp Business API.
 *
 * Meta WhatsApp heeft een 24u-window-regel: vrije tekst kan alleen binnen 24u
 * na de laatste klant-boodschap. Server-side wordt dit gecheckt en bij gesloten
 * venster komt er een duidelijke foutmelding terug die we hier prominent tonen.
 */
export function WhatsAppComposer({
  leadId,
  botPaused = false,
}: {
  leadId?: string
  botPaused?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const placeholder = botPaused
    ? 'Typ een bericht…'
    : 'Surface antwoordt automatisch. Pauzeer om zelf te reageren.'

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!botPaused || !leadId) return
    const bericht = draft.trim()
    if (!bericht) return
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
    <>
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 14px',
            margin: 0,
            background: 'rgba(255, 60, 60, 0.08)',
            borderTop: '1px solid rgba(255, 60, 60, 0.2)',
            color: '#c33',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}
      <form className={styles.composer} onSubmit={onSubmit}>
        <input
          type="text"
          name="msg"
          className={styles.input}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!botPaused || pending}
          autoComplete="off"
        />

        <button
          type="submit"
          className={styles.sendBtn}
          disabled={!botPaused || pending || !draft.trim()}
          aria-label="Versturen"
        >
          <Send size={16} />
        </button>
      </form>
    </>
  )
}
