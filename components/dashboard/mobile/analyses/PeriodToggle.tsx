'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { PeriodKey } from '@/lib/dashboard/period'
import styles from './PeriodToggle.module.css'

const OPTIONS: Array<{ label: string; key: PeriodKey }> = [
  { label: 'Maand', key: 'deze-maand' },
  { label: 'Kwartaal', key: 'dit-kwartaal' },
  { label: 'Jaar', key: 'dit-jaar' },
]

export function PeriodToggle({ value }: { value: PeriodKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const select = (key: PeriodKey) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', key)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className={styles.toggle} role="tablist" aria-label="Periode">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          className={styles.btn}
          data-active={value === o.key}
          onClick={() => select(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
