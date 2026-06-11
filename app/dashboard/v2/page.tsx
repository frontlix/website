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
  last30DaysRange,
  prev30DaysRange,
} from "@/lib/dashboard/period";
import {
  countLeads,
  countConverted,
  countOffertesVerstuurd,
  countOpenOffertes,
  countAkkoordIn,
  avgOfferteWaarde,
  avgReactietijdMs,
  leadsPerDag,
} from "@/lib/dashboard/stats-queries";
import { getAppointmentsForMonth } from "@/lib/dashboard/agenda-queries";
import { getLeadsList } from "@/lib/dashboard/lead-queries";
import {
  buildKpiMetrics,
  buildOpenOffertesMetric,
  pickUpcomingAppointments,
} from "@/lib/dashboard/overzicht-data";
import { deriveActions } from "@/lib/dashboard/eerst-dit-doen";
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
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/** Gespreks-fases die we als "actief gesprek" tellen voor de status-regel. */
const ACTIEVE_FASES = new Set([
  "info_verzamelen",
  "offerte_besproken",
  "onderhandelen",
  "datum_kiezen",
]);

export default async function OverzichtPage() {
  const s = await v2Session();

  // ── Dev-preview zonder login: componenten vallen terug op hun demo-defaults.
  if (!s) {
    return (
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
  const last30 = last30DaysRange(now);
  const prev30 = prev30DaysRange(now);
  // "Vandaag" = sinds middernacht (UTC-dagstart, exact zoals de (app)-pagina).
  const vandaagStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const vandaag = { from: vandaagStart, to: now.toISOString() };

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
    avgWaardePrev,
    leadsLast30d,
    convertedLast30d,
    leadsPrev30d,
    convertedPrev30d,
    reactietijdLast7Ms,
    reactietijdPrev7Ms,
    openOffertes,
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
    avgOfferteWaarde(prevMaand),
    countLeads(last30),
    countConverted(last30),
    countLeads(prev30),
    countConverted(prev30),
    avgReactietijdMs(week7d),
    avgReactietijdMs(prevWeek7d),
    countOpenOffertes(),
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
  const omzetMaand = avgWaarde !== null ? convertedMaand * avgWaarde : 0;
  const gemTicket = avgWaarde ?? 0;

  const conversiePctLast30 =
    leadsLast30d > 0 ? Math.round((convertedLast30d / leadsLast30d) * 100) : 0;
  const conversiePctPrev30 =
    leadsPrev30d > 0 ? Math.round((convertedPrev30d / leadsPrev30d) * 100) : 0;
  const omzetMaandPrev = (avgWaardePrev ?? 0) * convertedMaandPrev;
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
  const eerstDitDoenActies = deriveActions(allLeads, 5);
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

  return (
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
  );
}
