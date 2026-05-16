'use client'

import { useState, useTransition } from 'react'
import { Sparkles, X, Wand2 } from 'lucide-react'
import {
  extractFieldsFromMessage,
  type ExtractedFields,
} from '@/lib/dashboard/manual-offerte-ai'
import styles from './ManualOfferteModal.module.css'

type Props = {
  onExtracted: (fields: ExtractedFields) => void
}

/**
 * "Plak WhatsApp- of mailbericht"-paneel. In rust-toestand een compacte
 * card met AI-icoon; klik klapt de textarea uit. "Velden invullen"
 * stuurt de tekst naar de OpenAI extract-action en geeft het resultaat
 * door aan de parent (StepKlant), die zelf bepaalt welke wizard-velden
 * worden overschreven.
 */
export function AiPasteInput({ onExtracted }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const result = await extractFieldsFromMessage(text)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onExtracted(result.fields)
      // Sluit de paste-area + leeg de textarea zodat hij niet blijft
      // hangen voor een tweede klant. User ziet de gevulde velden in
      // het formulier eronder als feedback dat het werkte.
      setText('')
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        className={styles.aiCardClosed}
        onClick={() => setOpen(true)}
      >
        <span className={styles.aiCardIcon}>
          <Sparkles size={14} />
        </span>
        <div className={styles.aiCardClosedText}>
          <span className={styles.aiCardClosedTitle}>
            Plak WhatsApp- of mailbericht
          </span>
          <span className={styles.aiCardClosedSub}>
            Surface vult naam, adres, m² en wensen automatisch in
          </span>
        </div>
        <span className={styles.aiBadge}>BETA</span>
      </button>
    )
  }

  return (
    <div className={styles.aiCardOpen}>
      <div className={styles.aiCardHeader}>
        <span className={styles.aiCardIcon}>
          <Sparkles size={14} />
        </span>
        <span className={styles.aiCardOpenTitle}>Plak hier het bericht van de klant</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          className={styles.aiCardClose}
          aria-label="Sluiten"
        >
          <X size={14} />
        </button>
      </div>
      <textarea
        className={styles.aiTextarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Hoi! Mijn naam is Jan de Jong, m'n nummer is 06-12345678.\nWe hebben een oprit van zo'n 120m² en daarnaast een achtertuin-terras van 35m². Beide moet ingeveegd worden. Adres: Lindenlaan 14, 2611 GH Delft.\nEr groeit groene aanslag tussen de tegels. We willen graag antraciet voegzand. Mag het ook een beschermlaag erbij?`}
        rows={6}
      />
      {error && <div className={styles.aiError}>{error}</div>}
      <div className={styles.aiCardFooter}>
        <span className={styles.aiCardHint}>
          {text.trim().length}/4000 tekens
        </span>
        <button
          type="button"
          className={styles.aiFillBtn}
          disabled={pending || text.trim().length < 10}
          onClick={handleSubmit}
        >
          <Wand2 size={13} />
          {pending ? 'Bezig…' : 'Velden invullen'}
        </button>
      </div>
    </div>
  )
}
