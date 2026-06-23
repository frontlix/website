'use client'

import { useState } from 'react'
import { DossLabel, DossPhoto } from './DossAtoms'
import { MobilePhotoLightbox } from './MobilePhotoLightbox'
import type { DossPhotoItem } from './dossier-mappers'
import styles from './DossFotos.module.css'

// ── DossFotos ──
// Foto's-tab: label met aantal + 2-koloms grid met de echte klant-foto's
// (Supabase public_url). Ontbreekt een URL → gestreepte placeholder.
// De foto's worden volledig getoond (contain, niet bijgesneden) en zijn
// klikbaar: tikken opent de foto groot in een full-screen lightbox.
type DossFotosProps = {
  fotos: DossPhotoItem[]
}

export function DossFotos({ fotos }: DossFotosProps) {
  // Index van de foto die in de lightbox open staat; null = dicht.
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const openFoto =
    openIndex !== null ? fotos[openIndex] : null

  return (
    <div>
      <DossLabel>
        {fotos.length} foto&apos;s van de klant
      </DossLabel>
      {fotos.length > 0 && (
        <div className={styles.grid}>
          {fotos.map((f, i) => (
            <DossPhoto
              key={i}
              tag={f.tag}
              url={f.url}
              fit="contain"
              onOpen={f.url ? () => setOpenIndex(i) : undefined}
            />
          ))}
        </div>
      )}

      {openFoto?.url && (
        <MobilePhotoLightbox
          url={openFoto.url}
          tag={openFoto.tag}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  )
}
