"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { LeadsSearch } from "./LeadsSearch";
import { LeadsFilter } from "./LeadsFilter";
import { ArchiveSwitch } from "./ArchiveSwitch";
import { ArchivedLeadsList } from "./ArchivedLeadsList";
import { ViewSwitcher, type LeadsView as LeadsViewMode } from "./ViewSwitcher";
import { LeadsPipeline } from "./LeadsPipeline";
import { LeadsList } from "./LeadsList";
import type { Lead } from "@/components/dashboard/v2/demo-data";
import type { PipelineCol } from "./leads-data";
import type { Tag } from "@/lib/dashboard/database.types";
import styles from "@/app/dashboard/v2/leads/page.module.css";

/** Client-wrapper voor de Leads-pagina: houdt de view-toggle (pipeline/lijst)
 *  in state en voedt de bestaande v2-componenten met data die de
 *  server-component (echte Supabase-data of demo-fallback) heeft gemapt.
 *  De look + scroll/hoogte-structuur is identiek aan de oude client-page.
 *
 *  In archief-modus (`archived`) tonen we het archief: het segment staat op
 *  "Archief", de pipeline/lijst-toggle verdwijnt (archief is altijd een lijst)
 *  en we renderen de ArchivedLeadsList met Herstel-knoppen.
 *
 *  `initialView` bepaalt de begin-weergave (default pipeline); bij een
 *  deeplink-filter zoals "wachtende offertes" openen we de lijst. Is
 *  `openOffertesFilter` aan, dan tonen we een wisbaar filter-chip in de kop. */
export function LeadsView({
  leads,
  pipeline,
  archived = false,
  archivedCount = 0,
  allTags,
  initialView = "pipeline",
  openOffertesFilter = false,
}: {
  leads: Lead[];
  pipeline: PipelineCol[];
  archived?: boolean;
  archivedCount?: number;
  allTags: Tag[];
  initialView?: LeadsViewMode;
  openOffertesFilter?: boolean;
}) {
  const [view, setView] = useState<LeadsViewMode>(initialView);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Leads</h1>
        <div className={styles.controls}>
          <ArchiveSwitch archivedCount={archivedCount} />
          <LeadsSearch />
          <LeadsFilter allTags={allTags} />
          {!archived ? <ViewSwitcher value={view} onChange={setView} /> : null}
        </div>
      </div>

      {openOffertesFilter ? (
        <div className={styles.activeFilter}>
          <span className={styles.activeFilterPill}>Wachtende offertes</span>
          <Link href="/leads" className={styles.clearFilter}>
            <X size={13} strokeWidth={2.5} />
            Toon alle leads
          </Link>
        </div>
      ) : null}

      {archived ? (
        <ArchivedLeadsList leads={leads} />
      ) : view === "pipeline" ? (
        <LeadsPipeline columns={pipeline} />
      ) : (
        <LeadsList leads={leads} />
      )}
    </div>
  );
}
