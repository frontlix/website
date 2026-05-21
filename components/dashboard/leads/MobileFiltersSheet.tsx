'use client'
import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { MobileSheet } from '@/components/dashboard/ui/MobileSheet'
import { LeadsFilterTabs } from './LeadsFilterTabs'
import { WebChatToggle } from './WebChatToggle'
import styles from './MobileFiltersSheet.module.css'

// Props matchen wat zowel LeadsFilterTabs als WebChatToggle nodig hebben.
type FilterTabsProps = React.ComponentProps<typeof LeadsFilterTabs>
type WebChatProps = React.ComponentProps<typeof WebChatToggle>

export interface MobileFiltersSheetProps {
  filterTabs: FilterTabsProps
  webChat: WebChatProps
}

export function MobileFiltersSheet({ filterTabs, webChat }: MobileFiltersSheetProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label="Filters"
      >
        <SlidersHorizontal size={16} />
        <span>Filters</span>
      </button>
      <MobileSheet open={open} onClose={() => setOpen(false)} title="Filters">
        <div className={styles.section}>
          <LeadsFilterTabs {...filterTabs} />
        </div>
        <div className={styles.section}>
          <WebChatToggle {...webChat} />
        </div>
      </MobileSheet>
    </>
  )
}
