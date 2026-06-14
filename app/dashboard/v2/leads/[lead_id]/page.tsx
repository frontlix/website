// Lead-dossier (split view) — rebrand v2.
//
// Server-component: haalt met v2Session() de echte, tenant-gescopete
// lead-detail op (zelfde getLeadDetail-query als de bestaande (app)-pagina)
// en mapt die naar de bestaande v2-dossier-vorm. Zonder sessie (dev-preview
// zonder login) valt 'ie terug op de gedeelde demo-data. De interactieve
// inhoud + knop-wiring zit in DossierView ("use client").

import { notFound } from "next/navigation";
import { v2Session } from "@/lib/dashboard/v2/session";
import { getLeadDetail } from "@/lib/dashboard/lead-queries";
import { getManualOffertePricing } from "@/lib/dashboard/pricing-queries";
import { LEADS, findLead } from "@/components/dashboard/v2/demo-data";
import { DossierView } from "@/components/dashboard/v2/dossier/DossierView";
import {
  mapLeadDetailToV2Lead,
  mapLeadDetailToDossierData,
} from "@/components/dashboard/v2/dossier/dossier-mappers";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ lead_id: string }>;
}

export default async function LeadDossierPage({ params }: PageProps) {
  const { lead_id } = await params;
  const session = await v2Session();

  // Geen sessie (dev-preview zonder login): demo-fallback, ongewijzigd gedrag.
  if (!session) {
    const lead = findLead(lead_id) ?? LEADS[0];
    return <DossierView lead={lead} />;
  }

  // Echte, tenant-gescopete data (RLS actief via de sessie-client). getLeadDetail
  // gebruikt dezelfde gescopete client + condities als de (app)-pagina. De
  // prijslijst komt uit dezelfde helper als de (app)-pagina, zodat de inline
  // offerte-editor exact dezelfde regels/totalen berekent.
  const [detail, pricing] = await Promise.all([
    getLeadDetail(lead_id),
    getManualOffertePricing(),
  ]);
  if (!detail) {
    notFound();
  }

  const lead = mapLeadDetailToV2Lead(detail);
  const dossier = mapLeadDetailToDossierData(detail, pricing);

  return (
    <DossierView
      lead={lead}
      dossier={dossier}
      leadId={detail.lead.lead_id}
      botPaused={detail.lead.bot_gepauzeerd}
      archivedInitial={detail.lead.dashboard_archived}
    />
  );
}
