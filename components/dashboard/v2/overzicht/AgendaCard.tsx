"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { AGENDA_TODAY, type AgendaKind } from "./overzicht-data";
import type { AgendaRow } from "./overzicht-mappers";
import styles from "./AgendaCard.module.css";

/** Class voor de gekleurde kind-balk per soort agenda-item. */
const KIND_BAR: Record<AgendaKind, string> = {
  deadline: styles.barDeadline,
  bezoek: styles.barBezoek,
  klus: styles.barKlus,
};

/** Demo-fallback (dev-preview zonder login): geen lead-id, dus rijen klikken
 *  naar de agendapagina zoals in het prototype. */
const DEMO_AGENDA: AgendaRow[] = AGENDA_TODAY.map((item) => ({ ...item, leadId: "" }));

/** "Vandaag in de agenda": compacte lijst van de agenda-items van vandaag,
 *  met een "Volledige agenda"-link naar de agendapagina. De link gaat naar
 *  Agenda; een rij met lead-id opent het lead-dossier, anders Agenda. */
export function AgendaCard({ agenda = DEMO_AGENDA }: { agenda?: AgendaRow[] }) {
  const router = useRouter();
  const goAgenda = () => router.push(`${V2_BASE}/agenda`);
  const goRow = (item: AgendaRow) =>
    router.push(item.leadId ? `${V2_BASE}/leads/${item.leadId}` : `${V2_BASE}/agenda`);

  return (
    <Card pad="none" className={styles.card}>
      <div className={styles.head}>
        <div className={styles.title}>Vandaag in de agenda</div>
        <button type="button" className={styles.link} onClick={goAgenda}>
          Volledige agenda
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>

      <ul className={styles.list}>
        {agenda.length === 0 && (
          <li className={styles.row} aria-disabled="true">
            <span className={styles.main}>
              <span className={styles.rowSub}>Geen afspraken vandaag.</span>
            </span>
          </li>
        )}
        {agenda.map((item, idx) => (
          <li
            key={item.leadId || `${item.tijd}-${idx}`}
            className={`${styles.row} ${item.kind === "deadline" ? styles.rowDeadline : ""}`}
            onClick={() => goRow(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goRow(item);
              }
            }}
          >
            <span
              className={`${styles.tijd} ${item.kind === "deadline" ? styles.tijdDeadline : ""}`}
            >
              {item.tijd}
            </span>
            <span className={`${styles.bar} ${KIND_BAR[item.kind]}`} aria-hidden="true" />
            <div className={styles.main}>
              <div className={styles.rowTitle}>{item.titel}</div>
              <div className={styles.rowSub}>{item.sub}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
