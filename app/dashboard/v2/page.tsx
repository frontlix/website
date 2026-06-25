// ─────────────────────────────────────────────────────────────────────
// Overzicht (rebrand v2, desktop). Twee kolommen (1.45fr / 1fr):
//   links   = Surface-samenvatting ("Drie dingen voor de koffie") + de
//             owner-review-actielijst ("Eerst dit doen");
//   rechts  = omzet-voortgangsring, 4 KPI-tegels en de
//             agenda-van-vandaag-kaart ("Vandaag in de agenda").
//
// Server-component: haalt via v2Session() de echte, tenant-gescopete
// Supabase-data op (RLS actief op s.supabase) en hergebruikt exact de
// queries/condities + afgeleide-cijfer-helpers van het bestaande
// (app)-Overzicht. Mappers (overzicht-mappers.ts) zetten die data om naar
// de prop-vormen die de v2-componenten al verwachten; de look + scroll/
// hoogte blijven onveranderd. Bij geen sessie (dev-preview zonder login)
// vallen de componenten terug op hun eigen demo-defaults.
// ─────────────────────────────────────────────────────────────────────

import { v2Session } from "@/lib/dashboard/v2/session";
import {
  periodToRange,
  thisWeekRolling,
  prevWeekRange,
  prevMonthSamePeriodRange,
} from "@/lib/dashboard/period";
import { amsterdamStartOfDayIso } from "@/lib/dashboard/amsterdam-time";
import {
  countLeads,
  countConverted,
  countOffertesVerstuurd,
  countOpenOffertes,
  countAkkoordIn,
  avgOfferteWaarde,
  avgReactietijdMs,
  leadsPerDag,
  omzetTotaal,
} from "@/lib/dashboard/stats-queries";
import { getAppointmentsForMonth } from "@/lib/dashboard/agenda-queries";
import { getLeadsList } from "@/lib/dashboard/lead-queries";
import {
  buildKpiMetrics,
  buildOpenOffertesMetric,
  pickUpcomingAppointments,
} from "@/lib/dashboard/overzicht-data";
import { deriveActions } from "@/lib/dashboard/eerst-dit-doen";
import { getRadiusMaxKm } from "@/lib/dashboard/tenant-base";
import { buildSurfaceSummary } from "@/lib/dashboard/surface-summary";
import { getGreeting, getVoornaam } from "@/lib/dashboard/greeting";
import { KPI_DOELEN } from "@/components/dashboard/overzicht/kpi-doelen";

import { BriefCard } from "@/components/dashboard/v2/overzicht/BriefCard";
import { ActionList } from "@/components/dashboard/v2/overzicht/ActionList";
import { OmzetCard } from "@/components/dashboard/v2/overzicht/OmzetCard";
import { KpiTiles } from "@/components/dashboard/v2/overzicht/KpiTiles";
import { AgendaCard } from "@/components/dashboard/v2/overzicht/AgendaCard";
import {
  mapBriefData,
  mapActionRows,
  mapOmzetData,
  mapKpiTiles,
  mapSparkline,
  mapAgendaRows,
} from "@/components/dashboard/v2/overzicht/overzicht-mappers";
import { getDagrapport, type DagrapportData } from "@/lib/dashboard/dagrapport-queries";
import { DagrapportDrawer } from "@/components/dashboard/v2/overzicht/DagrapportDrawer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/** Demo-dagrapport voor de dev-preview (geen sessie); zelfde vorm als getDagrapport. */
function buildDemoDagrapport(): DagrapportData {
  return {
    datum: new Date().toISOString(),
    vandaag: { leads: 4, offertesVerstuurd: 3, akkoorden: 2, omzet: 1840 },
    gisteren: { leads: 2, offertesVerstuurd: 1, akkoorden: 1, omzet: 920 },
    bronnen: [
      { bron: "WhatsApp", count: 3 },
      { bron: "Website", count: 1 },
    ],
    sparklines: {
      leads: [1, 0, 3, 2, 1, 2, 4],
      offertes: [0, 1, 2, 1, 0, 1, 3],
      akkoorden: [0, 0, 1, 1, 0, 1, 2],
      omzet: [0, 320, 980, 540, 0, 920, 1840],
    },
    uurStrip: [0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 2, 4, 2, 1, 3, 2, 1, 0, 0, 0, 0, 0, 0],
    surface: { uitgaand: 28, inkomend: 19, reactietijdS: 42 },
  };
}

/** Gespreks-fases die we als "actief gesprek" tellen voor de status-regel. */
const ACTIEVE_FASES = new Set([
  "info_verzamelen",
  "offerte_besproken",
  "onderhandelen",
  "datum_kiezen",
]);

export default async function OverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ dagrapport?: string }>;
}) {
  // `?dagrapport=1` opent de dagrapport-drawer (vanuit de BriefCard-knop én
  // vanuit de digest-melding in de bel).
  const dagrapportOpen = (await searchParams).dagrapport === "1";
  const s = await v2Session();

  // ── Dev-preview zonder login: componenten vallen terug op hun demo-defaults.
  if (!s) {
    return (
      <>
        <div className={styles.grid}>
          <div className={styles.col}>
            <BriefCard />
            <ActionList />
          </div>
          <div className={styles.col}>
            <OmzetCard />
            <KpiTiles />
            <AgendaCard />
          </div>
        </div>
        {dagrapportOpen && <DagrapportDrawer data={buildDemoDagrapport()} />}
      </>
    );
  }

  const { supabase, user } = s;
  const greeting = getGreeting();
  const voornaam = getVoornaam(user);

  // ── Tijdvensters (zelfde afleiding als de (app)-Overzicht) ──────────
  const now = new Date();
  const week = periodToRange("deze-week", now);
  const maand = periodToRange("deze-maand", now);
  const week7d = thisWeekRolling(now);
  const prevWeek7d = prevWeekRange(now);
  const prevMaand = prevMonthSamePeriodRange(now);
  // "Vandaag" = sinds middernacht Nederlandse tijd (NL-dag), consistent met de
  // rest van het dashboard. Zie amsterdam-time.ts.
  const vandaag = { from: amsterdamStartOfDayIso(now), to: now.toISOString() };

  // ── Parallel-fetch (hergebruikt exact de bestaande queries/helpers) ──
  const [
    leadsMaand,
    convertedMaand,
    avgWaarde,
    trend,
    appts,
    allLeads,
    tenantRaw,
    leadsVandaag,
    offertesWeek,
    akkoordWeek,
    leadsLast7d,
    leadsPrev7d,
    convertedMaandPrev,
    reactietijdLast7Ms,
    reactietijdPrev7Ms,
    openOffertes,
    omzetMaandReal,
    omzetMaandPrevReal,
    leadsMaandPrev,
  ] = await Promise.all([
    countLeads(maand),
    countConverted(maand),
    avgOfferteWaarde(maand),
    leadsPerDag(now, 10),
    getAppointmentsForMonth(now.getUTCFullYear(), now.getUTCMonth() + 1),
    getLeadsList(),
    supabase
      .from("tenant_settings")
      .select("chatbot_naam, omzet_doel_maand")
      .limit(1)
      .maybeSingle(),
    countLeads(vandaag),
    countOffertesVerstuurd(week),
    countAkkoordIn(week),
    countLeads(week7d),
    countLeads(prevWeek7d),
    countConverted(prevMaand),
    avgReactietijdMs(week7d),
    avgReactietijdMs(prevWeek7d),
    countOpenOffertes(),
    omzetTotaal(maand),
    omzetTotaal(prevMaand),
    countLeads(prevMaand),
  ]);

  // Tenant: chatbot_naam altijd aanwezig, omzet_doel_maand is nieuwe kolom
  // (migratie 045). Defensief casten (zelfde patroon als de (app)-pagina).
  const tenant = tenantRaw.data as
    | { chatbot_naam: string | null; omzet_doel_maand?: number | null }
    | null;
  const chatbotName = tenant?.chatbot_naam ?? "Surface";
  const omzetDoelMaand: number | null =
    (tenant?.omzet_doel_maand as number | null | undefined) ?? null;

  // ── Afgeleide cijfers (identiek aan de (app)-Overzicht) ─────────────
  // Echte omzet = som van gewonnen offertes (snapshot) in de maand, niet de
  // oude schatting converted x avg (die liep fors uiteen met Analyses).
  const omzetMaand = omzetMaandReal;
  const gemTicket = avgWaarde ?? 0;

  // Conversie lead→klant over DEZE MAAND (gewonnen leads / alle leads van de
  // maand), consistent met de rest van het Overzicht en met Analyses. De
  // var-namen Last30/Prev30 zijn historisch en dragen nu de maand-waarden; de
  // keys van buildKpiMetrics blijven daardoor ongemoeid.
  const conversiePctLast30 =
    leadsMaand > 0 ? Math.round((convertedMaand / leadsMaand) * 100) : 0;
  const conversiePctPrev30 =
    leadsMaandPrev > 0 ? Math.round((convertedMaandPrev / leadsMaandPrev) * 100) : 0;
  const omzetMaandPrev = omzetMaandPrevReal;
  const reactietijdLast7S =
    reactietijdLast7Ms !== null ? Math.round(reactietijdLast7Ms / 1000) : 0;
  const reactietijdPrev7S =
    reactietijdPrev7Ms !== null ? Math.round(reactietijdPrev7Ms / 1000) : 0;

  const kpiMetrics = buildKpiMetrics({
    omzetMaand,
    omzetMaandPrev,
    leadsLast7d,
    leadsPrev7d,
    conversiePctLast30,
    conversiePctPrev30,
    reactietijdLast7S,
    reactietijdPrev7S,
    omzetDoelMaand,
  });
  const extraOffertesOpen = buildOpenOffertesMetric(openOffertes);

  const upcomingAppts = pickUpcomingAppointments(appts, 4);
  const radiusMaxKm = await getRadiusMaxKm();
  const eerstDitDoenActies = deriveActions(allLeads, 5, radiusMaxKm);
  const actieveGesprekken = allLeads.filter(
    (l) => l.gesprek_fase && ACTIEVE_FASES.has(l.gesprek_fase),
  ).length;

  // Afspraken van vandaag (Europe/Amsterdam), max 4, voor de agenda-kaart.
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const todaysAppts = upcomingAppts.filter((a) => {
    if (!a.afspraak_geboekt_op) return false;
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(a.afspraak_geboekt_op));
    return key === todayKey;
  });

  // ── Mappers: DB/afgeleid → bestaande v2-component-props ──────────────
  const brief = mapBriefData({
    chatbotName,
    greeting,
    voornaam,
    summary: buildSurfaceSummary({
      leadsVandaag,
      offertesWeek,
      akkoordWeek,
      omzetMaand: Math.round(omzetMaand),
      gemTicket: Math.round(gemTicket),
    }),
    openOffertes,
    actieveGesprekken,
    komendeAfspraken: upcomingAppts.length,
  });
  const actions = mapActionRows(eerstDitDoenActies);
  const omzet = mapOmzetData({
    omzetMaand,
    omzetMaandPrev,
    omzetDoelMaand: omzetDoelMaand ?? KPI_DOELEN.omzet_maand,
  });
  const kpis = mapKpiTiles(kpiMetrics, extraOffertesOpen);
  const spark = mapSparkline(trend.map((d) => d.count));
  const agenda = mapAgendaRows(todaysAppts);

  // Dagrapport-data alleen ophalen als de drawer open is (geen extra queries
  // op elke pageload). De drawer leeft buiten de grid (fixed overlay).
  const dagrapportData = dagrapportOpen ? await getDagrapport(now) : null;

  return (
    <>
      <div className={styles.grid}>
        <div className={styles.col}>
          <BriefCard brief={brief} />
          <ActionList actions={actions} />
        </div>

        <div className={styles.col}>
          <OmzetCard omzet={omzet} />
          <KpiTiles kpis={kpis} spark={spark} />
          <AgendaCard agenda={agenda} />
        </div>
      </div>
      {dagrapportData && <DagrapportDrawer data={dagrapportData} />}
    </>
  );
}
