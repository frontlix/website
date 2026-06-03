'use client'

import { ChevronRight, MapPin } from 'lucide-react'
import styles from './VandaagBlock.module.css'

export type VandaagItem = {
  id: string
  tijd: string // "10:30"
  duur: string // "45m" of "3u"
  type: 'PLAATSBEZOEK' | 'KLUS' | 'AFSPRAAK'
  naam: string
  adres: string // "Wilhelminapark 12 · Utrecht"
  status: 'NU' | 'VOLGENDE' | 'LATER'
}

type Props = {
  items: VandaagItem[]
  totalKm?: number
  totalDuur?: string // "7u 25m"
  onOpenAll: () => void
}

/**
 * VandaagBlock, "Vandaag" preview met optionele totaal-kaart (km + duur)
 * en top-3 route-stops. Toont status-tag (NU/VOLGENDE/LATER) per item.
 */
export function VandaagBlock({
  items,
  totalKm,
  totalDuur,
  onOpenAll,
}: Props) {
  return (
    <section className={styles.block}>
      <div className={styles.head}>
        <h2 className={styles.title}>Vandaag</h2>
        <button
          type="button"
          onClick={onOpenAll}
          className={styles.allLink}
        >
          Alles ({items.length}) <ChevronRight size={14} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Geen afspraken vandaag.</p>
      ) : (
        <>
          {totalKm != null && totalDuur && (
            <div className={styles.totalCard}>
              <span className={styles.totalLabel}>Totaal vandaag</span>
              <span className={styles.totalValue}>
                {totalKm} km · {totalDuur}
              </span>
            </div>
          )}
          <ul className={styles.list}>
            {items.slice(0, 3).map((item) => (
              <li key={item.id} className={styles.row}>
                <span className={styles.tijdCol}>
                  <span className={styles.tijd}>{item.tijd}</span>
                  <span className={styles.duur}>{item.duur}</span>
                </span>
                <span className={styles.text}>
                  <span
                    className={styles.statusTag}
                    data-status={item.status}
                  >
                    {item.status}
                  </span>
                  <span className={styles.name}>{item.naam}</span>
                  <span className={styles.adres}>
                    <MapPin size={12} /> {item.adres}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
