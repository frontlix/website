'use client'

import { ChevronLeft } from 'lucide-react'
import { initials } from './dossier-helpers'
import type { DossierLead } from './dossier-mock'
import styles from './DossierHeader.module.css'

interface DossierHeaderProps {
  lead: DossierLead
  onBack: () => void
}

/**
 * DossierHeader, terug-knop ("Leads", primary) + lead-identiteit:
 * 50×50 accent-getinte initialen-avatar, naam (21/800) en een stage-pill
 * ("In gesprek", primary dot+tekst) naast {plaats} · {id}.
 */
export function DossierHeader({ lead, onBack }: DossierHeaderProps) {
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
            <span className={styles.stagePill}>
              <span className={styles.stageDot} aria-hidden="true" />
              {lead.stage}
            </span>
            <span className={styles.sub}>
              {lead.plaats} · {lead.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
