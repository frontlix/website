// ─────────────────────────────────────────────────────────────────────
// Leads-pagina (rebrand v2). Server-component: haalt de echte, tenant-
// gescopete leads op via v2Session() + getLeadsList() (zelfde query als de
// bestaande (app)-pagina) en mapt ze naar de v2-component-props. Zonder
// sessie (dev-preview zonder login) valt 'ie terug op demo-data.
//
// Archief: met ?archief=1 tonen we de gearchiveerde leads (dashboard_archived
// = true) i.p.v. de actieve. De count van het archief geven we altijd mee zodat
// het "Archief"-segment in de kop het aantal kan tonen, ook in de actieve view.
//
// De interactieve view-toggle + zoekbalk + archief-segment zitten in de
// client-wrapper LeadsView; de filterlogica (search/bron/urgent/sort) draait
// server-side identiek aan de bestaande pagina. Klik op een lead opent
// /v2/leads/<id>.
// ─────────────────────────────────────────────────────────────────────

import { v2Session } from "@/lib/dashboard/v2/session";
import { getLeadsList } from "@/lib/dashboard/lead-queries";
import { LeadsView } from "@/components/dashboard/v2/leads/LeadsView";
import {
  mapLeadsToV2,
  buildPipelineFromLeads,
  applyLeadsFilters,
} from "@/components/dashboard/v2/leads/leads-mappers";
import { LEADS } from "@/components/dashboard/v2/demo-data";
import { PIPELINE } from "@/components/dashboard/v2/leads/leads-data";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    bron?: string;
    urgent?: string;
    sort?: string;
    archief?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await v2Session();
  const isArchief = sp.archief === "1";

  // Geen sessie (dev-preview): val terug op de bestaande demo-data zodat de
  // v2-look zonder login blijft renderen. Verdwijnt bij de definitieve omzet.
  if (!session) {
    return (
      <LeadsView
        leads={isArchief ? [] : LEADS}
        pipeline={PIPELINE}
        archived={isArchief}
        archivedCount={0}
      />
    );
  }

  // Archief-modus: alleen de gearchiveerde leads ophalen; pipeline is hier niet
  // van toepassing (archief is geen pipeline-fase) en de lijst toont Herstel.
  if (isArchief) {
    const archivedLeads = await getLeadsList(undefined, { archived: true });
    const filtered = applyLeadsFilters(archivedLeads, sp);
    return (
      <LeadsView
        leads={mapLeadsToV2(filtered)}
        pipeline={[]}
        archived
        archivedCount={archivedLeads.length}
      />
    );
  }

  // Actieve view: de standaard-leadslijst + het archief-aantal voor het segment.
  // Zelfde query als de (app)-pagina (RLS scoped 'm op de tenant).
  const [allLeads, archivedLeads] = await Promise.all([
    getLeadsList(),
    getLeadsList(undefined, { archived: true }),
  ]);

  // Zelfde client-side filter/sortering als de (app)-pagina (search op
  // naam/telefoon/adres, bron form/wa, urgent, sortering prijs/naam/fase).
  const filtered = applyLeadsFilters(allLeads, sp);

  return (
    <LeadsView
      leads={mapLeadsToV2(filtered)}
      pipeline={buildPipelineFromLeads(filtered)}
      archivedCount={archivedLeads.length}
    />
  );
}
