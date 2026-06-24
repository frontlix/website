'use client'

// Gmail-label-koppeling op mobiel: koppel je Gmail-account via Google OAuth
// zodat je zelf een filter kunt instellen voor "Offerte ter goedkeuring"-mails.
// Logica is identiek aan de desktop GmailLabelKoppeling; stijl volgt de
// mobiele atoms (InstGroupCard, InstPrimaryBtn, InstGhostBtn, module-CSS).

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, AlertTriangle, ExternalLink, Mail } from 'lucide-react'
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

  const effectiveLabelName = gmail.labelName ?? DEFAULT_LABEL

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
            Maak een label in je Gmail voor offertes ter goedkeuring
          </div>
        </div>
      </div>

      {/* OAuth-terugmelding */}
      {result === 'ok' && (
        <div className={`${styles.banner} ${styles.bannerOk}`}>
          <Check size={13} aria-hidden="true" />
          <span>Label aangemaakt in je Gmail. Stel hieronder zelf het filter in.</span>
        </div>
      )}
      {result && result !== 'ok' && (
        <div className={`${styles.banner} ${styles.bannerErr}`}>
          <AlertTriangle size={13} aria-hidden="true" />
          <span>Koppelen is niet gelukt. Probeer het opnieuw.</span>
        </div>
      )}

      {gmail.connected ? (
        /* ── Gekoppeld: account + label tonen, filter-instructie, ontkoppelknop ── */
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
                {effectiveLabelName}
              </span>
            </div>
          </div>

          {/* Filter-instructie */}
          <div className={styles.helpContent} style={{ marginTop: 12 }}>
            <p className={styles.helpTekst} style={{ fontWeight: 700 }}>
              Label &lsquo;{effectiveLabelName}&rsquo; staat klaar in je Gmail.
            </p>
            <p className={styles.helpTekst} style={{ marginTop: 6 }}>
              Nog één keer instellen, dan komen je goedkeuringsmails er automatisch in: open Gmail,
              zoek op de mails met onderwerp &ldquo;Offerte ter goedkeuring&rdquo;, klik op
              &ldquo;Filter maken&rdquo; en kies het label &ldquo;{effectiveLabelName}&rdquo;.
            </p>
            <a
              href="https://mail.google.com/mail/u/0/#search/subject%3A%22Offerte+ter+goedkeuring%22"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.helpLink}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}
            >
              Open de zoekopdracht in Gmail
              <ExternalLink size={13} strokeWidth={2.5} aria-hidden="true" />
            </a>
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
                Dit label wordt aangemaakt in jouw Gmail. Je stelt daarna zelf in welke mails het krijgen.
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
          Maak dit label aan in mijn Gmail
        </InstPrimaryBtn>
      )}
    </div>
  )
}
