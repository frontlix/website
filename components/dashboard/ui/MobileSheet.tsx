'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import styles from './MobileSheet.module.css'

export interface MobileSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Optioneel: backdrop-click sluit niet (voor dwingende sheets). */
  dismissible?: boolean
  /** Vanaf welke kant de sheet inschuift op mobile. 'bottom' = standaard
   *  bottom-sheet; 'top' = drop-down vanaf bovenkant (handig voor zoek/
   *  filters die dicht bij de topbar horen). Op tablet+ blijft 't een
   *  gecentreerde modal — geen effect. */
  anchor?: 'top' | 'bottom'
}

export function MobileSheet({
  open,
  onClose,
  title,
  children,
  footer,
  dismissible = true,
  anchor = 'bottom',
}: MobileSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  // Body-scroll lock — gecentraliseerd + reference-counted, zodat gestapelde
  // overlays elkaars lock niet vroegtijdig vrijgeven. Lockt alleen bij `open`.
  useBodyScrollLock(open)

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
    // Initial focus naar de sheet zodat keyboard-gebruikers direct
    // binnen de dialog landen (en Tab in de inhoud blijft).
    sheetRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
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
        className={`${styles.sheet} ${anchor === 'top' ? styles.anchorTop : styles.anchorBottom} ${open ? styles.sheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {anchor === 'bottom' && (
          <span className={styles.handle} aria-hidden="true" />
        )}
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
