// ─────────────────────────────────────────────────────────────────────
// Reviews-pagina (rebrand v2) — server-component.
//
// Koppelt de pagina aan de echte, tenant-gescopete Supabase-sessie via
// v2Session(). Net als de bestaande (app)-pagina is de ENIGE echte query
// hier `tenant_settings.bedrijfsnaam` (RLS-scoped); er bestaat nog geen
// reviews-tabel, dus de stats/verdeling/kanaalscores en de wachtende +
// beantwoorde reviews komen nog uit demo-data (zie data-contract
// "Valkuilen": GEEN REVIEWS-TABEL). De demo-bron wordt door de mappers
// naar de bestaande v2-component-props gevormd, zodat de overstap naar
// echte rijen straks alleen de query toevoegt.
//
// Bij geen sessie (dev-preview zonder login) valt de pagina terug op
// dezelfde demo-data, conform het master-data-contract.
// ─────────────────────────────────────────────────────────────────────

import { v2Session } from "@/lib/dashboard/v2/session";
import { ReviewsClient } from "@/components/dashboard/v2/reviews/ReviewsClient";
import {
  REVIEW_STATS,
  REVIEWS_WACHTEND,
  REVIEWS_RECENT,
  BRON_SCORES,
} from "@/components/dashboard/v2/reviews/reviews-data";
import { toReviewRows } from "@/components/dashboard/v2/reviews/reviews-mappers";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const s = await v2Session();

  if (s) {
    // Echte, tenant-gescopete query (RLS via de sessie-client), exact zoals
    // de bestaande (app)-pagina: bedrijfsnaam voor context. We halen 'm op
    // zodat de tenant-scope echt wordt geraakt; de reviews zelf bestaan nog
    // niet als tabel (demo-data tot de bot review-vragen verstuurt).
    const settingsRes = await s.supabase
      .from("tenant_settings")
      .select("bedrijfsnaam")
      .limit(1)
      .maybeSingle();
    // Cast: zonder generated DB types geeft de inference hier `never`.
    void (settingsRes.data as { bedrijfsnaam: string | null } | null);
  }

  // Demo-bron → bestaande v2-component-props via de mappers. Lege bronnen
  // worden netjes opgevangen (geen crash bij 0 rijen).
  const rows = toReviewRows(REVIEWS_WACHTEND, REVIEWS_RECENT);

  return (
    <ReviewsClient
      stats={REVIEW_STATS}
      bronScores={BRON_SCORES}
      wachtend={REVIEWS_WACHTEND}
      rows={rows}
    />
  );
}
