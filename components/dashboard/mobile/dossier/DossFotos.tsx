'use client'

import { DossLabel, DossPhoto } from './DossAtoms'
import { DOSS } from './dossier-mock'
import styles from './DossFotos.module.css'

// ── DossFotos ──
// Foto's-tab: label met aantal + 2-koloms grid van gestreepte placeholders.
// (Port van handoff regels 281–288.)
type DossFotosProps = {
  fotos: number
}

export function DossFotos({ fotos }: DossFotosProps) {
  return (
    <div>
      <DossLabel>{fotos} foto&apos;s van de klant</DossLabel>
      <div className={styles.grid}>
        {DOSS.fotos_list.map((f) => (
          <DossPhoto key={f.tag} tag={f.tag} />
        ))}
      </div>
    </div>
  )
}
