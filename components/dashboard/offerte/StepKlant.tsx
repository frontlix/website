'use client'

import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import type { ManualOfferteData } from '@/lib/dashboard/manual-offerte-types'
import { ExistingClientSearch } from './ExistingClientSearch'
import type { ExistingClientMatch } from '@/lib/dashboard/manual-offerte-search'
import { AiPasteInput } from './AiPasteInput'
import type { ExtractedFields } from '@/lib/dashboard/manual-offerte-ai'
import { applyAiExtracted, applyExistingClient } from '@/lib/dashboard/manual-offerte-handlers'
import styles from './ManualOfferteModal.module.css'

type SetFn = <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void

// Genereert uit een ruwe input "06.../+316.../00316..." een schone
// 06-string van precies 10 cijfers — handig voor zowel validatie als
// normalisatie naar +316.
function toNLNationalMobile(raw: string): string | null {
  let cleaned = raw.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('+316')) cleaned = '06' + cleaned.slice(4)
  else if (cleaned.startsWith('00316')) cleaned = '06' + cleaned.slice(5)
  return /^06\d{8}$/.test(cleaned) ? cleaned : null
}

// NL-mobiel-validatie (soft — alleen voor de waarschuwing onder het
// veld). Naast format + lengte:
//   - 3e cijfer moet in {1,2,3,4,5,8} zitten — de mobile-ranges die ACM
//     aan operators heeft uitgegeven (061-065 en 068). Daarmee valt
//     o.a. 0600000000 af (06 0xxxxxxx is geen mobiel).
//   - De 8 cijfers na 06 mogen niet allemaal hetzelfde zijn
//     (vangt 0611111111, 0622222222 etc.).
// De eigenaar kan een afwijkend nummer (vaste lijn, buitenland) gewoon
// doorgebruiken — dit is enkel een soft warning.
function isValidNLMobile(raw: string): boolean {
  const national = toNLNationalMobile(raw)
  if (!national) return false
  if (!/^06[1-58]\d{7}$/.test(national)) return false
  const last8 = national.slice(2)
  if (/^(\d)\1{7}$/.test(last8)) return false
  return true
}

// Op blur normaliseren we naar internationaal formaat: 06xxxxxxxx ->
// +316xxxxxxxx. Niet-NL-mobielen (vaste lijn, buitenland) laten we
// staan zoals de user ze typte.
function normalizeToInternational(raw: string): string {
  const national = toNLNationalMobile(raw)
  return national ? '+316' + national.slice(2) : raw
}

// Praktische email-check — niet RFC-compleet, wel een stuk strenger dan
// "@ + punt". Vangt o.a. ongeldige domeinen ("@glL", "@gmail"), te-korte
// TLD's, dubbele punten, leading/trailing dots, en respect voor de
// max-lengtes uit RFC 5321 (64 lokaal, 254 totaal).
export function isValidEmail(raw: string): boolean {
  const email = raw.trim()
  if (email.length === 0 || email.length > 254) return false
  const at = email.lastIndexOf('@')
  if (at < 1 || at === email.length - 1) return false
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (local.length > 64) return false
  if (!/^[a-zA-Z0-9._%+-]+$/.test(local)) return false
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  // Domein: één of meer labels, gescheiden door punten, eindigend op
  // een TLD van ≥ 2 letters. Labels mogen geen leading/trailing dash.
  if (!/^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain)) return false
  return true
}

// Domeinen die je in een NL-context vrijwel altijd ziet. Lijst bewust
// kort gehouden — voor exotische providers willen we geen false
// "bedoelde je …?" tonen.
const COMMON_EMAIL_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'hotmail.nl',
  'outlook.com',
  'outlook.nl',
  'live.nl',
  'live.com',
  'icloud.com',
  'me.com',
  'yahoo.com',
  'yahoo.nl',
  'ziggo.nl',
  'kpnmail.nl',
  'planet.nl',
  'xs4all.nl',
  'home.nl',
  'casema.nl',
  'quicknet.nl',
  'tele2.nl',
  'upcmail.nl',
]

// Klassieke Levenshtein-implementatie. Klein genoeg (domein-lengtes <
// ~20) dat de naïeve matrix-aanpak prima werkt; geen libdep nodig.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const m: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  )
  for (let i = 0; i <= a.length; i++) m[i][0] = i
  for (let j = 0; j <= b.length; j++) m[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost)
    }
  }
  return m[a.length][b.length]
}

// Geeft een gecorrigeerd email-adres terug als het domein binnen
// edit-distance 1–2 zit van een veelvoorkomende provider; anders null.
// Korte domeinen (< 5 chars) sluiten we uit — daar wordt afstand 2
// snel te coulant (bv. "abc.nl" zou suggereren "icloud.com").
function suggestEmailFix(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (domain.length < 5) return null
  if (COMMON_EMAIL_DOMAINS.includes(domain)) return null

  let best: { domain: string; dist: number } | null = null
  for (const candidate of COMMON_EMAIL_DOMAINS) {
    const dist = levenshtein(domain, candidate)
    // Strenger voor korte candidates: anders is bv. "live.nl" ↔ "kpn.nl"
    // al binnen distance 2. Pak max(2, candidate.length * 0.25) niet —
    // simpeler: ≤ 2 én niet meer dan de helft van de candidate-lengte.
    const maxDist = Math.min(2, Math.floor(candidate.length / 2))
    if (dist > 0 && dist <= maxDist && (best === null || dist < best.dist)) {
      best = { domain: candidate, dist }
    }
  }
  return best ? `${local}@${best.domain}` : null
}

// Normaliseert e-mail naar lower-case + zonder spaties. Doe je op blur
// zodat de user nog tijdens het typen casing/spaties kan zien — pas
// als ze het veld verlaten "snap" je 'm.
function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function StepKlant({
  data,
  set,
  onBeforeAiFill,
  werkAdresNotFound = false,
  factuurAdresNotFound = false,
}: {
  data: ManualOfferteData
  set: SetFn
  // Optionele hook die vlak vóór de AI-set-calls wordt aangeroepen.
  // ManualOfferteModal gebruikt 'm om een effect te suppressen dat
  // anders de net-ge-extracteerde zakken-aantallen overschrijft.
  onBeforeAiFill?: () => void
  // True wanneer de postcode/huisnummer-combo niet gevonden is door
  // postcode.tech — toont een rode waarschuwing onder het adres.
  werkAdresNotFound?: boolean
  factuurAdresNotFound?: boolean
}) {
  // Pas waarschuwingen tonen als de user het veld heeft verlaten —
  // anders flikkert "geen geldig nummer" al bij de eerste toets.
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)

  const phoneFilled = data.telefoon.trim().length > 0
  const emailFilled = data.email.trim().length > 0
  const phoneWarning = phoneTouched && phoneFilled && !isValidNLMobile(data.telefoon)
  const emailWarning = emailTouched && emailFilled && !isValidEmail(data.email)
  // Suggestie alleen tonen als (a) format op zich oké is — anders
  // willen we eerst dat ze de format-fout fixen — en (b) er ook echt
  // een waarschijnlijke fix bestaat.
  const emailSuggestion =
    emailTouched && emailFilled && isValidEmail(data.email)
      ? suggestEmailFix(data.email)
      : null

  const handlePickExisting = (m: ExistingClientMatch) => applyExistingClient(set, m)
  const handleClearExisting = () => set('existing_lead_id', null)
  const handleAiExtracted = (f: ExtractedFields) => applyAiExtracted(set, f, onBeforeAiFill)

  return (
    <>
      {!data.existing_lead_id ? (
        <div className={styles.topToolsGrid}>
          <ExistingClientSearch
            pickedLeadId={data.existing_lead_id}
            pickedNaam={data.naam}
            onPick={handlePickExisting}
            onClear={handleClearExisting}
          />
          <AiPasteInput onExtracted={handleAiExtracted} />
        </div>
      ) : (
        <ExistingClientSearch
          pickedLeadId={data.existing_lead_id}
          pickedNaam={data.naam}
          onPick={handlePickExisting}
          onClear={handleClearExisting}
        />
      )}

      {!data.existing_lead_id && (
        <div className={styles.orDivider}>
          <span className={styles.orDividerLine} />
          <span className={styles.orDividerText}>of vul handmatig in</span>
          <span className={styles.orDividerLine} />
        </div>
      )}

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
            onBlur={() => {
              const normalized = normalizeToInternational(data.telefoon)
              if (normalized !== data.telefoon) set('telefoon', normalized)
              setPhoneTouched(true)
            }}
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
            onBlur={() => {
              const normalized = normalizeEmail(data.email)
              if (normalized !== data.email) set('email', normalized)
              setEmailTouched(true)
            }}
            placeholder="jan@voorbeeld.nl"
            inputMode="email"
          />
          {emailWarning && (
            <div className={styles.warning}>Let op, geen geldig e-mailadres</div>
          )}
          {emailSuggestion && (
            <button
              type="button"
              onClick={() => set('email', emailSuggestion)}
              className={styles.suggestion}
            >
              Bedoelde je <strong>{emailSuggestion}</strong>?
            </button>
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
        {werkAdresNotFound && (
          <div className={styles.adresWarning} role="alert">
            <AlertTriangle size={13} className={styles.adresWarningIcon} />
            <span>
              <strong>Postcode niet gevonden.</strong> Controleer postcode en
              huisnummer, of vul Straat en Plaats handmatig in.
            </span>
          </div>
        )}
        {/* Mobile-only autofill-bevestiging. Toont een groene success-card
            zodra PDOK straat+plaats heeft ingevuld — zo ziet de user op
            de telefoon in één oogopslag dat het adres goed staat zonder
            naar de aparte velden te hoeven turen. Op desktop is deze
            card verborgen (CSS) — daar zijn de inputs prominent genoeg. */}
        {data.straat.trim() && data.plaats.trim() && !werkAdresNotFound && (
          <div className={styles.autofillSuccess} role="status">
            <span className={styles.autofillSuccessIcon}>
              <Check size={14} strokeWidth={3} />
            </span>
            <div className={styles.autofillSuccessText}>
              <span className={styles.autofillSuccessTitle}>
                {data.straat} {data.huisnummer}, {data.plaats}
              </span>
              <span className={styles.autofillSuccessSub}>
                Auto-gevuld via PDOK
                {data.afstand_km > 0 ? ` · ${data.afstand_km} km` : ''}
              </span>
            </div>
          </div>
        )}
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
            {/* Zelfde volgorde als werk-adres: postcode + huisnummer
                eerst zodat de auto-fill (straat, plaats) zich aankondigt
                voordat de user die velden zelf invult. */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <Field label="Postcode">
                <input
                  className={styles.input}
                  value={data.factuur_postcode}
                  onChange={(e) => set('factuur_postcode', e.target.value)}
                  placeholder="2611 GH"
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
            {factuurAdresNotFound && (
              <div className={styles.adresWarning} role="alert">
                <AlertTriangle size={13} className={styles.adresWarningIcon} />
                <span>
                  <strong>Factuur-postcode niet gevonden.</strong> Controleer
                  postcode en huisnummer, of vul Straat en Plaats handmatig in.
                </span>
              </div>
            )}
            <div className={styles.grid21}>
              <Field label="Straat">
                <input
                  className={styles.input}
                  value={data.factuur_straat}
                  onChange={(e) => set('factuur_straat', e.target.value)}
                  placeholder="Bv. Postbusstraat"
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
