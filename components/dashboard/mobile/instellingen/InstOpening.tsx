'use client'

import { useState } from 'react'
import { fillOpening } from './inst-helpers'
import { INST_OPENING, INST_VARS } from './instellingen-mock'
import styles from './InstOpening.module.css'

/**
 * Openingsbericht-detailscherm: WhatsApp-template-editor met live preview.
 * Amber-banner waarschuwt voor Meta-goedkeuring. Variabele-pills appendden
 * ` {var}` aan de template-tekst; de preview vult demo-waarden in via fillOpening.
 * v1: lokale state (INST_OPENING), niet gewired aan template-actions.
 */
export function InstOpening() {
  const [txt, setTxt] = useState(INST_OPENING)

  return (
    <div className={styles.wrap}>
      <div className={styles.banner}>
        Wijzigingen worden door Meta goedgekeurd (24–48u). De oude versie blijft actief tot
        goedkeuring.
      </div>

      <div className={styles.fieldLabel}>Template-tekst</div>
      <textarea
        className={styles.textarea}
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
      />

      <div className={styles.pills}>
        {INST_VARS.map((v) => (
          <button
            key={v}
            type="button"
            className={styles.pill}
            onClick={() => setTxt((x) => (x.trim() === '' ? v : `${x} ${v}`))}
          >
            {v}
          </button>
        ))}
      </div>

      <div className={styles.fieldLabel}>Voorbeeld</div>
      <div className={styles.chat}>
        <div className={styles.datePill}>Vandaag</div>
        <div className={styles.outBubble}>
          {fillOpening(txt)}
          <div className={styles.meta}>
            09:14 <span className={styles.tick}>✓✓</span>
          </div>
        </div>
      </div>
    </div>
  )
}
