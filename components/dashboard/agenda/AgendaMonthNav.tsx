import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { MonthRef } from '@/lib/dashboard/calendar'
import styles from './AgendaMonthNav.module.css'

function monthHref(ref: MonthRef): string {
  const m = ref.month.toString().padStart(2, '0')
  return `/agenda?month=${ref.year}-${m}`
}

export function AgendaMonthNav({
  prevMonth,
  nextMonth,
  monthLabel,
}: {
  prevMonth: MonthRef
  nextMonth: MonthRef
  monthLabel: string
}) {
  return (
    <div className={styles.nav}>
      <Link
        href={monthHref(prevMonth)}
        className={styles.arrow}
        aria-label="Vorige maand"
      >
        <ChevronLeft size={18} />
        <span className={styles.arrowLabel}>Vorige</span>
      </Link>
      <h1 className={styles.title}>{monthLabel}</h1>
      <div className={styles.right}>
        <Link href="/agenda" className={styles.todayBtn}>
          Vandaag
        </Link>
        <Link
          href={monthHref(nextMonth)}
          className={styles.arrow}
          aria-label="Volgende maand"
        >
          <span className={styles.arrowLabel}>Volgende</span>
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  )
}
