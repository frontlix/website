'use client'

import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { X, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { DagrapportData } from '@/lib/dashboard/dagrapport-queries'
import styles from './DagrapportDrawer.module.css'

/**
 * Slide-out drawer met dag-statistieken (vandaag vs gisteren).
 *
 * Mount-pattern: parent rendert deze alléén als `?dagrapport=1` in de URL
 * staat. Sluit-flow zet `?dagrapport=...` leeg via router.replace zodat de
 * URL als single source of truth blijft (back-knop sluit ook de drawer).
 */
export function DagrapportDrawer({ data }: { data: DagrapportData }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const close = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('dagrapport')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Escape sluit de drawer + body-scroll lock zodat de underlying page
  // niet meescrollt terwijl we binnen het paneel scrollen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
    // close is stable per render maar referentieel niet — daarom geen
    // dependency-array uitbreiden; effect runt alleen bij mount/unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const datumFmt = new Date(data.datum).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <div
        className={styles.overlay}
        onClick={close}
        aria-hidden
      />
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Dagrapport"
      >
        <div className={styles.header}>
          <div>
            <div className={styles.headerTitle}>Dagrapport</div>
            <div className={styles.headerSub}>{datumFmt}</div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={close}
            aria-label="Sluiten"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {/* KPI-grid — 4 cijfers vandaag, delta vs gisteren ────── */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Vandaag in cijfers</div>
            <div className={styles.kpiGrid}>
              <KpiCard
                label="Nieuwe leads"
                value={data.vandaag.leads}
                prev={data.gisteren.leads}
              />
              <KpiCard
                label="Offertes verstuurd"
                value={data.vandaag.offertesVerstuurd}
                prev={data.gisteren.offertesVerstuurd}
              />
              <KpiCard
                label="Akkoorden"
                value={data.vandaag.akkoorden}
                prev={data.gisteren.akkoorden}
              />
              <KpiCard
                label="Omzet akkoord"
                value={data.vandaag.omzet}
                prev={data.gisteren.omzet}
                formatEuro
              />
            </div>
          </section>

          {/* Bronnen-split — alleen vandaag ──────────────────────── */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Waar kwamen ze vandaan</div>
            {data.bronnen.length === 0 ? (
              <div className={styles.empty}>
                Nog geen leads vandaag — kanalen rusten even.
              </div>
            ) : (
              <div className={styles.bronnenList}>
                {data.bronnen.map((b) => (
                  <div key={b.bron} className={styles.bronRow}>
                    <span className={styles.bronNaam}>{b.bron}</span>
                    <span className={styles.bronCount}>{b.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  )
}

/**
 * Eén KPI-tegel met delta-pill. `formatEuro` toggelt euro-presentatie aan
 * (alleen voor de omzet-tegel).
 */
function KpiCard({
  label,
  value,
  prev,
  formatEuro = false,
}: {
  label: string
  value: number
  prev: number
  formatEuro?: boolean
}) {
  const display = formatEuro
    ? `€${Math.round(value).toLocaleString('nl-NL')}`
    : String(value)

  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{display}</div>
      <Delta value={value} prev={prev} formatEuro={formatEuro} />
    </div>
  )
}

function Delta({
  value,
  prev,
  formatEuro,
}: {
  value: number
  prev: number
  formatEuro: boolean
}) {
  // Geen vergelijking mogelijk: beide nul of beide niets nieuws.
  if (value === 0 && prev === 0) {
    return (
      <span className={`${styles.kpiDelta} ${styles.deltaFlat}`}>
        <Minus size={11} />
        gisteren ook nul
      </span>
    )
  }

  const diff = value - prev
  if (diff === 0) {
    return (
      <span className={`${styles.kpiDelta} ${styles.deltaFlat}`}>
        <Minus size={11} />
        gelijk aan gisteren
      </span>
    )
  }

  const up = diff > 0
  const abs = Math.abs(diff)
  const display = formatEuro
    ? `€${Math.round(abs).toLocaleString('nl-NL')}`
    : String(abs)

  return (
    <span
      className={`${styles.kpiDelta} ${up ? styles.deltaUp : styles.deltaDown}`}
    >
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {display} vs gisteren
    </span>
  )
}
