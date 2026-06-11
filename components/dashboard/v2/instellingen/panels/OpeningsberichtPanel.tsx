"use client";

import { VariableChips } from "../VariableChips";
import { WaPreview } from "../WaPreview";
import { OPENING_VARS, OPENING_DEFAULTS } from "../instellingen-data";
import styles from "./panels.module.css";

interface OpeningsberichtPanelProps {
  templates: Record<string, string>;
  activeTab: string;
  onTab: (tab: string) => void;
  onChange: (tab: string, tekst: string) => void;
}

/** Openingsbericht: Meta-template per dienst, bewerkbaar met variabelen en
 *  WhatsApp-preview. */
export function OpeningsberichtPanel({
  templates,
  activeTab,
  onTab,
  onChange,
}: OpeningsberichtPanelProps) {
  const tekst = templates[activeTab] ?? "";

  return (
    <>
      <div className={styles.metaWarn}>
        <strong>Let op:</strong> Meta keurt elke wijziging handmatig goed (24 tot 48 uur). Tot die tijd blijft de
        oude versie actief. Variabelen moeten exact overeenkomen met de template-parameters bij Meta.
      </div>

      <div className={styles.tabs}>
        {Object.keys(templates).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTab(tab)}
            className={`${styles.tab} ${tab === activeTab ? styles.tabActive : ""}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.tplGrid}>
        <div>
          <div className={styles.fieldLabel}>Template-tekst</div>
          <textarea
            className={styles.textarea}
            value={tekst}
            onChange={(e) => onChange(activeTab, e.target.value)}
            rows={8}
          />
          <div className={styles.tplFoot}>
            <span className={styles.charCount}>{tekst.length}/1024 tekens</span>
            <button
              type="button"
              className={styles.resetLink}
              onClick={() => onChange(activeTab, OPENING_DEFAULTS[activeTab] ?? "")}
            >
              Herstel naar standaard
            </button>
          </div>
          <VariableChips vars={OPENING_VARS} onInsert={(v) => onChange(activeTab, `${tekst} ${v}`)} />
        </div>
        <div>
          <div className={styles.previewLabel}>Voorbeeld bij de klant</div>
          <WaPreview tekst={tekst} />
        </div>
      </div>
    </>
  );
}
