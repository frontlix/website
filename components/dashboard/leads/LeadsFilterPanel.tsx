'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Filter, Zap, Check } from 'lucide-react'
import styles from './LeadsFilterPanel.module.css'

/**
 * LeadsFilterPanel — desktop-popover met de geavanceerde filters die
 * voorheen alleen op mobiel bestonden (LeadsFilterSheet): Bron, "Alleen
 * urgent" en Sortering. Schrijft naar de URL (server-side filtering,
 * blijft behouden bij refresh/delen) — consistent met de bestaande
 * desktop-filtertabs. Fase blijft de aparte tab-balk.
 */

type Bron = 'wa' | 'form'
type Sort = 'binnen' | 'prijs' | 'naam' | 'fase'

const BRONNEN: ReadonlyArray<{ k: Bron; l: string }> = [
  { k: 'wa', l: 'WhatsApp' },
  { k: 'form', l: 'Formulier' },
]

const SORTS: ReadonlyArray<{ k: Sort; l: string }> = [
  { k: 'binnen', l: 'Binnengekomen' },
  { k: 'prijs', l: 'Offerteprijs' },
  { k: 'naam', l: 'Naam (A–Z)' },
  { k: 'fase', l: 'Fase' },
]

export function LeadsFilterPanel() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const bron = searchParams.get('bron')
  const urgent = searchParams.get('urgent') === '1'
  const sort = (searchParams.get('sort') ?? 'binnen') as Sort

  const activeCount =
    (bron === 'wa' || bron === 'form' ? 1 : 0) +
    (urgent ? 1 : 0) +
    (sort !== 'binnen' ? 1 : 0)

  // Klik-buiten + Escape sluiten het paneel.
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

  /** Zet/verwijder een param en navigeer (overige params blijven behouden). */
  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null) params.delete(key)
    else params.set(key, value)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('bron')
    params.delete('urgent')
    params.delete('sort')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className="dash-btn dash-btn-secondary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Filter size={13} />
        Filters
        {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Filters">
          {/* ── Bron ───────────────────────────────────────────── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Bron</div>
            <div className={styles.segRow}>
              <button
                type="button"
                className={styles.seg}
                data-on={!bron ? 'true' : undefined}
                onClick={() => setParam('bron', null)}
              >
                Alle
              </button>
              {BRONNEN.map((b) => (
                <button
                  key={b.k}
                  type="button"
                  className={styles.seg}
                  data-on={bron === b.k ? 'true' : undefined}
                  onClick={() => setParam('bron', bron === b.k ? null : b.k)}
                >
                  {b.l}
                </button>
              ))}
            </div>
          </div>

          {/* ── Urgent ─────────────────────────────────────────── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Snel filter</div>
            <button
              type="button"
              className={styles.urgentBtn}
              data-on={urgent ? 'true' : undefined}
              onClick={() => setParam('urgent', urgent ? null : '1')}
            >
              <span className={styles.urgentLabel}>
                <Zap size={14} />
                Alleen urgent
              </span>
              <span className={styles.switch} data-on={urgent ? 'true' : undefined}>
                <span className={styles.knob} data-on={urgent ? 'true' : undefined} />
              </span>
            </button>
          </div>

          {/* ── Sorteer op ─────────────────────────────────────── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Sorteer op</div>
            <div className={styles.sortList}>
              {SORTS.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  className={styles.sortItem}
                  data-on={sort === s.k ? 'true' : undefined}
                  onClick={() => setParam('sort', s.k === 'binnen' ? null : s.k)}
                >
                  {s.l}
                  {sort === s.k && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clearAll}
              disabled={activeCount === 0}
            >
              Wis filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
