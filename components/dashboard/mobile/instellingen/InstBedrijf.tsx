'use client'

// Bedrijfsvelden tonen de echte tenant_settings-data, read-only: er is (nog)
// geen save-action voor bedrijfsnaam/chatbot/adres/e-mail/WhatsApp, dus we laten
// geen dode "Opslaan"-knop achter. Het Maanddoel-blok is WEL echt gekoppeld aan
// saveOmzetDoelMaand (laag risico, geen bot/mail) zodat de "Stel je maanddoel
// in"-CTA op het Overzicht een werkende bestemming heeft.

import { useState, useTransition } from 'react'
import { Check, AlertTriangle, Target, MapPin } from 'lucide-react'
import { saveOmzetDoelMaand } from '@/lib/dashboard/omzet-doel-actions'
import { saveWerkgebiedGrenzen } from '@/lib/dashboard/bedrijfsprofiel-actions'
import type { TenantSettings } from '@/components/dashboard/instellingen/setting-types'
import type { GmailConnectionState } from '@/components/dashboard/v2/instellingen/instellingen-data'
import { InstField, InstGroupCard } from './InstAtoms'
import { InstGmailKoppeling } from './InstGmailKoppeling'
import styles from './InstBedrijf.module.css'

/** Bedrijfsgegevens-detailscherm. Plain content, drilldown layer levert header. */
export function InstBedrijf({
  tenant,
  omzetDoel = null,
  gmail,
  live = true,
}: {
  tenant: TenantSettings | null
  omzetDoel?: number | null
  gmail: GmailConnectionState
  live?: boolean
}) {
  return (
    <div className={styles.container}>
      {/* Maanddoel, echt gekoppeld; bovenaan zodat de deeplink-CTA er direct op landt. */}
      <MaanddoelCard initial={omzetDoel} />

      {/* Werkgebied, echt gekoppeld (saveWerkgebiedGrenzen + bot-reload). */}
      <WerkgebiedCard
        initialRadius={tenant?.radius_max_km ?? null}
        initialMinM2={tenant?.radius_min_m2_buiten_straal ?? null}
      />

      {/* Surface card met de echte bedrijfsvelden (read-only). */}
      <InstGroupCard>
        <div className={styles.fields}>
          <InstField label="Bedrijfsnaam" value={tenant?.bedrijfsnaam} />
          <InstField label="Chatbot-naam" value={tenant?.chatbot_naam} />
          <InstField label="Adres" value={tenant?.adres} />
          {/* Postcode/Plaats naast elkaar: vaste 110px kolom + 1fr */}
          <div className={styles.postcodePlaats}>
            <InstField label="Postcode" value={tenant?.postcode} />
            <InstField label="Plaats" value={tenant?.plaats} />
          </div>
          <InstField label="E-mail" value={tenant?.eigenaar_email} />
          <InstField label="WhatsApp" value={tenant?.eigenaar_whatsapp} />
        </div>
      </InstGroupCard>

      {/* Gmail-label koppeling bij het eigenaar-e-mailveld */}
      <InstGmailKoppeling gmail={gmail} live={live} />

      {/* Eerlijke hint i.p.v. een dode opslaan-knop: deze velden zijn (nog) niet
          zelf te bewerken; wijzigingen lopen via Frontlix-support. */}
      <p className={styles.readonlyHint}>
        Bedrijfsgegevens wijzig je via Frontlix-support, neem contact op om deze
        aan te passen.
      </p>
    </div>
  )
}

/**
 * MaanddoelCard, maand-omzetdoel (`tenant_settings.omzet_doel_maand`).
 * Lege input → NULL (= geen doel; Overzicht toont placeholder). Niet-leeg →
 * integer euros. Opslaan gaat via de echte server-action (laag risico, geen
 * bot/mail). Volgt het patroon van de desktop OmzetDoelForm.
 */
function MaanddoelCard({ initial }: { initial: number | null }) {
  const [raw, setRaw] = useState<string>(
    initial === null || initial === undefined ? '' : String(initial),
  )
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'success'; value: number | null }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })
  const [pending, startTransition] = useTransition()

  function submit() {
    setStatus({ kind: 'idle' })
    const trimmed = raw.trim()
    const value = trimmed === '' ? null : Number(trimmed)

    // Client-side guard, de server valideert ook.
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setStatus({ kind: 'error', message: 'Voer een geldig, niet-negatief getal in.' })
      return
    }

    startTransition(async () => {
      const result = await saveOmzetDoelMaand(value)
      if (result.ok) setStatus({ kind: 'success', value: result.value })
      else setStatus({ kind: 'error', message: result.error })
    })
  }

  return (
    <InstGroupCard>
      <div className={styles.goalBox}>
        {/* Kop met icoon zodat het blok als een duidelijke instelling leest */}
        <div className={styles.goalHead}>
          <span className={styles.goalIcon} aria-hidden="true">
            <Target size={16} />
          </span>
          <div>
            <div className={styles.goalTitle}>Maanddoel</div>
            <div className={styles.goalSub}>Voortgangsring op je Overzicht</div>
          </div>
        </div>

        {/* Eén schoon €-veld (prefix binnen het veld, geen losse cel) */}
        <label className={styles.goalRow} htmlFor="inst-maanddoel">
          <span className={styles.goalPrefix} aria-hidden="true">
            €
          </span>
          <input
            id="inst-maanddoel"
            type="number"
            inputMode="numeric"
            step={100}
            min={0}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="bv. 25000"
            className={styles.goalInput}
            disabled={pending}
          />
        </label>
        <p className={styles.goalHelp}>Laat leeg om geen doel te tonen.</p>

        {status.kind === 'success' && (
          <div className={`${styles.goalStatus} ${styles.goalOk}`}>
            <Check size={14} aria-hidden="true" />
            <span>
              {status.value === null
                ? 'Doel gewist, er wordt geen ring meer getoond.'
                : `Opgeslagen: € ${status.value.toLocaleString('nl-NL')} per maand.`}
            </span>
          </div>
        )}
        {status.kind === 'error' && (
          <div className={`${styles.goalStatus} ${styles.goalErr}`}>
            <AlertTriangle size={14} aria-hidden="true" />
            <span>{status.message}</span>
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={styles.goalBtn}
        >
          {pending ? 'Opslaan…' : 'Maanddoel opslaan'}
        </button>
      </div>
    </InstGroupCard>
  )
}

/**
 * WerkgebiedCard, Werkstraal (radius_max_km) + minimale klusgrootte buiten de
 * straal (radius_min_m2_buiten_straal). Editbaar op mobiel, spiegelt de
 * desktop-velden in BedrijfsprofielPanel. Opslaan via de gerichte
 * saveWerkgebiedGrenzen-action (schrijft tenant_settings + laat de bot herladen).
 */
function WerkgebiedCard({
  initialRadius,
  initialMinM2,
}: {
  initialRadius: number | null
  initialMinM2: number | null
}) {
  const [straal, setStraal] = useState<string>(
    initialRadius === null || initialRadius === undefined ? '' : String(initialRadius),
  )
  const [minM2, setMinM2] = useState<string>(
    initialMinM2 === null || initialMinM2 === undefined ? '' : String(initialMinM2),
  )
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'success' } | { kind: 'error'; message: string }
  >({ kind: 'idle' })
  const [pending, startTransition] = useTransition()

  function submit() {
    setStatus({ kind: 'idle' })
    const r = Number(straal.trim())
    const m = Number(minM2.trim())

    // Client-side guard, de server valideert ook.
    if (!Number.isFinite(r) || r <= 0) {
      setStatus({ kind: 'error', message: 'Vul een geldige werkstraal in (km).' })
      return
    }
    if (!Number.isFinite(m) || m < 0) {
      setStatus({ kind: 'error', message: 'Vul een geldige klusgrootte in (m²).' })
      return
    }

    startTransition(async () => {
      const result = await saveWerkgebiedGrenzen({ radius_max_km: r, min_m2_buiten_straal: m })
      if (result.ok) setStatus({ kind: 'success' })
      else setStatus({ kind: 'error', message: result.error })
    })
  }

  return (
    <InstGroupCard>
      <div className={styles.goalBox}>
        <div className={styles.goalHead}>
          <span className={styles.goalIcon} aria-hidden="true">
            <MapPin size={16} />
          </span>
          <div>
            <div className={styles.goalTitle}>Werkgebied</div>
            <div className={styles.goalSub}>Tot waar Surface automatisch klussen aanneemt</div>
          </div>
        </div>

        <div className={styles.wgField}>
          <label className={styles.wgLabel} htmlFor="inst-werkstraal">
            Werkstraal
          </label>
          <div className={styles.goalRow}>
            <input
              id="inst-werkstraal"
              type="number"
              inputMode="numeric"
              min={1}
              value={straal}
              onChange={(e) => setStraal(e.target.value)}
              placeholder="bv. 75"
              className={styles.goalInput}
              disabled={pending}
            />
            <span className={styles.goalPrefix} aria-hidden="true">
              km
            </span>
          </div>
        </div>

        <div className={styles.wgField}>
          <label className={styles.wgLabel} htmlFor="inst-minm2">
            Minimale klusgrootte buiten je straal
          </label>
          <div className={styles.goalRow}>
            <input
              id="inst-minm2"
              type="number"
              inputMode="numeric"
              min={0}
              value={minM2}
              onChange={(e) => setMinM2(e.target.value)}
              placeholder="bv. 200"
              className={styles.goalInput}
              disabled={pending}
            />
            <span className={styles.goalPrefix} aria-hidden="true">
              m²
            </span>
          </div>
          <p className={styles.goalHelp}>
            Kleinere klussen buiten je straal pakt Surface niet op, die gaan naar jou.
          </p>
        </div>

        {status.kind === 'success' && (
          <div className={`${styles.goalStatus} ${styles.goalOk}`}>
            <Check size={14} aria-hidden="true" />
            <span>Werkgebied opgeslagen.</span>
          </div>
        )}
        {status.kind === 'error' && (
          <div className={`${styles.goalStatus} ${styles.goalErr}`}>
            <AlertTriangle size={14} aria-hidden="true" />
            <span>{status.message}</span>
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={styles.goalBtn}
        >
          {pending ? 'Opslaan…' : 'Werkgebied opslaan'}
        </button>
      </div>
    </InstGroupCard>
  )
}
