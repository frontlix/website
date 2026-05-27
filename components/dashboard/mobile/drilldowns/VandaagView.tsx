'use client'

import { MapPin, Phone, FileText } from 'lucide-react'
import { MobileDrilldownLayer } from './MobileDrilldownLayer'
import type { VandaagItem } from '../overzicht/VandaagBlock'
import styles from './VandaagView.module.css'

type Props = {
  open: boolean
  onClose: () => void
  items: VandaagItem[]
  totalKm: number // required in drilldown — page-integratie levert default 0
  totalDuur: string // bv. "7u 25m"
  dayLabel: string // bv. "don 28 nov · 10:30 – 17:30"
  route: string // bv. "Bilthoven → Zeist → Utrecht"
  onOpenMap?: () => void
  onNavigate?: (id: string) => void
  onCall?: (id: string) => void
  onOpenLead?: (id: string) => void
}

/**
 * VandaagView — drilldown vanuit het Vandaag-block op het overzicht.
 *
 * Toont een totaal-card (route-overzicht: km + duur + steden) en een
 * timeline van stops met per-stop status-tag, tijd, type-label, naam,
 * adres en 3 actieknoppen (Navigatie / Bellen / Lead).
 *
 * Timeline-lijn loopt alleen tussen stops, niet voorbij de laatste —
 * vandaar `i < items.length - 1`.
 */
export function VandaagView({
  open,
  onClose,
  items,
  totalKm,
  totalDuur,
  dayLabel,
  route,
  onOpenMap,
  onNavigate,
  onCall,
  onOpenLead,
}: Props) {
  return (
    <MobileDrilldownLayer
      open={open}
      title={`Vandaag · ${items.length} stops`}
      subtitle={dayLabel}
      onClose={onClose}
      rightAction={
        <button type="button" className={styles.mapBtn} onClick={onOpenMap}>
          Kaart
        </button>
      }
    >
      <section className={styles.totalCard}>
        <div className={styles.mapIcon} aria-hidden="true">
          📍
        </div>
        <div className={styles.totalText}>
          <div className={styles.totalLabel}>Totaal vandaag</div>
          <div className={styles.totalValue}>
            {totalKm} km · {totalDuur}
          </div>
          <div className={styles.route}>{route}</div>
        </div>
      </section>

      <h3 className={styles.sectionTitle}>STOPS</h3>

      <ol className={styles.timeline}>
        {items.map((item, i) => (
          <li key={item.id} className={styles.stop}>
            <span
              className={styles.dot}
              data-status={item.status}
              aria-hidden="true"
            />
            {i < items.length - 1 && (
              <span className={styles.line} aria-hidden="true" />
            )}

            <article className={styles.stopCard}>
              <div className={styles.stopHead}>
                <span className={styles.stopTag} data-status={item.status}>
                  {item.status}
                </span>
                <span className={styles.stopTime}>{item.tijd}</span>
                <span className={styles.stopDuration}>· {item.duur}</span>
                <span className={styles.stopType}>{item.type}</span>
              </div>
              <div className={styles.stopName}>{item.naam}</div>
              <div className={styles.stopAdres}>
                <MapPin size={12} /> {item.adres}
              </div>
              <div className={styles.stopActions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => onNavigate?.(item.id)}
                >
                  <MapPin size={14} /> Navigatie
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => onCall?.(item.id)}
                >
                  <Phone size={14} /> Bellen
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => onOpenLead?.(item.id)}
                >
                  <FileText size={14} /> Lead
                </button>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </MobileDrilldownLayer>
  )
}
