'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'frontlix-dashboard-theme'

/**
 * Past het opgeslagen licht/donker-thema toe zodra het dashboard laadt.
 *
 * Voorheen gebeurde dit ALLEEN in de ThemeToggle, en die zit op mobiel
 * verstopt in de lazy-gemounte "Meer"-sheet (MeerSheet returnt null zolang
 * het menu dicht is). Daardoor werd een opgeslagen `dark`-voorkeur pas
 * toegepast op het moment dat de gebruiker "Meer" opende: het dashboard
 * rende eerst licht en klapte dan "uit zichzelf" naar donker tijdens het
 * scrollen. Door de detectie hier te doen, in een component dat áltijd in
 * de dashboard-layout gemount is, staat het juiste thema er meteen bij het
 * laden en kan de toggle niets meer verrassend omschakelen.
 *
 * Zet `.dark` op `.dashboard-theme-root` (exact dezelfde wrapper als de
 * ThemeToggle), bewust NIET op <html>/<body> zodat de marketing-site
 * ongemoeid blijft. Het no-flash inline-script in de layout zet `.dark`
 * al vóór de eerste paint; dit effect borgt de juiste eindtoestand (en
 * verwijdert `.dark` weer als de voorkeur licht/leeg is).
 */
export function ThemeInit() {
  useEffect(() => {
    const root = document.querySelector('.dashboard-theme-root')
    if (!root) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [])

  return null
}
