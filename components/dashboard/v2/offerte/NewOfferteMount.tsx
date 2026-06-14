"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OfferteWizard } from "./OfferteWizard";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";

/** Mount-punt voor de offerte-wizard. Luistert op het globale
 *  "rb:new-offerte"-event (gedispatcht door de shell-knop en het dossier) en
 *  opent/sluit de wizard-modal. Wordt centraal in de v2-layout gemount. */
export function NewOfferteMount() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const openWizard = () => setOpen(true);
    window.addEventListener("rb:new-offerte", openWizard);
    return () => window.removeEventListener("rb:new-offerte", openWizard);
  }, []);

  // Vanuit de verzonden-staat naar het lead-dossier (demo: Familie Bakker).
  const naarLeads = () => {
    setOpen(false);
    router.push(`${V2_BASE}/leads/bakker`);
  };

  return <OfferteWizard open={open} onClose={() => setOpen(false)} onNaarLeads={naarLeads} />;
}
