'use client'

import { useState } from 'react'
import { LogOut, User as UserIcon } from 'lucide-react'
import styles from './UserMenu.module.css'

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.wrap}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserIcon size={16} />
        <span className={styles.email}>{email}</span>
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <a href="/logout" className={styles.item}>
            <LogOut size={16} />
            <span>Uitloggen</span>
          </a>
        </div>
      )}
    </div>
  )
}
