'use client'

import { DossLabel, DossPhoto } from './DossAtoms'
import type { DossPhotoItem } from './dossier-mappers'
import styles from './DossFotos.module.css'

// ── DossFotos ──
// Foto's-tab: label met aantal + 2-koloms grid met de echte klant-foto's
// (Supabase public_url). Ontbreekt een URL → gestreepte placeholder.
type DossFotosProps = {
  fotos: DossPhotoItem[]
}

export function DossFotos({ fotos }: DossFotosProps) {
  return (
    <div>
      <DossLabel>
        {fotos.length} foto&apos;s van de klant
      </DossLabel>
      {fotos.length > 0 && (
        <div className={styles.grid}>
          {fotos.map((f, i) => (
            <DossPhoto key={i} tag={f.tag} url={f.url} />
          ))}
        </div>
      )}
    </div>
  )
}
