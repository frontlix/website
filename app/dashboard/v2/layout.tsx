// ─────────────────────────────────────────────────────────────────────
// Rebrand v2 layout. Server-component: haalt de echte shell-data op
// (tenant-naam + nav-badges via getV2ShellData) en voedt de Shell. Zonder
// sessie (dev-preview) valt getV2ShellData terug op demo-data; in productie
// dwingt de middleware auth af.
//
// Pagina's halen hun eigen data op via v2Session() (echte data) met
// demo-fallback. Zie components/dashboard/v2/DATA-CONTRACT.md.
// ─────────────────────────────────────────────────────────────────────

import "@/styles/rebrand-tokens.css";
import { Shell } from "@/components/dashboard/v2/ui/Shell";
import { NewOfferteMount } from "@/components/dashboard/v2/offerte/NewOfferteMount";
import { getV2ShellData } from "@/components/dashboard/v2/shell-data";

export const metadata = {
  title: "Frontlix Dashboard, v2",
};

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const shell = await getV2ShellData();

  return (
    <Shell
      tenant={shell.tenant}
      userInitials={shell.userInitials}
      nav={shell.nav}
      isDemo={shell.isDemo}
    >
      {children}
      {/* Offerte-wizard-modal: luistert centraal op "rb:new-offerte". */}
      <NewOfferteMount />
    </Shell>
  );
}
