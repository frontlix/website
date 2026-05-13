'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import {
  Building2,
  Euro,
  Wrench,
  Tag,
  MessageSquare,
  Bell,
  BellRing,
  Users,
} from 'lucide-react'

export type SettingsSection =
  | 'bedrijf'
  | 'prijzen'
  | 'diensten'
  | 'tags'
  | 'opening'
  | 'reminders'
  | 'notificaties'
  | 'team'

const ITEMS: ReadonlyArray<{
  key: SettingsSection
  label: string
  Icon: typeof Building2
}> = [
  { key: 'bedrijf',      label: 'Bedrijfsgegevens', Icon: Building2 },
  { key: 'prijzen',      label: 'Prijzen',          Icon: Euro },
  { key: 'diensten',     label: 'Diensten aanbod',  Icon: Wrench },
  { key: 'tags',         label: 'Tags',             Icon: Tag },
  { key: 'opening',      label: 'Openingsbericht',  Icon: MessageSquare },
  { key: 'reminders',    label: 'Reminders',        Icon: Bell },
  { key: 'notificaties', label: 'Notificaties',     Icon: BellRing },
  { key: 'team',         label: 'Team',             Icon: Users },
]

import styles from './SettingsNav.module.css'

export function SettingsNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = (searchParams.get('section') ?? 'bedrijf') as SettingsSection

  const hrefFor = (key: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'bedrijf') params.delete('section')
    else params.set('section', key)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <nav className={`${styles.nav} dash-card`}>
      {ITEMS.map(({ key, label, Icon }) => (
        <Link
          key={key}
          href={hrefFor(key)}
          className={`${styles.item} ${active === key ? styles.active : ''}`}
          scroll={false}
        >
          <Icon size={14} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
