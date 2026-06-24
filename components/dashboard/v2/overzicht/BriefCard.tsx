"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Loader2 } from "lucide-react";
import { Card } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { BRIEF, STATUS_LINE, TENANT } from "@/components/dashboard/v2/demo-data";
import type { BriefData } from "./overzicht-mappers";
import styles from "./BriefCard.module.css";

/** Demo-fallback (dev-preview zonder login): zelfde vorm als de echte data. */
const DEMO_BRIEF: BriefData = {
  statusLine: [...STATUS_LINE],
  greeting: "Goedemorgen",
  voornaam: TENANT.user,
  body: BRIEF.body,
  cta: BRIEF.cta,
  ctaHref: "/leads?offertes=open",
};

/**
 * Inhoud van de CTA-link: label + pijl, met een laad-indicator zodra de
 * navigatie loopt (useLinkStatus geeft `pending` van de omhullende <Link>).
 * Zo krijgt de gebruiker feedback bij een trage server-render i.p.v. een dode
 * knop. Moet een kind van <Link> zijn, daarom een apart component.
 */
function CtaContent({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {label}
      {pending ? (
        <Loader2 size={16} strokeWidth={2.5} className={styles.ctaSpin} aria-hidden="true" />
      ) : (
        <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
      )}
    </>
  );
}

/** Surface-samenvatting bovenaan Overzicht: statusregel + begroeting + de
 *  briefing-body en een CTA die naar Leads navigeert (de wachtende offertes). */
export function BriefCard({ brief = DEMO_BRIEF }: { brief?: BriefData }) {
  const router = useRouter();

  return (
    <Card pad="none" className={styles.card}>
      <span className={styles.glow} aria-hidden="true" />
      <div className={styles.body}>
        <div className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          {brief.statusLine.join(" · ")}
        </div>
        <h1 className={styles.greeting}>
          {brief.greeting}, {brief.voornaam}
        </h1>
        <p className={styles.text}>{brief.body}</p>
        <div className={styles.ctaRow}>
          {/* Echte navigatie -> <Link> (rechtsklik / open in nieuw tabblad). */}
          <Link href={brief.ctaHref} className={styles.cta}>
            <CtaContent label={brief.cta} />
          </Link>
          {/* Paneel-toggle op dezelfde pagina -> blijft een knop (geen
              paginanavigatie, dus semantisch geen link). */}
          <button
            type="button"
            className={styles.dagBtn}
            onClick={() => router.push(`${V2_BASE}?dagrapport=1`, { scroll: false })}
          >
            <BarChart3 size={15} strokeWidth={2.25} />
            Bekijk dagrapport
          </button>
        </div>
      </div>
    </Card>
  );
}
