import Image from 'next/image'
import { Check, CheckCheck } from 'lucide-react'
import type { Bericht } from '@/lib/dashboard/database.types'
import styles from './LeadConversation.module.css'

/**
 * WhatsApp-stijl thread:
 *  - klant-berichten (richting='inkomend') links, wit
 *  - bot/owner-berichten (uitgaand) rechts, lichtgroen
 *  - datum-separators ("Vandaag", "Gisteren", weekday, of dd mmm) tussen blokken
 *  - tijd in HH:MM rechtsonder, met ✓✓ voor uitgaand
 */
export function LeadConversation({ berichten }: { berichten: Bericht[] }) {
  if (berichten.length === 0) {
    return <p className={styles.empty}>Nog geen berichten in dit gesprek.</p>
  }

  type Item =
    | { kind: 'sep'; label: string; id: string }
    | { kind: 'msg'; bericht: Bericht }
  const items: Item[] = []
  let lastDay = ''
  for (const b of berichten) {
    const d = new Date(b.timestamp)
    const dayKey = d.toDateString()
    if (dayKey !== lastDay) {
      items.push({ kind: 'sep', label: dateLabel(d), id: `sep-${dayKey}` })
      lastDay = dayKey
    }
    items.push({ kind: 'msg', bericht: b })
  }
  // Reversed voor `flex-direction: column-reverse` op .thread —
  // standaard chat-pattern (Slack/Discord/Telegram-web): bubbles plakken
  // automatisch aan de onderkant + browser herstelt scroll-positie altijd
  // op bottom zodat de laatste berichten direct in beeld staan.
  items.reverse()

  return (
    <ol className={styles.thread}>
      {items.map((it) =>
        it.kind === 'sep' ? (
          <li key={it.id} className={styles.daySep}>
            <span>{it.label}</span>
          </li>
        ) : (
          <BubbleRow key={it.bericht.id} b={it.bericht} />
        ),
      )}
    </ol>
  )
}

function BubbleRow({ b }: { b: Bericht }) {
  // Alles wat niet expliciet "inkomend" is = uitgaand (bot of owner).
  const uit = b.richting !== 'inkomend'
  return (
    <li className={`${styles.bubble} ${uit ? styles.uit : styles.in}`}>
      <div className={styles.body}>
        {b.bericht && <p className={styles.text}>{b.bericht}</p>}
        {b.foto_url && (
          <div className={styles.image}>
            <Image
              src={b.foto_url}
              alt="Bijgevoegde foto"
              width={240}
              height={180}
              unoptimized
            />
          </div>
        )}
        {b.type !== 'tekst' && !b.bericht && !b.foto_url && (
          <p className={styles.placeholderType}>[{b.type}]</p>
        )}
      </div>
      <span className={styles.meta}>
        <time dateTime={b.timestamp}>{formatHourMinute(b.timestamp)}</time>
        {uit && (
          <span className={styles.checks} aria-label="Bezorgd">
            <CheckCheck size={12} />
          </span>
        )}
        {!uit && b.wa_message_id && (
          <span className={styles.checksSingle} aria-label="Verstuurd">
            <Check size={12} />
          </span>
        )}
      </span>
    </li>
  )
}

function formatHourMinute(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dateLabel(d: Date): string {
  const now = new Date()
  const today = stripTime(now)
  const that = stripTime(d)
  const diff = (today.getTime() - that.getTime()) / (1000 * 60 * 60 * 24)
  if (diff === 0) return 'Vandaag'
  if (diff === 1) return 'Gisteren'
  if (diff < 7) {
    return d.toLocaleDateString('nl-NL', { weekday: 'long', timeZone: 'Europe/Amsterdam' })
  }
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: today.getFullYear() === d.getFullYear() ? undefined : 'numeric',
  })
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
