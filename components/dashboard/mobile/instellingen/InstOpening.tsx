'use client'

// Openingsbericht: WhatsApp-template met live preview. De template-tekst zelf
// wijzigen loopt via Meta-goedkeuring (requestTemplateChange + Slack-flow) en is
// in dit mobiele v1-scherm bewust READ-ONLY — geen dode opslaan-knop. Wel echt:
// de preview vult de echte bedrijfsnaam + bot-naam in (i.p.v. demo-waarden).

import { fillOpening } from './inst-helpers'
import { INST_OPENING, INST_VARS } from './instellingen-mock'
import styles from './InstOpening.module.css'

type Props = {
  bedrijfsnaam: string | null
  chatbot: string | null
}

export function InstOpening({ bedrijfsnaam, chatbot }: Props) {
  // Echte tenant-waarden in de preview; overige variabelen blijven demo
  // (verschillen per lead).
  const overrides: Record<string, string> = {}
  if (bedrijfsnaam) overrides['{bedrijf}'] = bedrijfsnaam
  if (chatbot) overrides['{bot_naam}'] = chatbot
  const preview = fillOpening(INST_OPENING, overrides)

  return (
    <div className={styles.wrap}>
      <div className={styles.banner}>
        De template-tekst wijzig je via Frontlix — elke aanpassing wordt door Meta
        goedgekeurd (24–48u). Op desktop kun je een wijziging aanvragen.
      </div>

      <div className={styles.fieldLabel}>Template-tekst (alleen-lezen)</div>
      <textarea className={styles.textarea} value={INST_OPENING} readOnly />

      <div className={`${styles.fieldLabel} ${styles.fieldLabelSpaced}`}>
        Beschikbare variabelen
      </div>
      <div className={styles.pills}>
        {INST_VARS.map((v) => (
          <span key={v} className={styles.pill}>
            {v}
          </span>
        ))}
      </div>

      <div className={styles.fieldLabel}>Voorbeeld</div>
      <div className={styles.chat}>
        <div className={styles.datePill}>Vandaag</div>
        <div className={styles.outBubble}>
          {preview}
          <div className={styles.meta}>
            09:14 <span className={styles.tick}>✓✓</span>
          </div>
        </div>
      </div>
    </div>
  )
}
