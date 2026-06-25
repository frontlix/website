'use client'

import { ChevronLeft } from 'lucide-react'
import { initials } from './dossier-helpers'
import type { DossierLead } from './dossier-mock'
import styles from './DossierHeader.module.css'

interface DossierHeaderProps {
  lead: DossierLead
  onBack: () => void
  /** Toont een "Gearchiveerd"-badge in de kop wanneer de lead in het archief zit. */
  archived?: boolean
}

/**
 * DossierHeader, terug-knop ("Leads", primary) + lead-identiteit:
 * 50×50 accent-getinte initialen-avatar, naam (21/800) en een stage-pill
 * ("In gesprek", primary dot+tekst) naast {plaats}. Bij een gearchiveerde lead
 * een grijze "Gearchiveerd"-badge (parity met de desktop-kop).
 */
export function DossierHeader({ lead, onBack, archived = false }: DossierHeaderProps) {
  return (
    <div className={styles.header}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ChevronLeft size={20} aria-hidden="true" />
        Leads
      </button>

      <div className={styles.identity}>
        <div className={styles.avatar} aria-hidden="true">
          {initials(lead.naam)}
        </div>
        <div className={styles.meta}>
          <div className={styles.name}>{lead.naam}</div>
          <div className={styles.metaRow}>
            <span className={lead.handover ? styles.stagePillHandover : styles.stagePill}>
              <span className={lead.handover ? styles.stageDotHandover : styles.stageDot} aria-hidden="true" />
              {lead.stage}
            </span>
            {archived && <span className={styles.archivedBadge}>Gearchiveerd</span>}
            <span className={styles.sub}>{lead.plaats}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
