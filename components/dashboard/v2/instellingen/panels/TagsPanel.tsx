"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, MapPin, Star, Plus, X, Sparkles } from "lucide-react";
import { createTag, deleteTag, updateTag } from "@/lib/dashboard/tags-actions";
import type { TagWithCount } from "@/lib/dashboard/tags-queries";
import { isValidIcon, type IconKey } from "@/lib/dashboard/tag-presets";
import { DEFAULT_TAG_ICON, ICON_REGISTRY } from "./tag-icons";
import { TagEditorModal, type TagEditorValue } from "./TagEditorModal";
import styles from "./TagsPanel.module.css";

export interface TagsPanelProps {
  /** Tags + lead-usage-count (getTagsWithCounts), systeem-tags eerst. */
  tags: TagWithCount[];
  /** false in de demo-fallback (geen sessie): acties zijn dan no-op. */
  live?: boolean;
}

/**
 * v2 Tags-paneel. Grid-overzicht van alle tags (naam, kleur, icoon, lead-count)
 * + bewerk-modal (maken/bewerken/verwijderen). Port van v1 TagsManager +
 * TagEditor; hergebruikt de bestaande server-actions createTag/updateTag/
 * deleteTag exact (geen nieuwe DB-logica). De SYS-badge blijft als visueel
 * signaal dat Surface deze tag automatisch zet; alle tags zijn verwijderbaar
 * (ontbrekende systeem-tags worden self-healing opnieuw aangemaakt bij refresh).
 *
 * Zonder live-sessie (dev-preview) worden de tags getoond maar zijn de muterende
 * knoppen no-op zodat de demo-fallback blijft renderen.
 */

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; tag: TagWithCount };

export function TagsPanel({ tags: initialTags, live = true }: TagsPanelProps) {
  const [tags, setTags] = useState<TagWithCount[]>(initialTags);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onEditorSave = (value: TagEditorValue): Promise<void> => {
    return new Promise((resolve) => {
      setEditorError(null);

      // Demo-fallback: zonder sessie schrijven we niets weg, maar houden we de
      // grid lokaal consistent zodat de preview blijft werken.
      if (!live) {
        if (editor?.mode === "create") {
          setTags((prev) => [
            ...prev,
            {
              id: `demo-${Date.now()}`,
              naam: value.naam,
              kleur: value.kleur,
              icon: value.icon,
              aangemaakt_op: new Date().toISOString(),
              count: 0,
              isSystem: false,
            },
          ]);
        } else if (editor?.mode === "edit") {
          const target = editor.tag;
          setTags((prev) =>
            prev.map((t) =>
              t.id === target.id
                ? { ...t, naam: value.naam, kleur: value.kleur, icon: value.icon }
                : t,
            ),
          );
        }
        setEditor(null);
        resolve();
        return;
      }

      startTransition(async () => {
        if (editor?.mode === "create") {
          const result = await createTag({
            naam: value.naam,
            kleur: value.kleur,
            icon: value.icon,
          });
          if (!result.ok) {
            setEditorError(result.error);
            resolve();
            return;
          }
          setTags((prev) => [
            ...prev,
            {
              id: result.tag.id,
              naam: result.tag.naam,
              kleur: result.tag.kleur,
              icon: result.tag.icon,
              aangemaakt_op: result.tag.aangemaakt_op,
              count: 0,
              isSystem: false,
            },
          ]);
          setEditor(null);
        } else if (editor?.mode === "edit") {
          const target = editor.tag;
          const result = await updateTag({
            id: target.id,
            naam: value.naam,
            kleur: value.kleur,
            icon: value.icon,
          });
          if (!result.ok) {
            setEditorError(result.error);
            resolve();
            return;
          }
          setTags((prev) =>
            prev.map((t) =>
              t.id === target.id
                ? { ...t, naam: value.naam, kleur: value.kleur, icon: value.icon }
                : t,
            ),
          );
          setEditor(null);
        }
        resolve();
      });
    });
  };

  const onDelete = (tag: TagWithCount) => {
    setError(null);
    const prevTags = tags;
    setTags((curr) => curr.filter((t) => t.id !== tag.id));

    if (!live) return; // demo-fallback: enkel lokale grid-update

    startTransition(async () => {
      const result = await deleteTag(tag.id);
      if (!result.ok) {
        setTags(prevTags); // rollback
        setError(result.error);
      }
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        {error && <div className={styles.errorInline}>{error}</div>}
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => {
            setError(null);
            setEditorError(null);
            setEditor({ mode: "create" });
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Nieuwe tag
        </button>
      </div>

      <div className={styles.grid}>
        {tags.length === 0 && (
          <div className={styles.empty}>Nog geen tags aangemaakt.</div>
        )}
        {tags.map((tag) => (
          <TagCard
            key={tag.id}
            tag={tag}
            onEdit={() => {
              setError(null);
              setEditorError(null);
              setEditor({ mode: "edit", tag });
            }}
            onDelete={() => onDelete(tag)}
            disabled={pending}
          />
        ))}
      </div>

      <div className={styles.info}>
        <Sparkles size={14} className={styles.infoIcon} />
        <span>
          <strong>Systeem-tags</strong> ({renderSystemList()}) worden automatisch
          door Surface gezet op basis van bot-detectie. Je kunt ze verwijderen,
          hernoemen of een andere kleur geven, bij het verversen van deze pagina
          worden ontbrekende systeem-tags opnieuw aangemaakt.
        </span>
      </div>

      {editor && (
        <TagEditorModal
          mode={editor.mode}
          initial={
            editor.mode === "edit"
              ? {
                  naam: editor.tag.naam,
                  kleur: editor.tag.kleur,
                  icon: isValidIcon(editor.tag.icon) ? editor.tag.icon : null,
                }
              : null
          }
          onSave={onEditorSave}
          onClose={() => setEditor(null)}
          externalError={editorError}
          saving={pending}
        />
      )}
    </div>
  );
}

function renderSystemList(): React.ReactNode {
  const items: Array<{
    name: string;
    Icon: React.ComponentType<{ size?: number }> | null;
  }> = [
    { name: "Korting", Icon: AlertTriangle },
    { name: "Buiten radius", Icon: MapPin },
    { name: "Review", Icon: Star },
  ];
  return items.map((it, idx) => (
    <span key={it.name} className={styles.infoTag}>
      {it.Icon && <it.Icon size={11} />}
      {it.name}
      {idx < items.length - 1 ? ", " : ""}
    </span>
  ));
}

function TagCard({
  tag,
  onEdit,
  onDelete,
  disabled,
}: {
  tag: TagWithCount;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const Icon = isValidIcon(tag.icon)
    ? ICON_REGISTRY[tag.icon as IconKey]
    : DEFAULT_TAG_ICON;
  const kleur = tag.kleur;
  const pillBg = kleur ? `${kleur}1a` : "var(--rb-field-2)";
  const pillFg = kleur ?? "var(--rb-ink)";
  const pillBorder = kleur ? `${kleur}40` : "var(--rb-line)";

  return (
    <div className={styles.card}>
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className={styles.pill}
        style={{
          background: pillBg,
          color: pillFg,
          borderColor: pillBorder,
        }}
        title="Bewerk tag"
      >
        <Icon size={11} />
        <span>{tag.naam}</span>
      </button>
      <div className={styles.count}>
        {tag.count === 0
          ? "nog niet gebruikt"
          : `${tag.count} lead${tag.count === 1 ? "" : "s"}`}
      </div>
      {tag.isSystem && <span className={styles.sysBadge}>SYS</span>}
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Verwijder tag ${tag.naam}`}
        title="Verwijderen"
      >
        <X size={14} />
      </button>
    </div>
  );
}
