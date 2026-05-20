'use client'

import type { Totalen } from '@/lib/dashboard/btw-calc'
import { KortingKaart } from './KortingKaart'
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
}

/**
 * Sidebar voor de Offerte-tab. Bevat drie kaarten in vaste volgorde:
 *   1. Totalen
 *   2. Korting
 *   3. Verzendopties
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
}: Props) {
  return (
    <aside className={styles.sidebar}>
      <TotalenKaart
        totalen={totalen}
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
    </aside>
  )
}
