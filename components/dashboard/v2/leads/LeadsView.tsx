"use client";

import { useState } from "react";
import { LeadsSearch } from "./LeadsSearch";
import { ViewSwitcher, type LeadsView as LeadsViewMode } from "./ViewSwitcher";
import { LeadsPipeline } from "./LeadsPipeline";
import { LeadsList } from "./LeadsList";
import type { Lead } from "@/components/dashboard/v2/demo-data";
import type { PipelineCol } from "./leads-data";
import styles from "@/app/dashboard/v2/leads/page.module.css";

/** Client-wrapper voor de Leads-pagina: houdt de view-toggle (pipeline/lijst)
 *  in state en voedt de bestaande v2-componenten met data die de
 *  server-component (echte Supabase-data of demo-fallback) heeft gemapt.
 *  De look + scroll/hoogte-structuur is identiek aan de oude client-page. */
export function LeadsView({
  leads,
  pipeline,
}: {
  leads: Lead[];
  pipeline: PipelineCol[];
}) {
  const [view, setView] = useState<LeadsViewMode>("pipeline");

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Leads</h1>
        <div className={styles.controls}>
          <LeadsSearch />
          <ViewSwitcher value={view} onChange={setView} />
        </div>
      </div>

      {view === "pipeline" ? (
        <LeadsPipeline columns={pipeline} />
      ) : (
        <LeadsList leads={leads} />
      )}
    </div>
  );
}
