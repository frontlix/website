'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, MessageCircle, Star, Calendar, Inbox } from 'lucide-react'
import { formatRelative } from '@/lib/dashboard/format'
import {
  markNotificationReadAction,
  markAllReadAction,
} from '@/lib/dashboard/notifications/read-actions'
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

export function NotificationPanel({
  items: initialItems,
  unreadCount: initialUnreadCount = 0,
}: {
  items: NotifItem[]
  unreadCount?: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(initialItems)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  // Server-data kan veranderen tussen renders (na navigation revalidate);
  // sync de state als de props vernieuwd komen.
  useEffect(() => {
    setItems(initialItems)
    setUnreadCount(initialUnreadCount)
  }, [initialItems, initialUnreadCount])

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

  /**
   * Klik op een notificatie: markeer als gelezen + navigeer.
   * Optimistic: badge gaat direct omlaag, server-call vuurt async af.
   * We voorkomen dat Link al z'n eigen navigatie doet door e.preventDefault
   * en handmatig router.push — dat geeft ons controle over de volgorde.
   */
  const handleItemClick = (item: NotifItem) => (e: React.MouseEvent) => {
    if (!item.unread) return // niets te doen, gewoon Link laten navigeren

    e.preventDefault()
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, unread: false } : i)),
    )
    setUnreadCount((c) => Math.max(0, c - 1))
    setOpen(false)
    startTransition(async () => {
      await markNotificationReadAction(item.id)
      router.push(item.href)
    })
  }

  const handleMarkAll = () => {
    if (unreadCount === 0) return
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })))
    setUnreadCount(0)
    startTransition(async () => {
      await markAllReadAction()
    })
  }

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
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.panel} role="dialog">
          <div className={styles.header}>
            <strong>Notificaties</strong>
            {unreadCount > 0 && (
              <>
                <span className={styles.unreadCount}>{unreadCount} nieuw</span>
                <button
                  type="button"
                  className={styles.markAllBtn}
                  onClick={handleMarkAll}
                >
                  Alles gelezen
                </button>
              </>
            )}
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
                    onClick={handleItemClick(item)}
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
        </div>
      )}
    </div>
  )
}
