'use client'

import { useEffect, useId, useRef } from 'react'
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
  const sheetRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  // Houd de laatste onClose in een ref zodat we 'm niet als effect-dep
  // hoeven te listen — voorkomt re-mounts van listener + scroll-lock
  // bij elke parent-rerender met inline arrow `onClose={() => ...}`.
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const close = () => onCloseRef.current()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) close()
    }
    document.addEventListener('keydown', onKey)
    // Body-scroll lock voorkomt dat de achtergrond scrolt terwijl
    // de sheet openstaat. Restored on close.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Initial focus naar de sheet zodat keyboard-gebruikers direct
    // binnen de dialog landen (en Tab in de inhoud blijft).
    sheetRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, dismissible])

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={dismissible ? () => onCloseRef.current() : undefined}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${open ? styles.sheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <span className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          {title ? (
            <div id={titleId} className={styles.title}>{title}</div>
          ) : (
            <span />
          )}
          {dismissible && (
            <button
              type="button"
              className={styles.close}
              onClick={() => onCloseRef.current()}
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
