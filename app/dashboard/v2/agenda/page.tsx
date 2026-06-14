// ─────────────────────────────────────────────────────────────────────
// Agenda (rebrand v2, desktop) — SERVER-COMPONENT.
//
// Haalt de echte, tenant-gescopete week- én maand-afspraken op (zelfde
// queries/condities als de bestaande (app)-agenda: getAppointmentsForRange /
// getAppointmentsForMonth) en mapt ze naar de v2-props. De week wordt bepaald
// door ?week=YYYY-MM-DD (maandag); de vorige/volgende-week-knoppen navigeren
// daarheen. Zonder sessie (dev-preview) valt 'm terug op de demo-week en
// demo-maand. De interactie zit in de client-wrapper AgendaView.
// ─────────────────────────────────────────────────────────────────────

import { v2Session } from "@/lib/dashboard/v2/session";
import { parseWeekParam, shiftWeekKey, buildWeekDays } from "@/lib/dashboard/agenda-week";
import { parseMonthParam, getMonthGrid } from "@/lib/dashboard/calendar";
import {
  getAppointmentsForRange,
  getAppointmentsForMonth,
} from "@/lib/dashboard/agenda-queries";
import { getLeadsList } from "@/lib/dashboard/lead-queries";
import { getTenantBase, DEFAULT_TENANT_BASE } from "@/lib/dashboard/tenant-base";
import { AgendaView } from "@/components/dashboard/v2/agenda/AgendaView";
import type { KlantOptie } from "@/components/dashboard/v2/agenda/KlantSelect";
import {
  mapWeekToAgendaDays,
  mapMonthToCells,
  buildDemoWeek,
  buildDemoMonthCells,
} from "@/components/dashboard/v2/agenda/agenda-mappers";
import { LEADS } from "@/components/dashboard/v2/demo-data";

export const dynamic = "force-dynamic";

/** "juni 2026" → "Juni 2026". */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Adres uit straat/huisnummer/plaats (alleen aanwezige delen). */
function leadAdres(
  straat: string | null,
  huisnummer: string | null,
  plaats: string | null,
): string {
  const parts: string[] = [];
  if (straat && huisnummer) parts.push(`${straat} ${huisnummer}`);
  else if (straat) parts.push(straat);
  if (plaats) parts.push(plaats);
  return parts.join(", ");
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const session = await v2Session();

  // Week-bepaling (?week=YYYY-MM-DD, default huidige week) + prev/next-keys voor
  // de navigatieknoppen.
  const week = parseWeekParam(sp);
  const weekPrevKey = shiftWeekKey(week.mondayKey, -1);
  const weekNextKey = shiftWeekKey(week.mondayKey, 1);
  const weekDateKeys = buildWeekDays(week.mondayKey).map((d) => d.key);

  // Maand-grid (huidige maand, of ?month=YYYY-MM). De week/maand-schakelaar is
  // client-side, dus we leveren beide datasets vooraf aan.
  const monthRef = parseMonthParam(sp);
  const grid = getMonthGrid(monthRef.year, monthRef.month);
  const monthLabel = capitalize(grid.monthLabel);
  const weekLabel = `Week ${week.weekNumber} · ${week.rangeLabel}`;

  // Geen sessie → demo-preview (dev zonder login). Verwijderen zodra v2 live is.
  // De demo-week volgt het ?week-param zodat de navigatie ook zonder login werkt.
  if (!session) {
    const demoKlanten: KlantOptie[] = LEADS.map((l) => ({
      naam: l.naam,
      plaats: l.plaats,
    }));
    return (
      <AgendaView
        key={week.mondayKey}
        week={buildDemoWeek(week.mondayKey)}
        weekLabel={weekLabel}
        weekPrevKey={weekPrevKey}
        weekNextKey={weekNextKey}
        weekDateKeys={weekDateKeys}
        month={buildDemoMonthCells(grid.cells)}
        monthLabel={monthLabel}
        klanten={demoKlanten}
        base={DEFAULT_TENANT_BASE}
        live={false}
      />
    );
  }

  // Echte data: zelfde week-bepaling + queries als de (app)-agenda. De
  // sessie-client (RLS) scope't op de tenant van de ingelogde user.
  const [weekAppointments, monthAppointments, leads, tenantBase] = await Promise.all([
    getAppointmentsForRange(week.queryStart, week.queryEnd),
    getAppointmentsForMonth(monthRef.year, monthRef.month),
    getLeadsList(),
    // Vertrekadres/werkplaats (tenant_settings base_lat/lng), voor de live route.
    getTenantBase(),
  ]);

  const days = mapWeekToAgendaDays(week.mondayKey, weekAppointments);
  const cells = mapMonthToCells(grid.cells, monthAppointments);

  // Bestaande leads om aan te koppelen in "Nieuwe afspraak".
  const klanten: KlantOptie[] = leads
    .filter((l) => l.naam)
    .map((l) => ({
      leadId: l.lead_id,
      naam: l.naam as string,
      plaats: l.plaats ?? undefined,
      telefoon: l.telefoon ?? undefined,
      adres: leadAdres(l.straat, l.huisnummer, l.plaats) || undefined,
      afstandKm: l.afstand_km ?? undefined,
    }));

  return (
    <AgendaView
      week={days}
      weekLabel={weekLabel}
      weekPrevKey={weekPrevKey}
      weekNextKey={weekNextKey}
      weekDateKeys={weekDateKeys}
      month={cells}
      monthLabel={monthLabel}
      klanten={klanten}
      base={tenantBase ?? DEFAULT_TENANT_BASE}
      live
    />
  );
}
