'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { Pill } from './ui/Pill'
import styles from './UserMenu.module.css'

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Sluit dropdown bij click-buiten, anders blijft hij open na navigatie.
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
  const displayName = formatDisplayName(email)

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
          <div className={styles.name}>{displayName}</div>
          <div className={styles.role}>Owner-account</div>
        </div>
        <ChevronDown
          size={14}
          className={`${styles.chev} ${open ? styles.chevOpen : ''}`}
        />
      </button>

      {open && (
        <div className={styles.popup} role="menu">
          {/* Identity-header, avatar + naam + email + owner-pill */}
          <div className={styles.popupHead}>
            <div className={styles.popupHeadRow}>
              <div className={styles.popupAvatar}>{initials}</div>
              <div className={styles.popupIdentity}>
                <div className={styles.popupName}>{displayName}</div>
                <div className={styles.popupEmail}>{email}</div>
              </div>
            </div>
            <Pill tone="green">Owner-account</Pill>
          </div>

          <div className={styles.popupDivider} />

          {/* Bewust alleen Uitloggen: de overige menu-items (account, plan,
              support) waren placeholders en zijn op verzoek verwijderd. */}
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
  const prefix = email.split('@')[0] ?? ''
  const parts = prefix.split(/[._-]+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}

function formatDisplayName(email: string): string {
  // "christiaan.tromp" → "Christiaan Tromp"
  const prefix = email.split('@')[0] ?? email
  return prefix
    .split(/[._-]+/)
    .filter(Boolean)
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join(' ')
}
