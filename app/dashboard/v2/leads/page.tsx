// ─────────────────────────────────────────────────────────────────────
// Leads-pagina (rebrand v2). Server-component: haalt de echte, tenant-
// gescopete leads op via v2Session() + getLeadsList() (zelfde query als de
// bestaande (app)-pagina) en mapt ze naar de v2-component-props. Zonder
// sessie (dev-preview zonder login) valt 'ie terug op demo-data.
//
// De interactieve view-toggle + zoekbalk zitten in de client-wrapper
// LeadsView; de filterlogica (search/bron/urgent/sort) draait server-side
// identiek aan de bestaande pagina. Klik op een lead opent /v2/leads/<id>.
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
  }>;
}) {
  const sp = await searchParams;
  const session = await v2Session();

  // Geen sessie (dev-preview): val terug op de bestaande demo-data zodat de
  // v2-look zonder login blijft renderen. Verdwijnt bij de definitieve omzet.
  if (!session) {
    return <LeadsView leads={LEADS} pipeline={PIPELINE} />;
  }

  // Echte data: zelfde query als de (app)-pagina (RLS scoped 'm op de tenant).
  const allLeads = await getLeadsList();

  // Zelfde client-side filter/sortering als de (app)-pagina (search op
  // naam/telefoon/adres, bron form/wa, urgent, sortering prijs/naam/fase).
  const filtered = applyLeadsFilters(allLeads, sp);

  return (
    <LeadsView
      leads={mapLeadsToV2(filtered)}
      pipeline={buildPipelineFromLeads(filtered)}
    />
  );
}
