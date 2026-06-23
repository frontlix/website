"use client";

// Filter-popover voor de Leads-kop (rebrand v2): Bron, "Alleen urgent" en
// Sorteer op. Schrijft naar de URL-searchParams (bron/urgent/sort) die de
// server-component al toepast via applyLeadsFilters, net als de zoekbalk.
// Port van de (app)-LeadsFilterPanel naar de v2-stijl.

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Zap, Check } from "lucide-react";
import { Toggle } from "@/components/dashboard/v2/ui";
import { ICON_REGISTRY } from "@/components/dashboard/instellingen/tag-icons";
import type { IconKey } from "@/lib/dashboard/tag-presets";
import type { Tag } from "@/lib/dashboard/database.types";
import styles from "./LeadsFilter.module.css";

type Bron = "wa" | "form";
type Sort = "binnen" | "prijs" | "naam" | "fase";

const BRONNEN: ReadonlyArray<{ k: Bron; l: string }> = [
  { k: "wa", l: "WhatsApp" },
  { k: "form", l: "Formulier" },
];

const SORTS: ReadonlyArray<{ k: Sort; l: string }> = [
  { k: "binnen", l: "Binnengekomen" },
  { k: "prijs", l: "Offerteprijs" },
  { k: "naam", l: "Naam (A–Z)" },
  { k: "fase", l: "Fase" },
];

export function LeadsFilter({ allTags }: { allTags: Tag[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const bron = searchParams.get("bron");
  const urgent = searchParams.get("urgent") === "1";
  const sort = (searchParams.get("sort") ?? "binnen") as Sort;

  const selectedTags = (() => {
    const raw = searchParams.get("tags");
    return raw ? raw.split(",").filter(Boolean) : [];
  })();

  const activeCount =
    (bron === "wa" || bron === "form" ? 1 : 0) +
    (urgent ? 1 : 0) +
    (sort !== "binnen" ? 1 : 0) +
    selectedTags.length;

  // Klik-buiten + Escape sluiten het paneel.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Zet/verwijder een param en navigeer (overige params blijven behouden). */
  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleTag(tagId: string) {
    const next = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setParam("tags", next.length > 0 ? next.join(",") : null);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("bron");
    params.delete("urgent");
    params.delete("sort");
    params.delete("tags");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        data-open={open ? "true" : undefined}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal size={15} strokeWidth={2.2} />
        Filters
        {activeCount > 0 ? <span className={styles.badge}>{activeCount}</span> : null}
      </button>

      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Filters">
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Bron</div>
            <div className={styles.segRow}>
              <button
                type="button"
                className={styles.seg}
                data-on={!bron ? "true" : undefined}
                onClick={() => setParam("bron", null)}
              >
                Alle
              </button>
              {BRONNEN.map((b) => (
                <button
                  key={b.k}
                  type="button"
                  className={styles.seg}
                  data-on={bron === b.k ? "true" : undefined}
                  onClick={() => setParam("bron", bron === b.k ? null : b.k)}
                >
                  {b.l}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Snel filter</div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>
                <Zap size={14} strokeWidth={2.2} />
                Alleen urgent
              </span>
              <Toggle
                value={urgent}
                onChange={(v) => setParam("urgent", v ? "1" : null)}
                aria-label="Alleen urgent"
              />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Sorteer op</div>
            <div className={styles.sortList}>
              {SORTS.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  className={styles.sortItem}
                  data-on={sort === s.k ? "true" : undefined}
                  onClick={() => setParam("sort", s.k === "binnen" ? null : s.k)}
                >
                  {s.l}
                  {sort === s.k ? <Check size={14} strokeWidth={2.6} /> : null}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Tags (alle gekozen)</div>
              <div className={styles.sortList}>
                {allTags.map((t) => {
                  const Icon = ICON_REGISTRY[(t.icon as IconKey) ?? "Tag"] ?? ICON_REGISTRY.Tag;
                  const on = selectedTags.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.sortItem}
                      data-on={on ? "true" : undefined}
                      onClick={() => toggleTag(t.id)}
                    >
                      <span style={{ color: t.kleur ?? "#64748b", display: "inline-flex", marginRight: 6 }}>
                        <Icon size={14} strokeWidth={2.2} />
                      </span>
                      {t.naam}
                      {on ? <Check size={14} strokeWidth={2.6} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clearAll}
              disabled={activeCount === 0}
            >
              Wis filters
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
