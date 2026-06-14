import type { CSSProperties } from "react";
import { LeadCard } from "./LeadCard";
import { PIPELINE, type PipelineCol } from "./leads-data";
import { statusDotColor } from "./status-dot";
import styles from "./LeadsPipeline.module.css";

/** Per-kolom kleur-accent: header-tekst, dot en zachte kolomtint krijgen de
 *  bg/ink van de bijbehorende StatusKind. We zetten de tokens als inline
 *  CSS-variabelen (data-afhankelijk) zodat de CSS-module ermee tint; de
 *  layout/opzet blijft exact gelijk, alleen kleur erbij. */
function columnAccent(col: PipelineCol): CSSProperties {
  return {
    "--col-bg": `var(--rb-status-${col.dotKind}-bg)`,
    "--col-ink": `var(--rb-status-${col.dotKind}-ink)`,
  } as CSSProperties;
}

/** Pipeline: 5 vaste kolommen (PIPELINE_COLUMNS) met som per kolom en
 *  leadkaarten. `columns` komt van de server-component (echte data); zonder
 *  argument valt 'ie terug op de demo-pipeline (dev-preview zonder login).
 *  Geen drag-and-drop, dat komt later. */
export function LeadsPipeline({ columns = PIPELINE }: { columns?: PipelineCol[] }) {
  return (
    <div className={styles.board}>
      {columns.map((col) => (
        <section
          key={col.titel}
          className={styles.column}
          style={columnAccent(col)}
        >
          <header className={styles.colHead}>
            <span className={styles.colTitle}>
              <span
                className={styles.dot}
                style={{ background: statusDotColor(col.dotKind) }}
                aria-hidden="true"
              />
              {col.titel}
              <span className={styles.count}>{col.leads.length}</span>
            </span>
          </header>

          <div className={styles.cards}>
            {col.leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} done={col.done} />
            ))}
            {col.leads.length === 0 ? (
              <p className={styles.empty}>Geen leads</p>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
