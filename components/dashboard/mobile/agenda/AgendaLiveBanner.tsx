'use client'

import { Check, Camera, MessageCircle, Zap } from 'lucide-react'
import { durStr } from './agenda-mobile-helpers'
import type { AgendaEvent } from './agenda-mock'
import styles from './AgendaLiveBanner.module.css'

/**
 * Gesimuleerde "nu"-tijd uit de handoff (C1 loopt 09:00–12:00, nu 10:42).
 * MOCK v1 — in de functionele pass vervangen door echte klok / time-tracking.
 */
const SIM_NOW = '10:42'

interface AgendaLiveBannerProps {
  /** Het actieve (NOW) event. */
  ev: AgendaEvent
  onOpen?: () => void
  onAfronden?: () => void
  onFoto?: () => void
  onWhatsApp?: () => void
}

/**
 * AgendaLiveBanner — groene "Bezig"-banner voor het lopende event.
 *
 * Port van ABMain `TodayLiveBanner`.
 * Groene gradient + rand via color-mix(--color-success); pulserende dot;
 * "BEZIG · NU {tijd}" + resterende tijd; naam · adres; dienst · m² · €prijs;
 * mini actie-knoppen (Afronden / Foto / WA).
 */
export function AgendaLiveBanner({ ev, onOpen, onAfronden, onFoto, onWhatsApp }: AgendaLiveBannerProps) {
  const remaining = durStr(SIM_NOW, ev.end)

  // Meta-regel: dienst · m² · €prijs (alleen aanwezige velden)
  const metaParts: string[] = []
  if (ev.dienst) metaParts.push(ev.dienst)
  if (ev.m2 != null) metaParts.push(`${ev.m2}m²`)
  if (ev.prijs != null) metaParts.push(`€${ev.prijs}`)

  return (
    <div
      className={styles.banner}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.()
        }
      }}
    >
      <div className={styles.body}>
        {/* Status-regel: pulserende dot + label + resterend */}
        <div className={styles.statusRow}>
          <span className={styles.pulseDot} aria-hidden="true" />
          <span className={styles.statusLabel}>Bezig · nu {SIM_NOW}</span>
          <span className={styles.remaining}>nog {remaining}</span>
        </div>

        {/* Naam · adres */}
        <div className={styles.title}>
          {ev.naam} · {ev.adres}
        </div>

        {/* Dienst · m² · €prijs */}
        {metaParts.length > 0 && (
          <div className={styles.meta}>
            <Zap size={11} aria-hidden="true" /> {metaParts.join(' · ')}
          </div>
        )}

        {/* Mini-acties — stop propagation zodat de banner-tap (onOpen) niet vuurt */}
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.miniBtn}
            data-primary="true"
            // TODO: functional pass — complete-job server action
            onClick={onAfronden}
          >
            <Check size={12} aria-hidden="true" /> Afronden
          </button>
          <button
            type="button"
            className={styles.miniBtn}
            // TODO: functional pass — photo upload
            onClick={onFoto}
          >
            <Camera size={12} aria-hidden="true" /> Foto
          </button>
          <button
            type="button"
            className={styles.miniBtn}
            // TODO: functional pass — WhatsApp-actie
            onClick={onWhatsApp}
          >
            <MessageCircle size={12} aria-hidden="true" /> WA
          </button>
        </div>
      </div>
    </div>
  )
}
