'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import styles from './LeadDetailTabs.module.css'

type TabKey = 'gesprek' | 'activiteit'

export function LeadDetailTabs({
  gesprek,
  activiteit,
}: {
  gesprek: React.ReactNode
  activiteit: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const active: TabKey =
    searchParams.get('tab') === 'activiteit' ? 'activiteit' : 'gesprek'

  // Behoud andere search-params (bv. een toekomstige filter binnen detail)
  const buildHref = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'gesprek') params.delete('tab')
    else params.set('tab', tab)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist">
        <Link
          href={buildHref('gesprek')}
          className={`${styles.tab} ${active === 'gesprek' ? styles.active : ''}`}
          role="tab"
          aria-selected={active === 'gesprek'}
          scroll={false}
        >
          Gesprek
        </Link>
        <Link
          href={buildHref('activiteit')}
          className={`${styles.tab} ${active === 'activiteit' ? styles.active : ''}`}
          role="tab"
          aria-selected={active === 'activiteit'}
          scroll={false}
        >
          Activiteit
        </Link>
      </div>
      <div className={styles.panel} role="tabpanel">
        {active === 'gesprek' ? gesprek : activiteit}
      </div>
    </div>
  )
}
