'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import styles from './MobilePhotoLightbox.module.css'

// ── MobilePhotoLightbox ──
// Full-screen lightbox voor één klantfoto op telefoon. Donkere overlay over het
// hele scherm, de foto groot en gecentreerd (max ~92vw/85vh, object-fit: contain).
// Sluiten via: tik naast de foto (overlay), het kruisje rechtsboven, of Esc.
// Net als de tegels gebruiken we next/image met `unoptimized` (Supabase-URL's).
type MobilePhotoLightboxProps = {
  /** Foto-URL (Supabase public_url) die groot getoond wordt. */
  url: string
  /** Tag/label van de foto, gebruikt als alt-tekst. */
  tag: string
  /** Sluit de lightbox. */
  onClose: () => void
}

export function MobilePhotoLightbox({ url, tag, onClose }: MobilePhotoLightboxProps) {
  // Esc sluit de lightbox; daarnaast de pagina-scroll bevriezen zolang open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${tag}`}
      // Tik op de overlay (naast de foto) sluit; tik op de foto zelf niet.
      onClick={onClose}
    >
      {/* Kruisje rechtsboven */}
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Foto sluiten"
      >
        <X size={22} aria-hidden="true" />
      </button>

      {/* Foto-wrapper: vangt de klik af zodat tikken op de foto niet sluit. */}
      <div className={styles.figure} onClick={(e) => e.stopPropagation()}>
        <Image
          src={url}
          alt={tag}
          fill
          sizes="92vw"
          unoptimized
          className={styles.image}
        />
      </div>
    </div>
  )
}
