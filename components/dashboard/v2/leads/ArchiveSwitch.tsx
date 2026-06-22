"use client";

// Segment-schakelaar in de Leads-kop (rebrand v2): wisselt tussen de actieve
// leads en het archief. Schrijft/verwijdert de URL-param `archief=1` (de
// server-component leest die en haalt dan de gearchiveerde leads op), net
// zoals LeadsSearch/LeadsFilter met hun params werken. Overige params
// (zoekterm, sortering) blijven behouden bij het wisselen.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Archive, Inbox } from "lucide-react";
import styles from "./ArchiveSwitch.module.css";

export function ArchiveSwitch({ archivedCount }: { archivedCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isArchief = searchParams.get("archief") === "1";

  function go(toArchief: boolean) {
    if (toArchief === isArchief) return;
    const params = new URLSearchParams(searchParams.toString());
    if (toArchief) params.set("archief", "1");
    else params.delete("archief");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className={styles.wrap} role="tablist" aria-label="Leads of archief">
      <button
        type="button"
        role="tab"
        aria-selected={!isArchief}
        className={styles.seg}
        data-on={!isArchief ? "true" : undefined}
        onClick={() => go(false)}
      >
        <Inbox size={14} strokeWidth={2.2} />
        Actief
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isArchief}
        className={styles.seg}
        data-on={isArchief ? "true" : undefined}
        onClick={() => go(true)}
      >
        <Archive size={14} strokeWidth={2.2} />
        Archief
        {archivedCount > 0 ? (
          <span className={styles.badge}>{archivedCount}</span>
        ) : null}
      </button>
    </div>
  );
}
