"use client";

import { CheckCheck } from "lucide-react";
import { previewTemplate } from "./instellingen-data";
import styles from "./WaPreview.module.css";

interface WaPreviewProps {
  tekst: string;
}

/** WhatsApp-preview: een inkomende bubbel met de template, variabelen
 *  ingevuld met voorbeeldwaarden. Port van PWaPreview. */
export function WaPreview({ tekst }: WaPreviewProps) {
  return (
    <div className={styles.canvas}>
      <div className={styles.bubble}>
        {previewTemplate(tekst)}
        <div className={styles.meta}>
          09:14
          <CheckCheck size={12} className={styles.read} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
