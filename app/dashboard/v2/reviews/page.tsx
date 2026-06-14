// ─────────────────────────────────────────────────────────────────────
// Reviews-pagina (rebrand v2) — server-component.
//
// Er bestaat nog GEEN reviews-tabel/backend (de bot stuurt review-vragen,
// maar er komt nog niets terug het dashboard in). Daarom tonen we hier geen
// (nep) reviews meer, maar een nette "binnenkort"-placeholder. De nav-link
// houdt een tekst-badge "binnenkort" (zie shell-data.ts), zonder nep-teller.
//
// We raken nog wel de tenant-scope aan via v2Session() (RLS), net als de
// andere v2-pagina's, zodat de overstap naar echte rijen straks alleen de
// query + UI toevoegt. De demo-componenten (ReviewsClient e.d.) blijven als
// skelet bestaan voor wanneer de reviews-backend er is.
// ─────────────────────────────────────────────────────────────────────

import { v2Session } from "@/lib/dashboard/v2/session";
import { Star } from "lucide-react";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const s = await v2Session();

  if (s) {
    // Raakt de tenant-scope (RLS via de sessie-client), zoals de andere
    // v2-pagina's. Er is nog geen reviews-tabel, dus we tonen geen data.
    const settingsRes = await s.supabase
      .from("tenant_settings")
      .select("bedrijfsnaam")
      .limit(1)
      .maybeSingle();
    void (settingsRes.data as { bedrijfsnaam: string | null } | null);
  }

  return (
    <div className={styles.soon}>
      <div className={styles.soonIcon}>
        <Star size={26} strokeWidth={2} />
      </div>
      <span className={styles.soonBadge}>Binnenkort</span>
      <h1 className={styles.soonTitle}>Reviews komen eraan</h1>
      <p className={styles.soonText}>
        Straks verzamelt Surface automatisch reviews van je klanten via WhatsApp
        en zet er een conceptantwoord bij klaar. Zodra dit live staat verschijnen
        je echte beoordelingen hier, met je gemiddelde score en de reacties per
        kanaal.
      </p>
    </div>
  );
}
