'use client'

import { X } from 'lucide-react'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import styles from './MobileNotificationsSheet.module.css'

type Props = {
  items: NotifItem[]
  unreadCount: number
  onClose: () => void
}

/**
 * Full-screen sheet wrapper rond de NotificationPanel-lijst.
 * Wordt vanaf HeaderActions geopend op mobile.
 *
 * NB: dit is een placeholder-rendering — definitieve item-rendering
 * (per NotifItem-type met server-actions voor mark-as-read) komt in
 * Phase 4. Voor nu toont 'ie de raw items zodat de mount/close-flow
 * werkt en de parent-integratie getest kan worden.
 */
export function MobileNotificationsSheet({ items, unreadCount, onClose }: Props) {
  useBodyScrollLock(true)

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Notificaties">
      {/* Backdrop — tap-to-close. */}
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
              <span className={styles.count}>({unreadCount})</span>
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
            <p className={styles.empty}>
              Nog geen meldingen — alles is bijgewerkt.
            </p>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`${styles.item} ${item.unread ? styles.itemUnread : ''}`}
                >
                  <div className={styles.itemTitle}>{item.title}</div>
                  {item.sub && <div className={styles.itemSub}>{item.sub}</div>}
                  <div className={styles.itemMeta}>
                    <span className={styles.itemKind}>{item.kind}</span>
                    <span className={styles.itemTs}>{item.ts}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
