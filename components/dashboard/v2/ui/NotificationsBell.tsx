"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Inbox, MessageCircle, Star, Calendar } from "lucide-react";
import type { NotifItem } from "@/components/dashboard/NotificationPanel";
import {
  markNotificationReadAction,
  markAllReadAction,
} from "@/lib/dashboard/notifications/read-actions";
import { formatRelative } from "@/lib/dashboard/format";
import styles from "./NotificationsBell.module.css";

/** Icoon per soort melding (zelfde mapping als het oude NotificationPanel). */
const KIND_ICON = {
  lead: Inbox,
  wa: MessageCircle,
  review: Star,
  agenda: Calendar,
} as const;

/** v1-paden (/dashboard/...) omzetten naar het schone app-host-pad (/...); de
 *  middleware serveert daar v2 voor desktop. */
function toV2Href(href: string): string {
  return href.replace(/^\/dashboard/, "") || "/";
}

/**
 * Meldingen-bel voor de v2-topbar. Toont de recente notificaties (digest,
 * nieuwe lead, offerte goedgekeurd, enz.) met een telbadge voor ongelezen,
 * markeert als gelezen bij klik en springt door naar de juiste plek. Hergebruikt
 * de bestaande notificatie-queries + mark-as-read-acties; de feed-data komt via
 * de v2-layout (getV2ShellData) binnen.
 */
export function NotificationsBell({
  items: initialItems,
  unreadCount: initialUnread = 0,
}: {
  items: NotifItem[];
  unreadCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Server-data kan tussen renders vernieuwen (na revalidate): sync de state.
  useEffect(() => {
    setItems(initialItems);
    setUnread(initialUnread);
  }, [initialItems, initialUnread]);

  // Sluit bij klik-buiten + Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleClick = (item: NotifItem) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (item.unread) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, unread: false } : i)));
      setUnread((c) => Math.max(0, c - 1));
    }
    startTransition(async () => {
      if (item.unread) await markNotificationReadAction(item.id);
      router.push(toV2Href(item.href));
    });
  };

  const handleMarkAll = () => {
    if (unread === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })));
    setUnread(0);
    startTransition(async () => {
      await markAllReadAction();
    });
  };

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${styles.bellBtn} ${open ? styles.bellBtnActive : ""}`}
        aria-label="Meldingen"
        aria-expanded={open}
      >
        <Bell size={18} strokeWidth={2} />
        {unread > 0 && <span className={styles.badge}>{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Meldingen">
          <div className={styles.head}>
            <strong className={styles.headTitle}>Meldingen</strong>
            {unread > 0 && (
              <button type="button" className={styles.markAll} onClick={handleMarkAll}>
                Alles gelezen
              </button>
            )}
          </div>
          <div className={styles.list}>
            {items.length === 0 ? (
              <div className={styles.empty}>Nog geen meldingen, alles is bijgewerkt.</div>
            ) : (
              items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <Link
                    key={item.id}
                    href={toV2Href(item.href)}
                    onClick={handleClick(item)}
                    className={`${styles.item} ${item.unread ? styles.itemUnread : ""}`}
                  >
                    <span className={`${styles.itemIcon} ${styles[`kind_${item.kind}`]}`}>
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{item.title}</div>
                      {item.sub && <div className={styles.itemSub}>{item.sub}</div>}
                      <div className={styles.itemTime}>{formatRelative(item.ts)}</div>
                    </div>
                    {item.unread && <span className={styles.dot} aria-hidden />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
