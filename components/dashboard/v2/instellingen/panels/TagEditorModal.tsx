"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/dashboard/v2/ui";
import {
  COLOR_OPTIONS,
  ICON_OPTIONS,
  type IconKey,
} from "@/lib/dashboard/tag-presets";
import { DEFAULT_TAG_ICON, ICON_REGISTRY } from "./tag-icons";
import styles from "./TagsPanel.module.css";

/**
 * v2-modal voor aanmaken/bewerken van een tag. Naam-input, 10 kleur-swatches
 * en 20 icon-knoppen (uit het icon-register) + live preview van de pill. Puur
 * form-state; de async-save/optimistic-logica zit in TagsPanel. Port van v1
 * TagEditor, nu binnen de v2 Modal-primitive (overlay, Esc, klik-buiten).
 */

export type TagEditorValue = {
  naam: string;
  kleur: string | null;
  icon: IconKey | null;
};

interface TagEditorModalProps {
  mode: "create" | "edit";
  initial: Partial<TagEditorValue> | null;
  onSave: (value: TagEditorValue) => Promise<void>;
  onClose: () => void;
  /** Foutmelding van de parent (server-zijde) om hier weer te geven. */
  externalError?: string | null;
  /** True wanneer er een save bezig is, disabled state. */
  saving?: boolean;
}

export function TagEditorModal({
  mode,
  initial,
  onSave,
  onClose,
  externalError,
  saving,
}: TagEditorModalProps) {
  const [naam, setNaam] = useState(initial?.naam ?? "");
  const [kleur, setKleur] = useState<string | null>(initial?.kleur ?? null);
  const [icon, setIcon] = useState<IconKey | null>(initial?.icon ?? null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const trimmed = naam.trim();
  const canSave = trimmed.length > 0 && !saving;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    void onSave({ naam: trimmed, kleur, icon });
  };

  const PreviewIcon = icon ? ICON_REGISTRY[icon] : DEFAULT_TAG_ICON;
  const previewBg = kleur ? `${kleur}1a` : "var(--rb-field-2)";
  const previewFg = kleur ?? "var(--rb-ink)";
  const previewBorder = kleur ? `${kleur}40` : "var(--rb-line)";

  return (
    <Modal
      open
      onClose={() => {
        if (!saving) onClose();
      }}
      width={460}
      label={mode === "create" ? "Nieuwe tag" : "Tag bewerken"}
    >
      <form className={styles.editor} onSubmit={onSubmit}>
        <h3 className={styles.editorTitle}>
          {mode === "create" ? "Nieuwe tag" : "Tag bewerken"}
        </h3>

        {/* Naam */}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Naam</span>
          <input
            ref={nameRef}
            type="text"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="bv. VIP-klant"
            maxLength={32}
            disabled={saving}
            className={styles.input}
          />
        </label>

        {/* Kleur */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Kleur</span>
          <div className={styles.swatchRow}>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setKleur(c)}
                className={`${styles.swatch} ${kleur === c ? styles.swatchActive : ""}`}
                style={{ background: c }}
                disabled={saving}
                aria-label={`Kies kleur ${c}`}
                title={c}
              />
            ))}
            <button
              type="button"
              onClick={() => setKleur(null)}
              className={`${styles.swatchClear} ${kleur === null ? styles.swatchActive : ""}`}
              disabled={saving}
              title="Geen kleur"
              aria-label="Geen kleur"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Icoon */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Icoon</span>
          <div className={styles.iconGrid}>
            {ICON_OPTIONS.map((key) => {
              const Icon = ICON_REGISTRY[key];
              const active = icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  className={`${styles.iconBtn} ${active ? styles.iconBtnActive : ""}`}
                  disabled={saving}
                  aria-label={key}
                  title={key}
                >
                  <Icon size={15} />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIcon(null)}
              className={`${styles.iconBtn} ${icon === null ? styles.iconBtnActive : ""}`}
              disabled={saving}
              title="Geen icoon"
              aria-label="Geen icoon"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Voorbeeld</span>
          <div
            className={styles.preview}
            style={{
              background: previewBg,
              color: previewFg,
              borderColor: previewBorder,
            }}
          >
            <PreviewIcon size={11} />
            <span>{trimmed || "Tag-naam"}</span>
          </div>
        </div>

        {externalError && <div className={styles.error}>{externalError}</div>}

        <div className={styles.foot}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancel}
            disabled={saving}
          >
            Annuleer
          </button>
          <button type="submit" disabled={!canSave} className={styles.save}>
            {saving ? "Bezig…" : mode === "create" ? "Aanmaken" : "Opslaan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
