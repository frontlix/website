'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'frontlix-dashboard-theme'

/**
 * Dark-mode toggle voor het dashboard. Schakelt `.dark` op de
 * `.dashboard-theme-root` wrapper (in de dashboard-layout), die wrapper
 * omvat ZOWEL de desktop- als de mobiele chrome-boom, zodat de toggle op
 * beide viewports werkt. (Niet op <body>, anders raakt het de
 * marketing-site.)
 *
 * Eerder targette dit de `.density-*` shell-wrapper, maar die zit alléén
 * in de desktop-boom; op mobiel staat die boom op `display:none` (nog wél
 * in de DOM) waardoor `.dark` op de onzichtbare boom belandde en de
 * zichtbare mobiele UI niets deed. De gedeelde root lost dat op.
 *
 * Persisteert keuze in localStorage.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  // Bij eerste mount: lees opgeslagen voorkeur en pas toe.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark') {
      setDark(true)
      applyDarkClass(true)
    }
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    applyDarkClass(next)
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="dash-btn dash-btn-ghost"
      style={{ padding: 8, width: 36, height: 36, borderRadius: 9 }}
      aria-label={dark ? 'Schakel naar light mode' : 'Schakel naar dark mode'}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

function applyDarkClass(dark: boolean) {
  // Gedeelde theme-root die zowel de desktop- als de mobiele chrome
  // omvat (zie dashboard-layout). Zo cascadeert `.dark` naar welke boom
  // ook zichtbaar is op het huidige viewport.
  const root = document.querySelector('.dashboard-theme-root')
  if (!root) return
  if (dark) root.classList.add('dark')
  else root.classList.remove('dark')
}
