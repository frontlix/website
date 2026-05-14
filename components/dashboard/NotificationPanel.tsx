'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, MessageCircle, Star, Calendar, Inbox } from 'lucide-react'
import { formatRelative } from '@/lib/dashboard/format'
import styles from './NotificationPanel.module.css'

export type NotifItem = {
  id: string
  kind: 'lead' | 'wa' | 'review' | 'agenda'
  title: string
  sub?: string
  href: string
  ts: string  // ISO
  unread?: boolean
}

const KIND_ICON = {
  lead:   Inbox,
  wa:     MessageCircle,
  review: Star,
  agenda: Calendar,
} as const

export function NotificationPanel({ items }: { items: NotifItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unreadCount = items.filter((i) => i.unread).length

  // Close on outside-click + Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={styles.bellBtn}
        aria-label="Notificaties"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className={styles.dot} />}
      </button>

      {open && (
        <div className={styles.panel} role="dialog">
          <div className={styles.header}>
            <strong>Notificaties</strong>
            {unreadCount > 0 && <span className={styles.unreadCount}>{unreadCount} nieuw</span>}
          </div>
          <div className={styles.list}>
            {items.length === 0 ? (
              <div className={styles.empty}>Nog geen meldingen — alles is bijgewerkt.</div>
            ) : (
              items.map((item) => {
                const Icon = KIND_ICON[item.kind]
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`${styles.item} ${item.unread ? styles.itemUnread : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.itemIcon}>
                      <Icon size={14} />
                    </span>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{item.title}</div>
                      {item.sub && <div className={styles.itemSub}>{item.sub}</div>}
                      <div className={styles.itemTime}>{formatRelative(item.ts)}</div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
          <Link href="/" className={styles.footer} onClick={() => setOpen(false)}>
            Alles bekijken
          </Link>
        </div>
      )}
    </div>
  )
}
