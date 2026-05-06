'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import styles from './PhotoLightbox.module.css'

export function PhotoLightbox({
  src,
  alt,
  analyse,
  onClose,
}: {
  src: string
  alt: string
  analyse: string | null
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <button className={styles.close} onClick={onClose} aria-label="Sluiten">
        ×
      </button>
      <div className={styles.frame} onClick={(e) => e.stopPropagation()}>
        <div className={styles.imageWrap}>
          <Image src={src} alt={alt} fill style={{ objectFit: 'contain' }} unoptimized />
        </div>
        {analyse && (
          <p className={styles.analyse}>
            <strong>Bot-analyse:</strong> {analyse}
          </p>
        )}
      </div>
    </div>
  )
}
