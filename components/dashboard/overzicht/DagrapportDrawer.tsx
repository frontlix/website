'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { X, ArrowUp, ArrowDown, Minus, MessageSquare, Send, Clock } from 'lucide-react'
import type { DagrapportData } from '@/lib/dashboard/dagrapport-queries'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
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

  // Portal-target binnen de theme-root maar buiten de mobiele .main-scroller.
  // Op iOS desynct een position:fixed element dat binnen een overflow-scroller
  // leeft tijdens het scrollen (snapt terug bij loslaten); een portal hierheen
  // lost dat op. Tot het effect draait blijft portalEl null → render niets
  // (voorkomt hydration-mismatch).
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPortalEl(document.getElementById('dagrapport-portal-root') ?? document.body)
  }, [])

  const close = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('dagrapport')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Body-scroll lock terwijl de drawer open is, gecentraliseerd +
  // reference-counted (de drawer mount alleen bij ?dagrapport=1, dus `true`).
  useBodyScrollLock(true)

  // Escape sluit de drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
    // close is stable per render maar referentieel niet, daarom geen
    // dependency-array uitbreiden; effect runt alleen bij mount/unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const datumFmt = new Date(data.datum).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (!portalEl) return null

  return createPortal(
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
          {/* Surface-bot activiteit, bovenaan zodat het bot-narratief
              eerst gezien wordt, vóór de pure conversie-KPI's. */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Surface vandaag</div>
            <div className={styles.surfaceCard}>
              <div className={styles.surfaceStat}>
                <span className={styles.surfaceLabel}>
                  <Send size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                  Verstuurd
                </span>
                <span className={styles.surfaceValue}>{data.surface.uitgaand}</span>
                <span className={styles.surfaceHint}>berichten door bot</span>
              </div>
              <div className={styles.surfaceStat}>
                <span className={styles.surfaceLabel}>
                  <MessageSquare size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                  Ontvangen
                </span>
                <span className={styles.surfaceValue}>{data.surface.inkomend}</span>
                <span className={styles.surfaceHint}>van klanten</span>
              </div>
              <div className={styles.surfaceStat}>
                <span className={styles.surfaceLabel}>
                  <Clock size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                  Reactietijd
                </span>
                <span className={styles.surfaceValue}>
                  {data.surface.reactietijdS !== null ? `${data.surface.reactietijdS}s` : '—'}
                </span>
                <span className={styles.surfaceHint}>gem. vandaag</span>
              </div>
            </div>
          </section>

          {/* KPI-grid, 4 cijfers vandaag, delta vs gisteren + sparkline */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Vandaag in cijfers</div>
            <div className={styles.kpiGrid}>
              <KpiCard
                label="Nieuwe leads"
                value={data.vandaag.leads}
                prev={data.gisteren.leads}
                spark={data.sparklines.leads}
              />
              <KpiCard
                label="Offertes verstuurd"
                value={data.vandaag.offertesVerstuurd}
                prev={data.gisteren.offertesVerstuurd}
                spark={data.sparklines.offertes}
              />
              <KpiCard
                label="Akkoorden"
                value={data.vandaag.akkoorden}
                prev={data.gisteren.akkoorden}
                spark={data.sparklines.akkoorden}
              />
              <KpiCard
                label="Omzet akkoord"
                value={data.vandaag.omzet}
                prev={data.gisteren.omzet}
                spark={data.sparklines.omzet}
                formatEuro
              />
            </div>
          </section>

          {/* Uur-strip, wanneer gebeurde er iets vandaag ────────── */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Wanneer gebeurde het</div>
            <UurStrip data={data.uurStrip} />
          </section>

          {/* Bronnen-split, alleen vandaag ──────────────────────── */}
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Waar kwamen ze vandaan</div>
            {data.bronnen.length === 0 ? (
              <div className={styles.empty}>
                Nog geen leads vandaag, kanalen rusten even.
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
    </>,
    portalEl,
  )
}

/**
 * Eén KPI-tegel met delta-pill + 7-daags sparkline. `formatEuro` toggelt
 * euro-presentatie aan (alleen voor de omzet-tegel).
 */
function KpiCard({
  label,
  value,
  prev,
  spark,
  formatEuro = false,
}: {
  label: string
  value: number
  prev: number
  spark: number[]
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
      <Sparkline points={spark} />
    </div>
  )
}

/**
 * Mini-sparkline (7 datapunten) als inline SVG. Schaalt naar de max
 * waarde in de set; bij alle-nul tekenen we een platte baseline.
 * Laatste punt krijgt een dot zodat "vandaag" zichtbaar is.
 */
function Sparkline({ points }: { points: number[] }) {
  const w = 100
  const h = 22
  const pad = 2
  const max = Math.max(...points, 1)

  // Bouw x,y-coördinaten, gelijk verdeeld over breedte
  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2)
    const y = h - pad - (v / max) * (h - pad * 2)
    return { x, y }
  })

  const pathD = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ')

  // Fill-path: zelfde lijn maar dichtgemaakt onderaan
  const fillD = `${pathD} L${coords[coords.length - 1].x.toFixed(1)},${h - pad} L${coords[0].x.toFixed(1)},${h - pad} Z`

  const last = coords[coords.length - 1]

  return (
    <svg
      className={styles.sparkWrap}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={fillD} className={styles.sparkFill} />
      <path d={pathD} className={styles.sparkPath} />
      <circle cx={last.x} cy={last.y} r={1.8} className={styles.sparkDot} />
    </svg>
  )
}

/**
 * Uur-strip: 24 bars van 0-23u, hoogte proportional aan event-count.
 * Bars vóór het huidige uur tonen historie (gradient), huidige uur
 * krijgt een ring, toekomstige uren blijven grijs.
 */
function UurStrip({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const currentHour = new Date().getHours()

  return (
    <>
      <div className={styles.uurStrip}>
        {data.map((count, hour) => {
          const ratio = count / max
          const isPast = hour < currentHour
          const isNow = hour === currentHour
          const cls = isNow
            ? `${styles.uurBar} ${styles.uurBarNow}`
            : isPast && count > 0
              ? `${styles.uurBar} ${styles.uurBarPast}`
              : styles.uurBar
          return (
            <div
              key={hour}
              className={cls}
              style={
                {
                  '--uur-h': ratio,
                } as React.CSSProperties
              }
              title={`${hour}:00, ${count} ${count === 1 ? 'event' : 'events'}`}
            />
          )
        })}
      </div>
      <div className={styles.uurAxis}>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </>
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
