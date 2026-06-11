import { LeadCard } from "./LeadCard";
import { PIPELINE, type PipelineCol } from "./leads-data";
import { statusDotColor } from "./status-dot";
import styles from "./LeadsPipeline.module.css";

/** Pipeline: 5 vaste kolommen (PIPELINE_COLUMNS) met som per kolom en
 *  leadkaarten. `columns` komt van de server-component (echte data); zonder
 *  argument valt 'ie terug op de demo-pipeline (dev-preview zonder login).
 *  Geen drag-and-drop, dat komt later. */
export function LeadsPipeline({ columns = PIPELINE }: { columns?: PipelineCol[] }) {
  return (
    <div className={styles.board}>
      {columns.map((col) => (
        <section key={col.titel} className={styles.column}>
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
            <span className={styles.som}>{col.som}</span>
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
