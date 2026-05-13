'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { AlertTriangle, Bot } from 'lucide-react'

export type InboxFilter = 'all' | 'unread' | 'action' | 'bot'

const TABS: ReadonlyArray<{
  key: InboxFilter
  label: string
  Icon?: typeof AlertTriangle
}> = [
  { key: 'all',    label: 'Alles' },
  { key: 'unread', label: 'Ongelezen' },
  { key: 'action', label: 'Actie', Icon: AlertTriangle },
  { key: 'bot',    label: 'Bot',    Icon: Bot },
]

export function InboxFilterTabs({
  counts,
}: {
  counts: Record<InboxFilter, number>
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = (searchParams.get('filter') ?? 'all') as InboxFilter

  const hrefFor = (key: InboxFilter) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'all') params.delete('filter')
    else params.set('filter', key)
    // Behoud de geselecteerde lead — anders verspringt de hoofd-pane.
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="dash-tab-bar" role="tablist" style={{ marginBottom: 0 }}>
      {TABS.map(({ key, label, Icon }) => (
        <Link
          key={key}
          href={hrefFor(key)}
          className={`dash-tab ${active === key ? 'active' : ''}`}
          role="tab"
          aria-selected={active === key}
          scroll={false}
        >
          {Icon && <Icon size={12} />}
          <span>{label}</span>
          <span className="dash-tab-count">{counts[key]}</span>
        </Link>
      ))}
    </div>
  )
}
