'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { PeriodKey } from '@/lib/dashboard/period'
import styles from './PeriodSelector.module.css'

const OPTIONS: ReadonlyArray<{ value: PeriodKey; label: string }> = [
  { value: 'deze-week', label: 'Deze week' },
  { value: 'deze-maand', label: 'Deze maand' },
  { value: 'dit-kwartaal', label: 'Dit kwartaal' },
  { value: 'dit-jaar', label: 'Dit jaar' },
  { value: 'all-time', label: 'All-time' },
]

export function PeriodSelector({ value }: { value: PeriodKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as PeriodKey
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'deze-maand') params.delete('period')
    else params.set('period', next)
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>Periode</span>
      <select
        className={styles.select}
        value={value}
        onChange={onChange}
        aria-label="Tijdvenster voor statistieken"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
