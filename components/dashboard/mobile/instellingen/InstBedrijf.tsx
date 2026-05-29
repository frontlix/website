'use client'

// v1 — UI met lokale state; opslaan nog niet gekoppeld aan server-actions.
// Zie plan § Context: "wiring to real settings server-actions is deferred".

import { InstField, InstGroupCard, InstPrimaryBtn } from './InstAtoms'
import styles from './InstBedrijf.module.css'

/** Bedrijfsgegevens-detailscherm. Plain content — drilldown layer levert header. */
export function InstBedrijf() {
  return (
    <div className={styles.container}>
      {/* Surface card met alle velden */}
      <InstGroupCard>
        <div className={styles.fields}>
          <InstField label="Bedrijfsnaam" value="Schoon Straatje" />
          <InstField label="Chatbot-naam" value="Surface" />
          <InstField label="Adres" value="Achterweg 23" />
          {/* Postcode/Plaats naast elkaar: vaste 110px kolom + 1fr */}
          <div className={styles.postcodePlaats}>
            <InstField label="Postcode" value="4521 CB" />
            <InstField label="Plaats" value="Biervliet" />
          </div>
          <InstField label="E-mail" value="info@schoonstraatje.nl" />
          <InstField label="WhatsApp" value="+31 6 24965270" />
        </div>
      </InstGroupCard>
      <InstPrimaryBtn>Opslaan</InstPrimaryBtn>
    </div>
  )
}
