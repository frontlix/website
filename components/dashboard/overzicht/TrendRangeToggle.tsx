'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

type Range = '7d' | '28d' | '90d'

const RANGES: ReadonlyArray<{ key: Range; label: string }> = [
  { key: '7d',  label: '7d'  },
  { key: '28d', label: '28d' },
  { key: '90d', label: '90d' },
]

/**
 * Segmented control voor de Lead-instroom chart-range. Schrijft naar
 * `?trend=7d|28d|90d` zodat de server-component de juiste hoeveelheid
 * dagen kan fetchen. Default is '28d' (geen query-param).
 */
export function TrendRangeToggle({ active }: { active: Range }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const hrefFor = (key: Range) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === '28d') params.delete('trend')
    else params.set('trend', key)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="dash-seg" role="tablist" aria-label="Tijdsperiode">
      {RANGES.map((r) => (
        <Link
          key={r.key}
          href={hrefFor(r.key)}
          className={`dash-seg-btn ${active === r.key ? 'active' : ''}`}
          role="tab"
          aria-selected={active === r.key}
          scroll={false}
        >
          {r.label}
        </Link>
      ))}
    </div>
  )
}
