'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import styles from './MobileSheet.module.css'

export interface MobileSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Optioneel: backdrop-click sluit niet (voor dwingende sheets). */
  dismissible?: boolean
}

export function MobileSheet({
  open,
  onClose,
  title,
  children,
  footer,
  dismissible = true,
}: MobileSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', onKey)
    // Body-scroll lock voorkomt dat de achtergrond scrolt terwijl
    // de sheet openstaat. Restored on close.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, dismissible, onClose])

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className={`${styles.sheet} ${open ? styles.sheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <span className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          <div className={styles.title}>{title ?? ''}</div>
          {dismissible && (
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Sluiten"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </>
  )
}
