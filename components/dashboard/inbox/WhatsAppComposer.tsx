'use client'

import { Paperclip, Send } from 'lucide-react'
import styles from './WhatsAppComposer.module.css'

/**
 * Composer onderaan de WhatsApp-pane. Default-state: bot doet het werk,
 * dus de input is disabled met een uitleg-placeholder. Als de owner de
 * bot pauzeert (via de "Bot actief — pauzeren"-pill bovenaan) wordt de
 * `botPaused` prop true en mag de owner zelf typen.
 *
 * Versturen-functionaliteit is voorlopig stub — de daadwerkelijke
 * outgoing-WhatsApp call gaat via een bot-API endpoint dat nog gebouwd
 * moet worden. Voor nu logt 'ie alleen + cleared het veld.
 */
export function WhatsAppComposer({ botPaused = false }: { botPaused?: boolean }) {
  const placeholder = botPaused
    ? 'Typ een bericht…'
    : 'Surface antwoordt automatisch. Pauzeer om zelf te reageren.'

  return (
    <form
      className={styles.composer}
      onSubmit={(e) => {
        e.preventDefault()
        if (!botPaused) return
        const input = e.currentTarget.elements.namedItem('msg') as HTMLInputElement | null
        if (!input?.value.trim()) return
        // TODO: koppel aan /api/dashboard/lead/[id]/send-message
        input.value = ''
      }}
    >
      <button
        type="button"
        className={styles.attachBtn}
        disabled={!botPaused}
        aria-label="Bijlage toevoegen"
      >
        <Paperclip size={18} />
      </button>

      <input
        type="text"
        name="msg"
        className={styles.input}
        placeholder={placeholder}
        disabled={!botPaused}
        autoComplete="off"
      />

      <button
        type="submit"
        className={styles.sendBtn}
        disabled={!botPaused}
        aria-label="Versturen"
      >
        <Send size={16} />
      </button>
    </form>
  )
}
