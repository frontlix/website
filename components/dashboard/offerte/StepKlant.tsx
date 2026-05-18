'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { ManualOfferteData } from '@/lib/dashboard/manual-offerte-types'
import { ExistingClientSearch } from './ExistingClientSearch'
import type { ExistingClientMatch } from '@/lib/dashboard/manual-offerte-search'
import { AiPasteInput } from './AiPasteInput'
import type { ExtractedFields } from '@/lib/dashboard/manual-offerte-ai'
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
}: {
  data: ManualOfferteData
  set: SetFn
  // Optionele hook die vlak vóór de AI-set-calls wordt aangeroepen.
  // ManualOfferteModal gebruikt 'm om een effect te suppressen dat
  // anders de net-ge-extracteerde zakken-aantallen overschrijft.
  onBeforeAiFill?: () => void
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

  // Vul de klant-velden vanuit een bestaande lead. Adres laat de
  // postcode-auto-fetch vervolgens met rust (afstand_km wordt opnieuw
  // berekend door het effect in ManualOfferteModal). Sub-dienst /
  // m² / etc. raken we expliciet niet aan — dit is alleen "klant".
  const handlePickExisting = (m: ExistingClientMatch) => {
    set('existing_lead_id', m.lead_id)
    set('naam', m.naam ?? '')
    set('bedrijf', m.bedrijfsnaam ?? '')
    set('telefoon', m.telefoon ?? '')
    set('email', m.email ?? '')
    set('postcode', m.postcode ?? '')
    set('huisnummer', m.huisnummer ?? '')
    set('straat', m.straat ?? '')
    set('plaats', m.plaats ?? '')
  }

  // Loskoppelen: alleen het id wegklikken. Velden laten staan zodat de
  // user gewoon kan doortikken — anders verlies je z'n net-ingevulde
  // edits door één misklik.
  const handleClearExisting = () => set('existing_lead_id', null)

  // Merge AI-extractie in de wizard-data. Alleen niet-null velden
  // overschrijven we — een gedeeltelijk gevuld formulier blijft dus
  // staan voor velden die de AI niet kon vinden. `wensen` gaat naar
  // `notitie` (de begeleidende tekst-veld in stap 4).
  const handleAiExtracted = (f: ExtractedFields) => {
    // Vertel de modal dat 'ie het auto-zakken-effect moet skippen,
    // anders overschrijft het effect een AI-extracted aantal direct
    // met Math.ceil(m2 / dekking).
    onBeforeAiFill?.()
    if (f.naam) set('naam', f.naam)
    if (f.bedrijf) set('bedrijf', f.bedrijf)
    if (f.telefoon) set('telefoon', f.telefoon)
    if (f.email) set('email', f.email)
    if (f.postcode) set('postcode', f.postcode)
    if (f.huisnummer) set('huisnummer', f.huisnummer)
    if (f.straat) set('straat', f.straat)
    if (f.plaats) set('plaats', f.plaats)

    // Factuur-adres: zodra de AI een aparte postcode of huisnummer
    // teruggeeft, klappen we factuur_zelfde uit (vink van het "gelijk
    // aan werk-adres"-vakje af) en vullen we de factuur-velden.
    const heeftFactuur = Boolean(f.factuur_postcode || f.factuur_huisnummer)
    if (heeftFactuur) {
      set('factuur_zelfde', false)
      if (f.factuur_postcode) set('factuur_postcode', f.factuur_postcode)
      if (f.factuur_huisnummer) set('factuur_huisnummer', f.factuur_huisnummer)
      if (f.factuur_straat) set('factuur_straat', f.factuur_straat)
      if (f.factuur_plaats) set('factuur_plaats', f.factuur_plaats)
    }

    if (f.hoofdcategorie) set('hoofdcategorie', f.hoofdcategorie)
    if (f.sub_diensten && f.sub_diensten.length > 0) set('sub', f.sub_diensten)
    if (typeof f.m2 === 'number' && f.m2 > 0) set('m2', f.m2)

    // Voegzand normaal — bij actief=true mag het auto-zakken-effect in
    // ManualOfferteModal het aantal nog overschrijven, behalve als de
    // user expliciet een aantal heeft genoemd. Daarom set het aantal
    // ná de boolean (zelfde tick, react batched).
    if (f.voegzand_normaal !== null) set('voegzand_normaal_actief', f.voegzand_normaal)
    if (typeof f.voegzand_normaal_zakken === 'number' && f.voegzand_normaal_zakken > 0) {
      set('voegzand_normaal_zakken', f.voegzand_normaal_zakken)
    }
    if (typeof f.voegzand_normaal_prijs === 'number' && f.voegzand_normaal_prijs > 0) {
      set('voegzand_normaal_prijs', f.voegzand_normaal_prijs)
    }

    if (f.voegzand_onkruidwerend !== null) {
      set('voegzand_onkruidwerend_actief', f.voegzand_onkruidwerend)
    }
    if (typeof f.voegzand_onkruidwerend_zakken === 'number' && f.voegzand_onkruidwerend_zakken > 0) {
      set('voegzand_onkruidwerend_zakken', f.voegzand_onkruidwerend_zakken)
    }
    if (typeof f.voegzand_onkruidwerend_prijs === 'number' && f.voegzand_onkruidwerend_prijs > 0) {
      set('voegzand_onkruidwerend_prijs', f.voegzand_onkruidwerend_prijs)
    }

    // Kleur — als AI iets teruggeeft, vervangen we de defaults; anders
    // raken we de kleurkeuze niet aan (default = naturel aan).
    if (f.kleur_naturel !== null) set('kleur_naturel', f.kleur_naturel)
    if (f.kleur_antraciet !== null) set('kleur_antraciet', f.kleur_antraciet)

    if (f.planten_afschermen !== null) set('planten_afschermen_actief', f.planten_afschermen)
    if (typeof f.planten_afschermen_rollen === 'number' && f.planten_afschermen_rollen > 0) {
      set('planten_afschermen_rollen', f.planten_afschermen_rollen)
    }
    if (typeof f.planten_afschermen_prijs === 'number' && f.planten_afschermen_prijs > 0) {
      set('planten_afschermen_prijs', f.planten_afschermen_prijs)
    }

    if (f.groene_aanslag !== null) set('groene_aanslag', f.groene_aanslag ? 'ja' : 'nee')
    if (f.korstmos !== null) set('korstmos', f.korstmos ? 'ja' : 'nee')

    if (f.onderhoud_weken === 4 || f.onderhoud_weken === 8 || f.onderhoud_weken === 12 || f.onderhoud_weken === 16) {
      set('onderhoud_weken', f.onderhoud_weken)
    }

    // Extra arbeid — alleen overschrijven als de AI een complete set
    // teruggaf (minuten + tenminste een omschrijving). Half-leeg laten
    // we de wizard-defaults staan.
    if (typeof f.extra_arbeid_minuten === 'number' && f.extra_arbeid_minuten > 0) {
      set('extra_arbeid_minuten', f.extra_arbeid_minuten)
      if (typeof f.extra_arbeid_personen === 'number' && f.extra_arbeid_personen > 0) {
        set('extra_arbeid_personen', f.extra_arbeid_personen)
      } else {
        set('extra_arbeid_personen', 1)
      }
      if (f.extra_arbeid_omschrijving) set('extra_arbeid_omschrijving', f.extra_arbeid_omschrijving)
    }

    // Korting — alleen overschrijven bij geldig percentage. 0% = "geen
    // korting" en is niet anders dan default; daar laten we 'm met rust.
    if (
      typeof f.korting_percentage === 'number' &&
      f.korting_percentage > 0 &&
      f.korting_percentage <= 100
    ) {
      set('korting_percentage', f.korting_percentage)
      if (f.korting_omschrijving) set('korting_omschrijving', f.korting_omschrijving)
    }

    if (f.kanaal === 'wa' || f.kanaal === 'mail' || f.kanaal === 'both' || f.kanaal === 'manual') {
      set('kanaal', f.kanaal)
    }

    if (f.wensen) set('notitie', f.wensen)
  }

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
