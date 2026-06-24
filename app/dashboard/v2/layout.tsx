// ─────────────────────────────────────────────────────────────────────
// Rebrand v2 layout. Server-component: haalt de echte shell-data op
// (tenant-naam + nav-badges via getV2ShellData) en voedt de Shell. Zonder
// sessie (dev-preview) valt getV2ShellData terug op demo-data; in productie
// dwingt de middleware auth af.
//
// Pagina's halen hun eigen data op via v2Session() (echte data) met
// demo-fallback. Zie components/dashboard/v2/DATA-CONTRACT.md.
// ─────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import "@/styles/rebrand-tokens.css";
import { Shell } from "@/components/dashboard/v2/ui/Shell";
import { NewOfferteMount } from "@/components/dashboard/v2/offerte/NewOfferteMount";
import { getV2ShellData } from "@/components/dashboard/v2/shell-data";
import { getCurrentUser, getCurrentUserProfile } from "@/lib/dashboard/auth";

export const metadata = {
  title: "Frontlix Dashboard",
};

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  // Ingelogd maar (nog) niet goedgekeurd (pending/rejected) → naar de
  // wachtkamer, net als het bestaande (app)-dashboard, i.p.v. demo-data te
  // tonen. Niet-ingelogd (dev-preview zonder sessie) valt door naar de
  // demo-data; in productie stuurt de middleware die al naar /login.
  const user = await getCurrentUser();
  if (user) {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.tenant_status !== "approved") {
      redirect("/wachtkamer");
    }
  }

  const shell = await getV2ShellData();

  return (
    <>
      {/* No-flash: zet de donker-class op <html> vóór de eerste paint zodat
          de pagina meteen in de juiste modus opent (voorkomt licht-flits). */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{if(localStorage.getItem('frontlix-dashboard-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()",
        }}
      />
      <Shell
        tenant={shell.tenant}
        userInitials={shell.userInitials}
        nav={shell.nav}
        isDemo={shell.isDemo}
        logoUrl={shell.logoUrl}
        notifications={shell.notifications}
        unreadCount={shell.unreadCount}
      >
        {children}
        {/* Offerte-wizard-modal: luistert centraal op "rb:new-offerte". */}
        <NewOfferteMount />
      </Shell>
      {/* Portal-target voor de Dagrapport-drawer. Buiten <Shell> (dus buiten een
          eventuele scroll-container) zodat de position:fixed drawer op iOS niet
          desynct tijdens scrollen. De drawer wikkelt zichzelf in .rbRoot, dus
          dark mode (html.dark .rbRoot) blijft kloppen ongeacht de plek. Zonder
          deze div valt de drawer terug op document.body (werkt, maar minder
          expliciet); zie DagrapportDrawer.tsx. */}
      <div id="dagrapport-portal-root" />
    </>
  );
}
