'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import {
  NOTIF_KIND_ICON,
  type NotifItem,
} from '@/components/dashboard/NotificationPanel'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { formatRelative } from '@/lib/dashboard/format'
import styles from './MobileNotificationsSheet.module.css'

type Props = {
  items: NotifItem[]
  unreadCount: number
  onClose: () => void
}

/**
 * MobileNotificationsSheet — full-screen sheet (slide-up vanaf bottom)
 * rond de NotificationPanel-lijst.
 *
 * Wordt vanaf HeaderActions geopend op mobile. Hergebruikt
 * `NOTIF_KIND_ICON` + `formatRelative` zodat de visual-mapping
 * gelijk loopt met de desktop-NotificationPanel.
 *
 * NB: bewust GEEN server-action voor mark-as-read in deze sheet —
 * de tap op een item navigeert via `<Link>` en sluit de sheet; een
 * volgende parent-render zal de notif uit de unread-lijst verwijderen
 * zodra de server-data ververst is. Dit houdt de sheet dom + simpel.
 */
export function MobileNotificationsSheet({ items, unreadCount, onClose }: Props) {
  useBodyScrollLock(true)

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Notificaties">
      {/* Backdrop = button zodat 'ie keyboard-toegankelijk is (Enter/Space → onClose). */}
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Sluit notificaties"
      />

      <section className={styles.sheet}>
        <header className={styles.head}>
          <h2 className={styles.title}>
            Notificaties
            {unreadCount > 0 && (
              <span className={styles.count}>{unreadCount} nieuw</span>
            )}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Sluit"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.body}>
          {items.length === 0 ? (
            <p className={styles.empty}>Geen notificaties.</p>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => {
                const Icon = NOTIF_KIND_ICON[item.kind]
                const rowCls = `${styles.item} ${item.unread ? styles.itemUnread : ''}`
                return (
                  <li key={item.id}>
                    <Link href={item.href} className={rowCls} onClick={onClose}>
                      <span className={styles.itemIcon}>
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <div className={styles.itemBody}>
                        <div className={styles.itemTitle}>{item.title}</div>
                        {item.sub && <div className={styles.itemSub}>{item.sub}</div>}
                      </div>
                      <span className={styles.itemTs}>{formatRelative(item.ts)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
