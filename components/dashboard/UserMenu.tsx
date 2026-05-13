'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import styles from './UserMenu.module.css'

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Sluit dropdown bij click-buiten — anders blijft hij open na navigatie.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const initials = getInitials(email)

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.card}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.identity}>
          <div className={styles.email}>{email}</div>
          <div className={styles.role}>Owner-account</div>
        </div>
        <ChevronDown
          size={14}
          className={`${styles.chev} ${open ? styles.chevOpen : ''}`}
        />
      </button>

      {open && (
        <div className={styles.popup} role="menu">
          <a href="/logout" className={styles.itemDanger}>
            <LogOut size={14} />
            <span>Uitloggen</span>
          </a>
        </div>
      )}
    </div>
  )
}

function getInitials(email: string): string {
  // Pakt de eerste 1-2 alfanumerieke karakters uit de e-mail-prefix.
  // bv. "christiaan.tromp@gmail.com" → "CT", "frontlixx@gmail.com" → "F".
  const prefix = email.split('@')[0] ?? ''
  const parts = prefix.split(/[._-]+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}
