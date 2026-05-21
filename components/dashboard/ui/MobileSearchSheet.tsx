'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { MobileSheet } from './MobileSheet'
import styles from './MobileSearchSheet.module.css'

export function MobileSearchSheet() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (new FormData(e.currentTarget).get('q') as string ?? '').trim()
    setOpen(false)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    router.push(`/dashboard/leads${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <>
      <button
        type="button"
        className={styles.searchBtn}
        onClick={() => {
          setOpen(true)
          // Focus na render-tick zodat keyboard direct opent op mobile.
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        aria-label="Zoek"
      >
        <Search size={18} />
      </button>
      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
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
