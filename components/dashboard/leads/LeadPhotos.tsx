'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Foto } from '@/lib/dashboard/database.types'
import { PhotoLightbox } from './PhotoLightbox'
import styles from './LeadPhotos.module.css'

export function LeadPhotos({ fotos }: { fotos: Foto[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (fotos.length === 0) {
    return <p className={styles.empty}>Geen foto&apos;s ontvangen voor deze lead.</p>
  }

  return (
    <>
      <div className={styles.grid}>
        {fotos.map((foto, idx) => {
          const url = foto.public_url
          if (!url) return null
          return (
            <button
              key={foto.id}
              className={styles.thumb}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Foto ${idx + 1} bekijken`}
            >
              <Image
                src={url}
                alt={`Foto ${idx + 1}`}
                width={200}
                height={200}
                style={{ objectFit: 'cover' }}
                unoptimized
              />
              {foto.foto_analyse && (
                <span className={styles.analyseBadge}>analyse</span>
              )}
            </button>
          )
        })}
      </div>

      {activeIndex !== null && fotos[activeIndex]?.public_url && (
        <PhotoLightbox
          src={fotos[activeIndex].public_url!}
          alt={`Foto ${activeIndex + 1}`}
          analyse={fotos[activeIndex].foto_analyse}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </>
  )
}
