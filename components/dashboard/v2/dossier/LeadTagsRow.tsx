// components/dashboard/v2/dossier/LeadTagsRow.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { addTagToLead, removeTagFromLead } from "@/lib/dashboard/tag-actions";
import { ICON_REGISTRY } from "@/components/dashboard/instellingen/tag-icons";
import type { IconKey } from "@/lib/dashboard/tag-presets";
import type { Tag } from "@/lib/dashboard/database.types";
import styles from "./LeadTagsRow.module.css";

interface LeadTagsRowProps {
  leadId: string;
  leadTags: Tag[];
  allTags: Tag[];
  /** false in demo-fallback (geen sessie): chips zijn read-only. */
  live: boolean;
}

function TagIcon({ tag }: { tag: Tag }) {
  const Icon = ICON_REGISTRY[(tag.icon as IconKey) ?? "Tag"] ?? ICON_REGISTRY.Tag;
  return <Icon size={12} strokeWidth={2.2} />;
}

export function LeadTagsRow({ leadId, leadTags, allTags, live }: LeadTagsRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Klik-buiten + Escape sluiten de toevoeg-dropdown.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
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

  const leadTagIds = new Set(leadTags.map((t) => t.id));
  const beschikbaar = allTags.filter((t) => !leadTagIds.has(t.id));

  function add(tagId: string) {
    setOpen(false);
    startTransition(async () => {
      const res = await addTagToLead(leadId, tagId);
      if (res.ok) router.refresh();
    });
  }

  function remove(tagId: string) {
    startTransition(async () => {
      const res = await removeTagFromLead(leadId, tagId);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className={styles.row} ref={wrapRef}>
      {leadTags.map((t) => (
        <span
          key={t.id}
          className={styles.chip}
          style={{ borderColor: t.kleur ?? "#64748b", color: t.kleur ?? "#64748b" }}
        >
          <TagIcon tag={t} />
          {t.naam}
          {live ? (
            <button
              type="button"
              className={styles.chipX}
              onClick={() => remove(t.id)}
              disabled={pending}
              aria-label={`Tag ${t.naam} verwijderen`}
            >
              <X size={11} strokeWidth={2.6} />
            </button>
          ) : null}
        </span>
      ))}

      {live ? (
        <div className={styles.adder}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setOpen((v) => !v)}
            disabled={pending}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <Plus size={13} strokeWidth={2.4} />
            tag
          </button>
          {open ? (
            <div className={styles.menu} role="menu">
              {beschikbaar.length === 0 ? (
                <div className={styles.menuEmpty}>
                  Geen tags beschikbaar. Maak nieuwe tags in Instellingen.
                </div>
              ) : (
                beschikbaar.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={styles.menuItem}
                    onClick={() => add(t.id)}
                    role="menuitem"
                  >
                    <span style={{ color: t.kleur ?? "#64748b", display: "inline-flex" }}>
                      <TagIcon tag={t} />
                    </span>
                    {t.naam}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
