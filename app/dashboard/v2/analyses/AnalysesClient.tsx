"use client";

// ─────────────────────────────────────────────────────────────────────
// Analyses (rebrand v2, desktop) — CLIENT-WRAPPER.
//
// Houdt het interactieve gedrag (punt klikken → mini-stats, periode-pill →
// URL-sync) en rendert exact dezelfde opzet als de oorspronkelijke
// "use client"-pagina. ALLE data komt nu via props van de server-component
// (page.tsx), die de echte Supabase-queries draait. Geen demo-import meer
// in de echte-data-tak; de visuele opzet (spacing, scroll/hoogte) is
// ongewijzigd.
// ─────────────────────────────────────────────────────────────────────

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/dashboard/v2/ui";
import type { Kpi } from "@/components/dashboard/v2/demo-data";
import {
  PERIODES,
  type PeriodeNaam,
  type PeriodeReeks,
  type FunnelStap,
  type Bron,
  type DienstAandeel,
  type Inzicht,
  type VerdelingRij,
  type TagRij,
} from "@/components/dashboard/v2/analyses/analyses-data";
import { PeriodeTabs } from "@/components/dashboard/v2/analyses/PeriodeTabs";
import { OmzetLeadsChart } from "@/components/dashboard/v2/analyses/OmzetLeadsChart";
import { FunnelChart } from "@/components/dashboard/v2/analyses/FunnelChart";
import { BronnenCard } from "@/components/dashboard/v2/analyses/BronnenCard";
import { TopDiensten } from "@/components/dashboard/v2/analyses/TopDiensten";
import { InzichtenCard } from "@/components/dashboard/v2/analyses/InzichtenCard";
import { DistributionBars } from "@/components/dashboard/v2/analyses/DistributionBars";
import { TopTagsList } from "@/components/dashboard/v2/analyses/TopTagsList";
import { periodeNaarKey } from "@/components/dashboard/v2/analyses/analyses-mappers";
import styles from "./page.module.css";

export interface AnalysesClientProps {
  periode: PeriodeNaam;
  kpis: Kpi[];
  reeks: PeriodeReeks;
  funnel: FunnelStap[];
  bronnen: Bron[];
  diensten: DienstAandeel[];
  /** Verdeling per status (DistributionBars-rijen). */
  statusVerdeling: VerdelingRij[];
  /** Verdeling per categorie (DistributionBars-rijen). */
  categorieVerdeling: VerdelingRij[];
  /** Top-tags (naam + count). */
  topTags: TagRij[];
  inzichten: Inzicht[];
  /** Compact totaal-omzet-label voor de top-diensten-kop (bv. "€27.1k"). */
  dienstenTotaal: string;
  /** Kop-meta voor het inzichten-blok (bv. "juni 2026 · 38 leads · €11.9k"). */
  inzichtenMeta: string;
  /** Gem. kluswaarde-label voor de mini-stats (bv. "€386"). */
  gemKluswaarde: string;
}

export function AnalysesClient({
  periode,
  kpis,
  reeks: p,
  funnel,
  bronnen,
  diensten,
  statusVerdeling,
  categorieVerdeling,
  topTags,
  inzichten,
  dienstenTotaal,
  inzichtenMeta,
  gemKluswaarde,
}: AnalysesClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Standaard uitgelicht: voorlaatste punt van de reeks (zoals het prototype),
  // geklemd op een geldige index als de reeks korter is.
  const startIndex = Math.max(0, p.omzet.length - 2);
  const [hi, setHi] = useState(startIndex);

  // Periode wisselen synct naar de URL (?periode=...) zodat de
  // server-component opnieuw fetcht met de juiste PeriodKey. (Hergebruik van
  // de URL-driven aanpak van components/dashboard/stats/PeriodSelector.)
  function kiesPeriode(naam: PeriodeNaam) {
    if (naam === periode) return;
    startTransition(() => {
      router.push(`/dashboard/v2/analyses?periode=${periodeNaarKey(naam)}`);
    });
  }

  const safeHi = Math.min(hi, Math.max(0, p.omzet.length - 1));

  // Leesbaar periode-label voor de pagina-kop (zoals de (app)-statistieken
  // "Periode: ..."-subtitel). Afgeleid van de gekozen pill.
  const PERIODE_LABEL: Record<PeriodeNaam, string> = {
    Week: "deze week",
    Maand: "deze maand",
    Kwartaal: "dit kwartaal",
    Jaar: "dit jaar",
    Alles: "alle tijd",
  };

  const mini = useMemo(
    () => [
      { label: "Totaal deze periode", value: p.totaal, sub: p.delta || "deze periode" },
      { label: "Gem. kluswaarde", value: gemKluswaarde, sub: "gewonnen leads" },
      {
        label: "Beste punt",
        value: p.labels[safeHi] || "geen",
        sub: `€${p.omzet[safeHi] ?? 0}k · ${p.leads[safeHi] ?? 0} leads`,
      },
      { label: "Punten in reeks", value: String(p.omzet.length), sub: periode.toLowerCase() },
    ],
    [p, safeHi, gemKluswaarde, periode],
  );

  return (
    <div className={styles.page}>
      {/* Kop met periode-keuze */}
      <header className={styles.head}>
        <div className={styles.headTitle}>
          <h1 className={styles.title}>Statistieken</h1>
          <span className={styles.sub}>Periode: {PERIODE_LABEL[periode]}</span>
        </div>
        <PeriodeTabs value={periode} onChange={kiesPeriode} />
      </header>

      {/* KPI-tegels */}
      <div className={styles.kpis}>
        {kpis.map((k, i) => (
          <Card
            key={k.label}
            pad="none"
            className={`${styles.kpiCard} ${styles[`kpiAccent${i}`] ?? ""}`}
          >
            <div className={styles.kpiLabel}>{k.label}</div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>
                {k.value}
                {k.unit ? <span className={styles.kpiUnit}>{k.unit}</span> : null}
              </span>
              {k.delta ? <span className={styles.kpiDelta}>{k.delta}</span> : null}
            </div>
          </Card>
        ))}
      </div>

      {/* Omzet & leads-lijngrafiek (interactief) */}
      <Card pad="none" className={styles.chartCard}>
        <div className={styles.chartHead}>
          <span className={styles.chartTitle}>
            Omzet &amp; leads, {periode.toLowerCase()}
          </span>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendLineOmzet} />
              Omzet
            </span>
            <span className={`${styles.legendItem} ${styles.legendMuted}`}>
              <span className={styles.legendLineLeads} />
              Leads
            </span>
          </div>
        </div>
        <div className={styles.chartBody}>
          <OmzetLeadsChart p={p} hi={safeHi} onPick={setHi} />
        </div>
      </Card>

      {/* Mini-stats die meebewegen met het gekozen punt */}
      <div className={styles.minis}>
        {mini.map((m) => (
          <Card key={m.label} pad="none" className={styles.miniCard}>
            <div className={styles.miniLabel}>{m.label}</div>
            <div className={styles.miniValue}>{m.value}</div>
            <div className={styles.miniSub}>{m.sub}</div>
          </Card>
        ))}
      </div>

      {/* Trechter + bronnen */}
      <div className={styles.split}>
        <Card pad="none" className={styles.funnelCard}>
          <span className={styles.blockTitle}>Van lead naar klant</span>
          <div className={styles.funnelBody}>
            <FunnelChart data={funnel} />
          </div>
        </Card>

        <div className={styles.bronnen}>
          {bronnen.length === 0 ? (
            <Card pad="none" className={styles.funnelCard}>
              <span className={styles.blockTitle}>Bronnen</span>
              <div className={styles.funnelBody}>
                <span className={styles.sub}>Nog geen bron-data</span>
              </div>
            </Card>
          ) : (
            bronnen.map((b, i) => (
              <BronnenCard key={b.bron} bron={b} best={i === 0} />
            ))
          )}
        </div>
      </div>

      {/* Verdeling per status + per categorie */}
      <div className={styles.twoCol}>
        <DistributionBars title="Verdeling per status" rows={statusVerdeling} />
        <DistributionBars
          title="Verdeling per categorie"
          rows={categorieVerdeling}
        />
      </div>

      {/* Top-diensten + top-tags */}
      <div className={styles.dienstenSplit}>
        <Card pad="none" className={styles.dienstenCard}>
          <div className={styles.dienstenHead}>
            <span className={styles.blockTitle}>Meeste omzet per dienst</span>
            <span className={styles.dienstenMeta}>
              deze periode · <strong className={styles.strong}>{dienstenTotaal}</strong> totaal
            </span>
          </div>
          <div className={styles.dienstenBody}>
            {diensten.length === 0 ? (
              <span className={styles.sub}>Nog geen omzet per dienst in deze periode</span>
            ) : (
              <TopDiensten data={diensten} />
            )}
          </div>
        </Card>

        <TopTagsList rows={topTags} />
      </div>

      {/* Surface-inzichten */}
      <div className={styles.inzichtenHead}>
        <span className="rb-section-label">Wat Surface ziet</span>
        <span className={styles.inzichtenMeta}>{inzichtenMeta}</span>
      </div>
      <div className={styles.inzichten}>
        {inzichten.map((z) => (
          <InzichtenCard key={z.titel} inzicht={z} />
        ))}
      </div>
    </div>
  );
}

// Re-export voor de demo-fallback in page.tsx (zodat die niet apart hoeft te
// importeren waar de hardcoded reeks vandaan komt).
export { PERIODES };
