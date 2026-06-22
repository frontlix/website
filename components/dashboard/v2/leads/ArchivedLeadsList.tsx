"use client";

// Archief-lijst (rebrand v2). Zelfde rij-geometrie als LeadsList, maar elke
// rij is opgebouwd als: een overlay-Link die de hele rij bedekt (klik = open
// het dossier, zodat je de lead nog kunt bekijken vóór je herstelt) met
// daarbovenop een losse "Herstel"-knop (z-index hoger dan de overlay, dus een
// echte aparte klikzone, geen ongeldige <button>-in-<a>-nesting).
//
// Herstellen roept de bestaande server-action unarchiveLead aan; die
// revalidate't de oude /leads-route, dus we verversen de v2-lijst hier
// expliciet met router.refresh() (binnen een transition → de rij toont
// "Herstellen…" en verdwijnt zodra de verse data binnen is).

import { useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Card, Avatar, StatusPill } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { unarchiveLead } from "@/lib/dashboard/lead-actions";
import type { Lead } from "@/components/dashboard/v2/demo-data";
import styles from "./LeadsList.module.css";

function rowAccent(lead: Lead): CSSProperties {
  return {
    "--row-ink": `var(--rb-status-${lead.statusKind}-ink)`,
  } as CSSProperties;
}

export function ArchivedLeadsList({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Lead-id dat nu hersteld wordt (voor de knop-spinner) + foutmelding.
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function restore(leadId: string) {
    setError(null);
    setRestoringId(leadId);
    startTransition(async () => {
      const res = await unarchiveLead(leadId);
      if (!res.ok) {
        setError(res.error ?? "Herstellen mislukt. Probeer het opnieuw.");
        setRestoringId(null);
        return;
      }
      // Ververs de server-component zodat de lead uit het archief verdwijnt.
      router.refresh();
      setRestoringId(null);
    });
  }

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
          <span className={styles.colActie} />
        </div>
        <div className={styles.rows}>
          <div className={styles.empty}>Geen gearchiveerde leads</div>
        </div>
      </Card>
    );
  }

  return (
    <Card pad="none" className={styles.card}>
      {error ? <div className={styles.errorBar}>{error}</div> : null}
      <div className={styles.headRow}>
        <span className={styles.colAvatar} />
        <span className={styles.colNaam}>Naam</span>
        <span className={styles.colDienst}>Dienst</span>
        <span className={styles.colBron}>Bron</span>
        <span className={styles.colWaarde}>Waarde</span>
        <span className={styles.colStatus}>Status</span>
        <span className={styles.colTijd}>Tijd</span>
        <span className={styles.colActie} />
      </div>

      <div className={styles.rows}>
        {leads.map((lead) => {
          const busy = pending && restoringId === lead.id;
          return (
            <div
              key={lead.id}
              className={`${styles.row} ${styles.rowArchief}`}
              style={rowAccent(lead)}
            >
              {/* Overlay-link: dekt de hele rij, opent het dossier. */}
              <Link
                href={`${V2_BASE}/leads/${lead.id}`}
                className={styles.rowOverlay}
                aria-label={`Open dossier van ${lead.naam}`}
              />
              <span className={styles.colAvatar}>
                <Avatar
                  initials={lead.initials}
                  name={lead.naam}
                  size={38}
                  radius={14}
                />
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
              <span className={styles.colActie}>
                <button
                  type="button"
                  className={styles.restoreBtn}
                  onClick={() => restore(lead.id)}
                  disabled={busy}
                  title="Lead terugzetten in de pipeline"
                >
                  <RotateCcw size={14} strokeWidth={2.3} />
                  {busy ? "Herstellen…" : "Herstel"}
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
