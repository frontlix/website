'use client'

import { useEffect, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import styles from './MobileDrilldownLayer.module.css'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  rightAction?: ReactNode
}

/**
 * Shared transitie-laag voor alle mobile drilldowns (WatNu/Vandaag/Activiteit).
 *
 * Browser-back integratie:
 * - Bij open `history.pushState({ drilldown: true }, '', current-url)` zodat een
 *   hardware-back-knop een popstate triggert die de drilldown sluit i.p.v.
 *   de page te verlaten.
 * - `popstate`-listener: als de pop een non-drilldown state terugbrengt → onClose().
 *   Geen eigen history.back() in die handler (anders krijg je een infinite loop).
 * - `handleClose`: als history.state.drilldown bestaat → history.back() (triggert
 *   popstate-handler die onClose roept). Anders → direct onClose() als safety net.
 *
 * URL blijft `/dashboard` — geen route-change, geen analytics-noise.
 *
 * Wachtwaard: het pushState-effect runt alleen op overgang naar open=true en
 * cleanup bij open=false. We pushen niet bij elke render.
 */
export function MobileDrilldownLayer({
  open,
  title,
  subtitle,
  onClose,
  children,
  rightAction,
}: Props) {
  useEffect(() => {
    if (!open) return
    history.pushState({ drilldown: true }, '', window.location.href)

    const onPop = (e: PopStateEvent) => {
      // State zonder drilldown-vlag = user navigeerde "weg" van de drilldown.
      // We sluiten — zonder zelf history.back() te roepen om loops te voorkomen.
      if (!e.state?.drilldown) onClose()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
    }
  }, [open, onClose])

  const handleClose = () => {
    if (typeof window !== 'undefined' && history.state?.drilldown) {
      history.back() // triggert popstate → onClose
    } else {
      onClose()
    }
  }

  return (
    <div
      className={`${styles.layer} ${open ? styles.open : ''}`}
      aria-hidden={!open}
    >
      <header className={styles.navbar}>
        <button type="button" onClick={handleClose} className={styles.backBtn}>
          <ChevronLeft size={20} />
          Terug
        </button>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
        <div className={styles.rightSlot}>{rightAction}</div>
      </header>

      <div className={styles.content}>{children}</div>
    </div>
  )
}
