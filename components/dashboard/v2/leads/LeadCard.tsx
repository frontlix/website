import type { CSSProperties } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Avatar, StatusPill } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import type { Lead } from "@/components/dashboard/v2/demo-data";
import styles from "./LeadCard.module.css";

interface LeadCardProps {
  lead: Lead;
  /** Kolom is "Afgerond": gedimde kaart + check-avatar i.p.v. initialen. */
  done?: boolean;
}

/** Leadkaart in de pipeline-kolom. Klik op de kaart opent het dossier.
 *  "Wacht op jou"-leads (hot) tonen een extra "Beslissen"-knop die naar
 *  dezelfde route navigeert. Avatar 30px, radius 11, conform prototype. */
export function LeadCard({ lead, done = false }: LeadCardProps) {
  const href = `${V2_BASE}/leads/${lead.id}`;
  const isHot = lead.statusKind === "hot";

  // Gekleurde rand-rail per status-soort (data-afhankelijk var-token); via een
  // inset-shadow zodat de geometrie/padding van de kaart ongewijzigd blijft.
  const accent = {
    "--card-ink": `var(--rb-status-${lead.statusKind}-ink)`,
  } as CSSProperties;

  return (
    <Link
      href={href}
      className={`${styles.card} ${done ? styles.done : ""}`}
      style={accent}
    >
      <div className={styles.head}>
        {done ? (
          <span className={styles.checkChip} aria-hidden="true">
            <Check size={15} strokeWidth={3} />
          </span>
        ) : (
          <Avatar
            initials={lead.initials}
            name={lead.naam}
            size={30}
            radius={11}
          />
        )}
        <div className={styles.id}>
          <div className={styles.naam}>{lead.naam}</div>
          <div className={styles.sub}>
            {lead.plaats} · {lead.bron}
          </div>
        </div>
      </div>

      <div className={styles.dienst}>{lead.dienst}</div>

      <div className={styles.valueRow}>
        <span className={styles.waarde}>{lead.waarde}</span>
        <span className={styles.tijd}>{lead.tijd}</span>
      </div>

      <div className={styles.statusRow}>
        <StatusPill kind={lead.statusKind}>{lead.status}</StatusPill>
      </div>

      {isHot ? (
        <span className={styles.beslis}>
          Beslissen
          <ArrowRight size={14} strokeWidth={2.5} />
        </span>
      ) : null}
    </Link>
  );
}
