import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, Avatar, StatusPill } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { LEADS, type Lead } from "@/components/dashboard/v2/demo-data";
import styles from "./LeadsList.module.css";

/** Lijst-weergave: kolomkop + klikbare rijen met dezelfde info als de
 *  pipeline-kaarten. Klik op een rij opent het lead-dossier. `leads` komt
 *  van de server-component (echte data); zonder argument valt 'ie terug op
 *  de demo-data (dev-preview zonder login). */
export function LeadsList({ leads = LEADS }: { leads?: Lead[] }) {
  if (leads.length === 0) {
    return (
      <Card pad="none" className={styles.card}>
        <div className={styles.headRow}>
          <span className={styles.colAvatar} />
          <span className={styles.colNaam}>Naam</span>
          <span className={styles.colDienst}>Dienst</span>
          <span className={styles.colBron}>Bron</span>
          <span className={styles.colWaarde}>Waarde</span>
          <span className={styles.colStatus}>Status</span>
          <span className={styles.colTijd}>Tijd</span>
          <span className={styles.colChevron} />
        </div>
        <div className={styles.rows}>
          <div className={styles.empty}>Geen leads gevonden</div>
        </div>
      </Card>
    );
  }

  return (
    <Card pad="none" className={styles.card}>
      <div className={styles.headRow}>
        <span className={styles.colAvatar} />
        <span className={styles.colNaam}>Naam</span>
        <span className={styles.colDienst}>Dienst</span>
        <span className={styles.colBron}>Bron</span>
        <span className={styles.colWaarde}>Waarde</span>
        <span className={styles.colStatus}>Status</span>
        <span className={styles.colTijd}>Tijd</span>
        <span className={styles.colChevron} />
      </div>

      <div className={styles.rows}>
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`${V2_BASE}/leads/${lead.id}`}
            className={styles.row}
          >
            <span className={styles.colAvatar}>
              <Avatar initials={lead.initials} size={38} radius={14} />
            </span>
            <div className={styles.colNaam}>
              <div className={styles.naam}>{lead.naam}</div>
              <div className={styles.plaats}>{lead.plaats}</div>
            </div>
            <div className={styles.colDienst}>{lead.dienst}</div>
            <span className={styles.colBron}>{lead.bron}</span>
            <span className={styles.colWaarde}>{lead.waarde}</span>
            <span className={styles.colStatus}>
              <StatusPill kind={lead.statusKind}>{lead.status}</StatusPill>
            </span>
            <span className={styles.colTijd}>{lead.tijd}</span>
            <span className={styles.colChevron}>
              <ChevronRight size={16} className={styles.chevron} />
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
