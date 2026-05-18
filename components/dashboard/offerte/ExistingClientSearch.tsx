'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X, Link2 } from 'lucide-react'
import {
  searchExistingClients,
  type ExistingClientMatch,
} from '@/lib/dashboard/manual-offerte-search'
import styles from './ManualOfferteModal.module.css'

type Props = {
  pickedLeadId: string | null
  pickedNaam: string
  onPick: (m: ExistingClientMatch) => void
  onClear: () => void
}

/**
 * Live-search combobox bovenin StepKlant. Gedrag:
 *
 * - ≥ 2 chars + 250ms debounce → server action `searchExistingClients`.
 * - Dropdown sluit op outside-click of bij escape (geen library; zelf
 *   listener om geen extra deps binnen te halen).
 * - Bij selecteren wordt `onPick` met de match gedaan; de parent
 *   (StepKlant) vult de wizard-velden zelf — deze component weet niets
 *   van de wizard-state.
 * - Als er al een lead gekoppeld is, tonen we een "gekoppeld"-pill met
 *   een X-knop om weer naar zoek-mode te gaan. De velden in de wizard
 *   blijven dan staan (handmatige edits behouden).
 */
export function ExistingClientSearch({
  pickedLeadId,
  pickedNaam,
  onPick,
  onClear,
}: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ExistingClientMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // Debounced search. Cancel-flag in plaats van AbortController omdat
  // server actions die niet ondersteunen — late responses negeren we
  // gewoon via de flag.
  useEffect(() => {
    if (pickedLeadId) return
    const safe = q.trim()
    if (safe.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    let cancelled = false
    const t = setTimeout(async () => {
      const r = await searchExistingClients(safe)
      if (cancelled) return
      setResults(r)
      setLoading(false)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, pickedLeadId])

  // Sluiten bij outside-click + escape.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (pickedLeadId) {
    return (
      <div className={styles.pickedClient}>
        <Link2 size={14} />
        <div className={styles.pickedClientText}>
          Gekoppeld aan bestaande lead — <strong>{pickedNaam || pickedLeadId}</strong>
        </div>
        <button
          type="button"
          onClick={() => {
            onClear()
            setQ('')
            setResults([])
          }}
          className={styles.pickedClientClear}
          aria-label="Loskoppelen"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  const showDropdown = open && q.trim().length >= 2

  return (
    <div ref={wrapRef} className={styles.searchWrap}>
      <div className={styles.searchBox}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Zoek bestaande klant op naam, telefoon of adres…"
        />
      </div>
      {showDropdown && (
        <div className={styles.searchDropdown}>
          {loading && results.length === 0 && (
            <div className={styles.searchEmpty}>Zoeken…</div>
          )}
          {!loading && results.length === 0 && (
            <div className={styles.searchEmpty}>
              Geen klant gevonden — vul de gegevens hieronder handmatig in.
            </div>
          )}
          {results.map((r) => {
            const adres = [r.straat, r.huisnummer].filter(Boolean).join(' ')
            const adresFull = [adres, r.postcode, r.plaats].filter(Boolean).join(' · ')
            return (
              <button
                key={r.lead_id}
                type="button"
                className={styles.searchItem}
                onClick={() => {
                  onPick(r)
                  setOpen(false)
                  setQ('')
                  setResults([])
                }}
              >
                <div className={styles.searchItemMain}>
                  <span className={styles.searchItemNaam}>{r.naam || '—'}</span>
                  {r.bedrijfsnaam && (
                    <span className={styles.searchItemBedrijf}>{r.bedrijfsnaam}</span>
                  )}
                </div>
                <div className={styles.searchItemMeta}>
                  {r.telefoon && <span>{r.telefoon}</span>}
                  {adresFull && <span>{adresFull}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
