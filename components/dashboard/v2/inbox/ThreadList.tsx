"use client";

import type { Thread } from "../demo-data";
import styles from "./ThreadList.module.css";

interface ThreadListProps {
  threads: Thread[];
  activeId: string;
  /** Ongelezen-teller per thread-id (0 = gelezen). */
  unreadById: Record<string, number>;
  onSelect: (id: string) => void;
}

/** Linkerkolom (330px): de threadlijst met de "X nieuw"-badge en per rij
 *  avatar, naam, tijd, preview en de ongelezen-teller. */
export function ThreadList({
  threads,
  activeId,
  unreadById,
  onSelect,
}: ThreadListProps) {
  const totaalNieuw = threads.reduce(
    (n, t) => n + (unreadById[t.id] ?? t.unread),
    0,
  );

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h1 className={styles.title}>Inbox</h1>
        {totaalNieuw > 0 ? (
          <span className={styles.badge}>{totaalNieuw} nieuw</span>
        ) : null}
      </div>

      <div className={styles.list}>
        {threads.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Geen gesprekken</div>
            <div className={styles.emptySub}>
              Zodra een lead via WhatsApp reageert, verschijnt het hier.
            </div>
          </div>
        ) : (
          threads.map((t) => {
            const isActief = t.id === activeId;
            const unread = unreadById[t.id] ?? t.unread;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t.id)}
                className={`${styles.row} ${isActief ? styles.rowActive : ""}`}
              >
                <span
                  className={`${styles.avatar} ${isActief ? styles.avatarActive : ""}`}
                >
                  {t.initials}
                </span>
                <span className={styles.main}>
                  <span className={styles.topLine}>
                    <span
                      className={`${styles.naam} ${unread ? styles.naamUnread : ""}`}
                    >
                      {t.naam}
                    </span>
                    <span className={styles.tijd}>{t.tijd}</span>
                  </span>
                  <span className={styles.bottomLine}>
                    <span
                      className={`${styles.preview} ${unread ? styles.previewUnread : ""}`}
                    >
                      {t.preview}
                    </span>
                    {unread ? (
                      <span className={styles.unread}>{unread}</span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
