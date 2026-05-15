'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { ManualOfferteData } from '@/lib/dashboard/manual-offerte-types'
import styles from './ManualOfferteModal.module.css'

type SetFn = <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void

// NL-mobiel-validatie (soft — alleen voor de waarschuwing onder het
// veld). Stappen:
//   1) Spaties/streepjes/punten/haakjes strippen.
//   2) +316 / 00316 normaliseren naar 06.
//   3) Format 06 + 8 cijfers, waarbij het 3e cijfer in {1,2,3,4,5,8}
//      moet zitten — dat zijn de mobile-ranges die ACM aan operators
//      heeft uitgegeven (061-065 en 068). Daarmee valt o.a. 0600000000
//      af (06 0xxxxxxx is geen mobiel).
//   4) De 8 cijfers na 06 mogen niet allemaal hetzelfde zijn
//      (vangt 0611111111, 0622222222 etc.).
// De eigenaar kan een afwijkend nummer (vaste lijn, buitenland) gewoon
// doorgebruiken — dit is enkel een soft warning.
function isValidNLMobile(raw: string): boolean {
  let cleaned = raw.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('+316')) cleaned = '06' + cleaned.slice(4)
  else if (cleaned.startsWith('00316')) cleaned = '06' + cleaned.slice(5)
  if (!/^06[1-58]\d{7}$/.test(cleaned)) return false
  const last8 = cleaned.slice(2)
  if (/^(\d)\1{7}$/.test(last8)) return false
  return true
}

// Praktische email-check — niet RFC-compleet, wel genoeg om typfouten
// als "jan@gmail" of "jan.gmail.com" te vangen.
function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())
}

export function StepKlant({ data, set }: { data: ManualOfferteData; set: SetFn }) {
  // Pas waarschuwingen tonen als de user het veld heeft verlaten —
  // anders flikkert "geen geldig nummer" al bij de eerste toets.
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)

  const phoneFilled = data.telefoon.trim().length > 0
  const emailFilled = data.email.trim().length > 0
  const phoneWarning = phoneTouched && phoneFilled && !isValidNLMobile(data.telefoon)
  const emailWarning = emailTouched && emailFilled && !isValidEmail(data.email)

  return (
    <>
      <div>
        <div className={styles.sectionLabel}>Klantgegevens</div>
        <div className={styles.sectionSub}>
          Telefoon en e-mail zijn verplicht — telefoon om de offerte via WhatsApp te versturen, e-mail voor de PDF.
        </div>
      </div>

      <div className={styles.grid2}>
        <Field label="Naam *">
          <input
            className={styles.input}
            value={data.naam}
            onChange={(e) => set('naam', e.target.value)}
            placeholder="Bv. Jan de Jong"
          />
        </Field>
        <Field label="Bedrijf (optioneel)">
          <input
            className={styles.input}
            value={data.bedrijf}
            onChange={(e) => set('bedrijf', e.target.value)}
            placeholder="Bv. VVE Schoonhof"
          />
        </Field>
        <Field label="Telefoon *">
          <input
            className={styles.input}
            value={data.telefoon}
            onChange={(e) => set('telefoon', e.target.value)}
            onFocus={() => setPhoneTouched(false)}
            onBlur={() => setPhoneTouched(true)}
            placeholder="06 - 12 34 56 78"
            inputMode="tel"
          />
          {phoneWarning && (
            <div className={styles.warning}>Let op, geen geldig nummer</div>
          )}
        </Field>
        <Field label="E-mail *">
          <input
            className={styles.input}
            value={data.email}
            onChange={(e) => set('email', e.target.value)}
            onFocus={() => setEmailTouched(false)}
            onBlur={() => setEmailTouched(true)}
            placeholder="jan@voorbeeld.nl"
            inputMode="email"
          />
          {emailWarning && (
            <div className={styles.warning}>Let op, geen geldig e-mailadres</div>
          )}
        </Field>
      </div>

      {/* Werk-adres — postcode + huisnummer eerst zodat de auto-fill
          (straat, plaats, afstand) zich aankondigt voordat de user
          die velden zelf zou invullen. */}
      <div>
        <div className={styles.kicker}>Werk-adres</div>
        <div className={styles.gridAddr} style={{ marginBottom: 12 }}>
          <Field label="Postcode">
            <input
              className={styles.input}
              value={data.postcode}
              onChange={(e) => set('postcode', e.target.value)}
              placeholder="2611 GH"
            />
          </Field>
          <Field label="Huisnummer">
            <input
              className={styles.input}
              value={data.huisnummer}
              onChange={(e) => set('huisnummer', e.target.value)}
              placeholder="14"
            />
          </Field>
          {/* Afstand wordt automatisch berekend op basis van postcode +
              huisnummer (zie auto-fetch in ManualOfferteModal). Read-only
              zodat de user 'm wel kan zien maar niet handmatig overrijdt. */}
          <Field label="Afstand (km)">
            <input
              className={`${styles.input} ${styles.numericInput} ${styles.inputReadonly}`}
              type="number"
              value={data.afstand_km}
              readOnly
              tabIndex={-1}
              aria-label="Automatisch berekende afstand in km"
            />
          </Field>
        </div>
        <div className={styles.grid21}>
          <Field label="Straat">
            <input
              className={styles.input}
              value={data.straat}
              onChange={(e) => set('straat', e.target.value)}
              placeholder="Bv. Beeklaan"
            />
          </Field>
          <Field label="Plaats">
            <input
              className={styles.input}
              value={data.plaats}
              onChange={(e) => set('plaats', e.target.value)}
              placeholder="Delft"
            />
          </Field>
        </div>
      </div>

      {/* Factuur-adres */}
      <div>
        <div className={styles.kicker}>Factuur-adres</div>
        <button
          type="button"
          onClick={() => set('factuur_zelfde', !data.factuur_zelfde)}
          className={`${styles.checkCard} ${data.factuur_zelfde ? styles.checkCardActive : ''}`}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className={`${styles.checkBox} ${data.factuur_zelfde ? styles.checkBoxActive : ''}`}>
              {data.factuur_zelfde && <Check size={12} strokeWidth={3} />}
            </div>
            <div>
              <div className={`${styles.optLabel} ${data.factuur_zelfde ? styles.optLabelActive : ''}`}>
                Factuur-adres is gelijk aan werk-adres
              </div>
              <div className={styles.optSub}>
                {data.factuur_zelfde
                  ? 'Geen apart factuur-adres nodig'
                  : 'Vink uit om een afwijkend factuur-adres in te vullen'}
              </div>
            </div>
          </div>
        </button>

        {!data.factuur_zelfde && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              display: 'grid',
              gap: 12,
            }}
          >
            <div className={styles.grid21}>
              <Field label="Straat">
                <input
                  className={styles.input}
                  value={data.factuur_straat}
                  onChange={(e) => set('factuur_straat', e.target.value)}
                  placeholder="Bv. Postbusstraat"
                />
              </Field>
              <Field label="Huisnummer">
                <input
                  className={styles.input}
                  value={data.factuur_huisnummer}
                  onChange={(e) => set('factuur_huisnummer', e.target.value)}
                  placeholder="42"
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <Field label="Postcode">
                <input
                  className={styles.input}
                  value={data.factuur_postcode}
                  onChange={(e) => set('factuur_postcode', e.target.value)}
                  placeholder="2611 GH"
                />
              </Field>
              <Field label="Plaats">
                <input
                  className={styles.input}
                  value={data.factuur_plaats}
                  onChange={(e) => set('factuur_plaats', e.target.value)}
                  placeholder="Delft"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}
