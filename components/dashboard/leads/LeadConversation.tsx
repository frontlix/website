'use client'

import { useEffect, useRef } from 'react'
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
 *
 * Bij mount + bij elke verandering in het aantal berichten scrollen we
 * automatisch naar de onderkant via een sentinel-element. Werkt zowel
 * wanneer .thread zelf de scroll-container is (lead-detail) als wanneer
 * een outer wrapper het is (inbox).
 */
export function LeadConversation({ berichten }: { berichten: Bericht[] }) {
  const bottomRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    // 'auto' (= instant, geen smooth animatie). De polling refresht elke
    // 8s en realtime kan ook door komen — we willen geen merkbare scroll-
    // animatie elke keer dat een bericht binnenkomt, alleen 'm direct in
    // beeld hebben.
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [berichten.length])

  if (berichten.length === 0) {
    return <p className={styles.empty}>Nog geen berichten in dit gesprek.</p>
  }

  type Item =
    | { kind: 'sep'; label: string; id: string }
    | { kind: 'msg'; bericht: Bericht }
  const items: Item[] = []
  let lastDay = ''
  for (const b of berichten) {
    const ts: string = b.timestamp ?? ''
    const d = new Date(ts)
    const dayKey = d.toDateString()
    if (dayKey !== lastDay) {
      items.push({ kind: 'sep', label: dateLabel(d), id: `sep-${dayKey}` })
      lastDay = dayKey
    }
    items.push({ kind: 'msg', bericht: b })
  }

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
      {/* Sentinel waar scrollIntoView naar springt — moet als laatste
          DOM-kind staan zodat 'end' = visuele onderkant van de thread */}
      <li ref={bottomRef} className={styles.bottomSentinel} aria-hidden="true" />
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
        <time dateTime={b.timestamp ?? undefined}>{formatHourMinute(b.timestamp ?? '')}</time>
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
