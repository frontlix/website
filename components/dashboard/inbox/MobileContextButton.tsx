'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { MobileSheet } from '@/components/dashboard/ui/MobileSheet'
import { LeadContextPane } from './LeadContextPane'
import styles from './MobileContextButton.module.css'

// Gebruik dezelfde props als LeadContextPane via type-import — voorkomt
// handmatige duplicatie en blijft automatisch in sync als de interface wijzigt.
type LeadContextPaneProps = React.ComponentProps<typeof LeadContextPane>

export function MobileContextButton(props: LeadContextPaneProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={styles.btn}
        onClick={() => setOpen(true)}
        aria-label="Lead-info"
      >
        <Info size={18} />
      </button>
      <MobileSheet open={open} onClose={() => setOpen(false)} title="Lead-info">
        <LeadContextPane {...props} />
      </MobileSheet>
    </>
  )
}
