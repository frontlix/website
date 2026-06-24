'use client'

// Gmail-label-koppeling op mobiel: koppel je Gmail-account via Google OAuth
// zodat "Offerte ter goedkeuring"-mails automatisch een label krijgen.
// Logica is identiek aan de desktop GmailLabelKoppeling; stijl volgt de
// mobiele atoms (InstGroupCard, InstPrimaryBtn, InstGhostBtn, module-CSS).

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, AlertTriangle, ChevronDown, ChevronUp, Mail } from 'lucide-react'
import type { GmailConnectionState } from '@/components/dashboard/v2/instellingen/instellingen-data'
import { InstGroupCard, InstPrimaryBtn, InstGhostBtn } from './InstAtoms'
import styles from './InstGmailKoppeling.module.css'

interface Props {
  gmail: GmailConnectionState
  live: boolean
}

const DEFAULT_LABEL = 'Offertes ter goedkeuring'

export function InstGmailKoppeling({ gmail, live }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [labelName, setLabelName] = useState(gmail.labelName ?? DEFAULT_LABEL)
  const [busy, setBusy] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [ontkoppelFout, setOntkoppelFout] = useState(false)

  const result = searchParams.get('gmail') // ok | error | state_error | forbidden | null

  function koppel() {
    const naam = labelName.trim() || DEFAULT_LABEL
    window.location.href = `/api/integrations/gmail/authorize?label=${encodeURIComponent(naam)}`
  }

  async function ontkoppel() {
    setBusy(true)
    setOntkoppelFout(false)
    const res = await fetch('/api/integrations/gmail/disconnect', { method: 'POST' })
    setBusy(false)
    if (!res.ok) {
      setOntkoppelFout(true)
      return
    }
    router.refresh()
  }

  if (!live) return null

  return (
    <div className={styles.wrapper}>
      {/* Sectiekop met mail-icoon */}
      <div className={styles.kop}>
        <span className={styles.kopIcon} aria-hidden="true">
          <Mail size={15} />
        </span>
        <div>
          <div className={styles.kopTitel}>Gmail-label koppelen</div>
          <div className={styles.kopSub}>
            Goedkeuringsmails krijgen automatisch een label in je inbox
          </div>
        </div>
      </div>

      {/* OAuth-terugmelding */}
      {result === 'ok' && (
        <div className={`${styles.banner} ${styles.bannerOk}`}>
          <Check size={13} aria-hidden="true" />
          <span>Gmail gekoppeld. Nieuwe goedkeuringsmails krijgen automatisch het label.</span>
        </div>
      )}
      {result && result !== 'ok' && (
        <div className={`${styles.banner} ${styles.bannerErr}`}>
          <AlertTriangle size={13} aria-hidden="true" />
          <span>Koppelen is niet gelukt. Probeer het opnieuw.</span>
        </div>
      )}

      {gmail.connected ? (
        /* ── Gekoppeld: account + label tonen, ontkoppelknop ── */
        <InstGroupCard>
          <div className={styles.velden}>
            <div className={styles.statusRij}>
              <span className={styles.statusLabel}>Status</span>
              <span className={`${styles.pill} ${styles.pillOk}`}>Gekoppeld</span>
            </div>
            <div className={styles.accountRij}>
              <span className={styles.accountKey}>Account</span>
              <span className={styles.accountVal}>
                {gmail.googleEmail ?? 'onbekend account'}
              </span>
            </div>
            <div className={styles.accountRij}>
              <span className={styles.accountKey}>Label</span>
              <span className={styles.accountVal}>
                {gmail.labelName ?? DEFAULT_LABEL}
              </span>
            </div>
          </div>
        </InstGroupCard>
      ) : (
        /* ── Niet gekoppeld: labelnaam-veld ── */
        <InstGroupCard>
          <div className={styles.velden}>
            <div className={styles.statusRij}>
              <span className={styles.statusLabel}>Status</span>
              <span className={`${styles.pill} ${styles.pillNeutraal}`}>Niet gekoppeld</span>
            </div>
            <label className={styles.veld}>
              <span className={styles.veldLabel}>Naam van het label</span>
              <input
                className={styles.input}
                type="text"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                maxLength={100}
              />
              <span className={styles.veldHint}>
                Dit label wordt aangemaakt in jouw Gmail en op elke goedkeuringsmail gezet.
              </span>
            </label>
          </div>
        </InstGroupCard>
      )}

      {ontkoppelFout && (
        <div className={`${styles.banner} ${styles.bannerErr}`}>
          <AlertTriangle size={13} aria-hidden="true" />
          <span>Ontkoppelen is niet gelukt. Probeer het opnieuw.</span>
        </div>
      )}

      {gmail.connected ? (
        <InstGhostBtn onClick={ontkoppel} disabled={busy}>
          {busy ? 'Bezig...' : 'Ontkoppelen'}
        </InstGhostBtn>
      ) : (
        <InstPrimaryBtn onClick={koppel}>
          Maak automatisch een mapje in mijn mail
        </InstPrimaryBtn>
      )}

      {/* Geen Gmail? Uitklap-hulp */}
      <button
        type="button"
        className={styles.helpToggle}
        onClick={() => setShowHelp((v) => !v)}
      >
        {showHelp ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        Geen Gmail? Zo stel je het zelf in
      </button>

      {showHelp && (
        <InstGroupCard>
          <div className={styles.helpContent}>
            <p className={styles.helpTekst}>
              Maak in je mailprogramma een filter of regel aan met deze voorwaarde:
            </p>
            <ul className={styles.helpLijst}>
              <li>
                Onderwerp bevat:{' '}
                <code className={styles.code}>Offerte ter goedkeuring</code>
              </li>
            </ul>
            <p className={styles.helpMuted}>
              Laat de mail in je inbox staan en koppel er een label of map aan, bijvoorbeeld{' '}
              <strong>{DEFAULT_LABEL}</strong>.
            </p>
          </div>
        </InstGroupCard>
      )}
    </div>
  )
}
