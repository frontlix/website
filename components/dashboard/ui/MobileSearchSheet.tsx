'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { MobileSheet } from './MobileSheet'
import styles from './MobileSearchSheet.module.css'

/**
 * MobileSearchSheet, mobile zoek-sheet die submit naar `/leads?q=…`.
 *
 * Werkt in twee modes:
 *  1. **Uncontrolled** (default, geen props): rendert z'n eigen
 *     trigger-knop + sheet. Topbar gebruikt deze mode.
 *  2. **Controlled** (`open` + `onClose` props): rendert alleen de
 *     sheet, de parent levert de trigger. MobileShell en
 *     MobileOverzichtHeader gebruiken deze mode want zij hebben hun
 *     eigen knop in HeaderActions.
 *
 * De router-push gaat naar `/leads` (niet `/dashboard/leads`); de
 * dashboard-host middleware doet de prefix-rewrite.
 */
type Props = {
  /** Wanneer geleverd, draait de component in "controlled" mode: geen eigen trigger-knop, alleen de sheet. */
  open?: boolean
  /** Required als `open` geleverd is. */
  onClose?: () => void
}

export function MobileSearchSheet({ open: openProp, onClose: onCloseProp }: Props = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const handleClose = isControlled
    ? (onCloseProp ?? (() => {}))
    : () => setInternalOpen(false)

  // Auto-focus de input wanneer de sheet opent, voor zowel controlled
  // als uncontrolled mode. Setimeout zodat de focus pas na de slide-in
  // gebeurt (anders pakt de browser 'm niet betrouwbaar op mobile).
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (new FormData(e.currentTarget).get('q') as string ?? '').trim()
    handleClose()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    router.push(`/leads${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <>
      {!isControlled && (
        <button
          type="button"
          className={styles.searchBtn}
          onClick={() => setInternalOpen(true)}
          aria-label="Zoek"
        >
          <Search size={18} />
        </button>
      )}
      <MobileSheet
        open={open}
        onClose={handleClose}
        title="Zoeken"
        anchor="top"
      >
        <form onSubmit={onSubmit}>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              name="q"
              type="search"
              placeholder="Zoek leads, adressen, telefoon…"
              className={styles.input}
              autoComplete="off"
            />
          </div>
          <div className={styles.hint}>Druk op Enter om te zoeken.</div>
        </form>
      </MobileSheet>
    </>
  )
}
