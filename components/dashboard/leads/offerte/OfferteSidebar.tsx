'use client'

import type { Totalen } from '@/lib/dashboard/btw-calc'
import type { MargeOverview } from '@/lib/dashboard/marge-calc'
import { KortingKaart } from './KortingKaart'
import { MargeKaart } from './MargeKaart'
import { TotalenKaart } from './TotalenKaart'
import { VerzendoptiesKaart, type VerzendOpties } from './VerzendoptiesKaart'
import styles from './OfferteSidebar.module.css'

type Props = {
  totalen: Totalen
  geldigTot: string | null
  kortingPct: number
  kortingOmschrijving: string
  verzendOpties: VerzendOpties
  fotosCount: number
  onKortingChange: (pct: number, omschrijving: string) => void
  onVerzendOptiesChange: (opties: VerzendOpties) => void
  onPdfClick?: () => void
  onSendClick?: () => void
  versturenDisabled?: boolean
  /**
   * Optionele marge-overview, alleen aanwezig voor owners ná load van
   * kostprijzen. Als undefined wordt de MargeKaart niet gerenderd.
   */
  margeOverview?: MargeOverview
  /** Opent de Kostprijzen-modal, required als margeOverview aanwezig is. */
  onOpenKostprijzen?: () => void
  /** Sluit de MargeKaart (visibility blijft in parent). */
  onCloseMarge?: () => void
}

/**
 * Sidebar voor de Offerte-tab. Bevat de drie standaard-kaarten en, alleen
 * voor owners, een vierde "MargeKaart" onderaan.
 *
 *   1. Totalen
 *   2. Korting
 *   3. Verzendopties
 *   4. (owner-only) MargeKaart
 *
 * Op desktop (>1024px) sticky met top-offset; op mobile (<=1024px)
 * verandert het naar een normale static-stack onder de hoofd-content.
 */
export function OfferteSidebar({
  totalen,
  geldigTot,
  kortingPct,
  kortingOmschrijving,
  verzendOpties,
  fotosCount,
  onKortingChange,
  onVerzendOptiesChange,
  onPdfClick,
  onSendClick,
  versturenDisabled,
  margeOverview,
  onOpenKostprijzen,
  onCloseMarge,
}: Props) {
  return (
    <aside className={styles.sidebar}>
      <TotalenKaart
        totalen={totalen}
        kortingPct={kortingPct}
        geldigTot={geldigTot}
        onPdfClick={onPdfClick}
        onSendClick={onSendClick}
        versturenDisabled={versturenDisabled}
      />
      <KortingKaart
        kortingPct={kortingPct}
        kortingOmschrijving={kortingOmschrijving}
        onChange={onKortingChange}
      />
      <VerzendoptiesKaart
        opties={verzendOpties}
        fotosCount={fotosCount}
        onChange={onVerzendOptiesChange}
      />
      {margeOverview && onOpenKostprijzen ? (
        <MargeKaart
          overview={margeOverview}
          onOpenKostprijzen={onOpenKostprijzen}
          onClose={onCloseMarge}
        />
      ) : null}
    </aside>
  )
}
