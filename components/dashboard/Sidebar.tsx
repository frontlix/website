import Link from 'next/link'
import {
  LayoutGrid,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { href: '/leads', label: 'Leads', Icon: LayoutGrid },
  { href: '/agenda', label: 'Agenda', Icon: Calendar },
  { href: '/statistieken', label: 'Statistieken', Icon: BarChart3 },
  { href: '/instellingen', label: 'Instellingen', Icon: Settings },
]

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={styles.link}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
