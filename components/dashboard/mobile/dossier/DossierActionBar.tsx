'use client'

import { Phone, MessageCircle, FileText } from 'lucide-react'
import styles from './DossierActionBar.module.css'

// primaryLabel laat de send-knop van label wisselen: op de Offerte-tab tonen we
// 'Controleer & stuur' (opent de PDF-preview), elders de default 'Stuur offerte'.
type Props = {
  onCall?: () => void
  onWhatsApp?: () => void
  onSendOfferte?: () => void
  primaryLabel?: string
}

export function DossierActionBar({
  onCall,
  onWhatsApp,
  onSendOfferte,
  primaryLabel = 'Stuur offerte',
}: Props) {
  return (
    <div className={styles.bar}>
      <button type="button" className={styles.iconBtn} onClick={onCall} aria-label="Bel">
        <Phone size={18} aria-hidden="true" />
      </button>
      <button type="button" className={styles.waBtn} onClick={onWhatsApp} aria-label="WhatsApp">
        <MessageCircle size={18} aria-hidden="true" />
      </button>
      <button type="button" className={styles.sendBtn} onClick={onSendOfferte}>
        <FileText size={16} aria-hidden="true" />
        {primaryLabel}
      </button>
    </div>
  )
}
