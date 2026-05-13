'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'frontlix-dashboard-theme'

/**
 * Dark-mode toggle voor het dashboard. Schakelt `.dark` op `.shell` div
 * (niet op <body> — anders raakt het de marketing-site).
 *
 * Persisteert keuze in localStorage. Past klasse direct toe op de
 * dichtstbijzijnde `.density-cozy`/`.density-compact`/`.density-roomy`
 * shell-wrapper — die wrapper exporteert de tokens-context.
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
  // Zoek de shell-wrapper (eerste element met density-* klasse).
  const shell = document.querySelector(
    '.density-cozy, .density-compact, .density-roomy',
  )
  if (!shell) return
  if (dark) shell.classList.add('dark')
  else shell.classList.remove('dark')
}
