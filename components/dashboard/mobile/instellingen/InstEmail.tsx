'use client'

// E-mailkoppeling op mobiel: koppel je eigen verzendadres (SMTP) zodat offertes
// en klant-mail vanuit jouw adres vertrekken. Gebruikt dezelfde backend als de
// desktop/V2-versie: POST /api/integrations/email/connect en /disconnect, en de
// status uit getEmailConnectionStatus (server-side opgehaald, zonder wachtwoord).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertTriangle } from 'lucide-react'
import type { EmailConnectionStatus } from '@/lib/dashboard/email-connection-queries'
import { InstGroupCard, InstPrimaryBtn, InstGhostBtn } from './InstAtoms'
import styles from './InstEmail.module.css'

type ProviderKey = 'hostinger' | 'transip' | 'one' | 'google' | 'custom'

const PROVIDERS: {
  key: ProviderKey
  label: string
  host: string
  port: number
  security: 'ssl' | 'starttls'
  caveat?: string
}[] = [
  { key: 'hostinger', label: 'Hostinger', host: 'smtp.hostinger.com', port: 465, security: 'ssl' },
  { key: 'transip', label: 'TransIP', host: 'smtp.transip.email', port: 465, security: 'ssl' },
  { key: 'one', label: 'one.com', host: 'send.one.com', port: 465, security: 'ssl' },
  {
    key: 'google',
    label: 'Google (Gmail / Workspace)',
    host: 'smtp.gmail.com',
    port: 465,
    security: 'ssl',
    caveat:
      'Zet 2FA aan en maak een app-wachtwoord aan, een gewoon wachtwoord werkt niet. De afzender moet het Gmail/Workspace-adres zelf zijn.',
  },
  { key: 'custom', label: 'Anders (handmatig)', host: '', port: 465, security: 'ssl' },
]

export function InstEmail({ status, live = true }: { status: EmailConnectionStatus; live?: boolean }) {
  const router = useRouter()
  const connected = status.connected
  const needsReconnect = connected && Boolean(status.needsReconnect)

  const [provider, setProvider] = useState<ProviderKey>('hostinger')
  const [host, setHost] = useState('smtp.hostinger.com')
  const [port, setPort] = useState('465')
  const [security, setSecurity] = useState<'ssl' | 'starttls'>('ssl')
  const [email, setEmail] = useState(status.email ?? '')
  const [wachtwoord, setWachtwoord] = useState('')
  const [afzender, setAfzender] = useState(status.senderName ?? '')
  const [replyTo, setReplyTo] = useState(status.replyTo ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preset = PROVIDERS.find((p) => p.key === provider)

  function kiesProvider(key: ProviderKey) {
    setProvider(key)
    setError(null)
    const p = PROVIDERS.find((x) => x.key === key)
    if (!p) return
    if (p.host) setHost(p.host)
    setPort(String(p.port))
    setSecurity(p.security)
  }

  async function connect() {
    if (!live || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/integrations/email/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          smtp_host: host.trim(),
          smtp_port: Number(port),
          security,
          email: email.trim(),
          password: wachtwoord,
          sender_name: afzender.trim(),
          reply_to: replyTo.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Koppelen mislukt. Probeer het opnieuw.')
        return
      }
      setWachtwoord('')
      router.refresh()
    } catch {
      setError('Koppelen mislukt. Controleer je verbinding en probeer opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (!live || busy) return
    setBusy(true)
    setError(null)
    try {
      await fetch('/api/integrations/email/disconnect', { method: 'POST' })
      router.refresh()
    } catch {
      setError('Ontkoppelen mislukt. Probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  const toonVolledig = !connected || needsReconnect

  return (
    <div className={styles.container}>
      <InstGroupCard>
        <div className={styles.statusRij}>
          <span className={styles.statusLabel}>Status</span>
          {connected && !needsReconnect ? (
            <span className={`${styles.pill} ${styles.pillOk}`}>Gekoppeld</span>
          ) : needsReconnect ? (
            <span className={`${styles.pill} ${styles.pillErr}`}>Werkt niet meer</span>
          ) : (
            <span className={`${styles.pill} ${styles.pillNeutraal}`}>Niet gekoppeld</span>
          )}
        </div>
        {connected && !needsReconnect && (
          <div className={styles.gekoppeldAls}>
            Gekoppeld als <strong>{status.email ?? 'onbekend adres'}</strong>
          </div>
        )}
        <p className={styles.intro}>
          Koppel je eigen verzendadres zodat offertes en klant-mail vanuit jouw adres
          vertrekken, niet vanuit Frontlix.
        </p>
      </InstGroupCard>

      {needsReconnect && (
        <div className={`${styles.banner} ${styles.bannerErr}`}>
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            Je e-mailkoppeling werkt niet meer (wachtwoord gewijzigd of verlopen). Klant-mail
            gaat nu tijdelijk weer vanaf Frontlix. Koppel opnieuw om vanaf je eigen adres te
            versturen.
          </span>
        </div>
      )}

      <InstGroupCard>
        <div className={styles.velden}>
          {toonVolledig && (
            <>
              <Veld label="Provider">
                <select
                  className={styles.input}
                  value={provider}
                  onChange={(e) => kiesProvider(e.target.value as ProviderKey)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Veld>
              <div className={styles.tweeKolom}>
                <Veld label="SMTP-server">
                  <input
                    className={styles.input}
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="smtp.jouwhoster.nl"
                  />
                </Veld>
                <Veld label="Poort">
                  <input
                    className={styles.input}
                    value={port}
                    inputMode="numeric"
                    onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </Veld>
              </div>
              <Veld label="Beveiliging">
                <select
                  className={styles.input}
                  value={security}
                  onChange={(e) => setSecurity(e.target.value as 'ssl' | 'starttls')}
                >
                  <option value="ssl">SSL (poort 465)</option>
                  <option value="starttls">STARTTLS (poort 587)</option>
                </select>
              </Veld>
              <Veld label="E-mailadres" hint="Gebruik exact het adres waarmee je inlogt bij je hoster, geen alias.">
                <input
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="offertes@jouwbedrijf.nl"
                  type="email"
                />
              </Veld>
            </>
          )}

          <Veld label="Afzendernaam">
            <input
              className={styles.input}
              value={afzender}
              onChange={(e) => setAfzender(e.target.value)}
              placeholder="Jouw bedrijfsnaam"
            />
          </Veld>
          <Veld label="Reply-to (optioneel)">
            <input
              className={styles.input}
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="info@jouwbedrijf.nl"
            />
          </Veld>
          <Veld
            label="Wachtwoord"
            hint={connected ? 'Laat leeg om het huidige wachtwoord te houden.' : undefined}
          >
            <input
              className={styles.input}
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              type="password"
              placeholder={connected ? 'laat leeg = huidige houden' : 'wachtwoord van je mailbox'}
            />
          </Veld>

          {preset?.caveat && <p className={styles.caveat}>{preset.caveat}</p>}
          {status.testPassedAt && connected && !needsReconnect && (
            <div className={`${styles.banner} ${styles.bannerOk}`}>
              <Check size={13} aria-hidden="true" /> <span>Laatst getest op {formatTest(status.testPassedAt)}.</span>
            </div>
          )}
          {error && (
            <div className={`${styles.banner} ${styles.bannerErr}`}>
              <AlertTriangle size={13} aria-hidden="true" /> <span>{error}</span>
            </div>
          )}
        </div>
      </InstGroupCard>

      <InstPrimaryBtn onClick={connect} disabled={busy || !live}>
        {busy ? 'Bezig…' : 'Testen en koppelen'}
      </InstPrimaryBtn>
      {connected && (
        <InstGhostBtn onClick={disconnect} disabled={busy || !live}>
          Ontkoppelen
        </InstGhostBtn>
      )}
    </div>
  )
}

function Veld({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className={styles.veld}>
      <span className={styles.veldLabel}>{label}</span>
      {children}
      {hint && <span className={styles.veldHint}>{hint}</span>}
    </label>
  )
}

function formatTest(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}
