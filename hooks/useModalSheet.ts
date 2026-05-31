'use client'
import { useEffect, useRef } from 'react'
import type React from 'react'
import { useBodyScrollLock } from './useBodyScrollLock'

/**
 * useModalSheet — gedeelde modal-/bottom-sheet plumbing voor de mobiele sheets
 * (LeadsFilterSheet, AgendaNewSheet, AgendaHerplanSheet). Doet drie dingen zolang
 * `open` true is:
 *   1. body-scroll lockt via de bestaande useBodyScrollLock (één bron van waarheid);
 *   2. Escape-keydown vangt en `onClose` aanroept;
 *   3. focus naar de dialog-div verplaatst bij openen en bij sluiten herstelt naar
 *      het element dat de focus had (zodat de gebruiker niet 'kwijtraakt').
 *
 * Geen volledige focus-trap — scroll-lock + Escape + focus-move/-restore volstaat
 * voor deze sheets. Retourneert de ref die op de role="dialog"-div moet
 * (samen met tabIndex={-1} zodat de div programmatisch focusbaar is).
 *
 * BELANGRIJK: roep deze hook altijd aan vóór een eventuele `if (!open) return null`
 * in de component, zodat de hook-volgorde stabiel blijft tussen renders.
 */
export function useModalSheet<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
): React.RefObject<T | null> {
  const dialogRef = useRef<T | null>(null)
  // Het element dat focus had vóór openen — voor herstel bij sluiten.
  const prevFocusRef = useRef<HTMLElement | null>(null)

  // Body-scroll lock hergebruiken (zelfde gedrag als de andere sheets).
  useBodyScrollLock(open)

  // onClose stabiel houden via een ref, zodat de Escape-listener niet bij elke
  // render opnieuw bindt (en we onClose niet in de dep-array hoeven te zetten).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    // Onthoud de huidige focus en verplaats naar de dialog bij openen.
    prevFocusRef.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Focus terugzetten naar de trigger bij sluiten (best-effort).
      prevFocusRef.current?.focus?.()
    }
  }, [open])

  return dialogRef
}
