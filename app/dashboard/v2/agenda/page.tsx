// ─────────────────────────────────────────────────────────────────────
// Agenda (rebrand v2, desktop) — SERVER-COMPONENT.
//
// Haalt de echte, tenant-gescopete week-afspraken op (zelfde query/condities
// als de bestaande (app)-agenda: getAppointmentsForRange over parseWeekParam)
// en mapt ze naar de v2-week-props. Zonder sessie (dev-preview) valt 'm terug
// op de demo-week. De interactie (modals + afronden/verzetten via de bestaande
// server-actions) zit in de client-wrapper AgendaView.
// ─────────────────────────────────────────────────────────────────────

import { v2Session } from "@/lib/dashboard/v2/session";
import { parseWeekParam } from "@/lib/dashboard/agenda-week";
import { getAppointmentsForRange } from "@/lib/dashboard/agenda-queries";
import { AgendaView } from "@/components/dashboard/v2/agenda/AgendaView";
import { mapWeekToAgendaDays } from "@/components/dashboard/v2/agenda/agenda-mappers";
import { AGENDA_WEEK } from "@/components/dashboard/v2/agenda/agenda-data";

export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const session = await v2Session();

  // Geen sessie → demo-preview (dev zonder login). Verwijderen zodra v2 live is.
  if (!session) {
    return <AgendaView week={AGENDA_WEEK} live={false} />;
  }

  // Echte data: zelfde week-bepaling + query als de (app)-agenda. De
  // sessie-client (RLS) scope't op de tenant van de ingelogde user.
  const week = parseWeekParam(sp);
  const appointments = await getAppointmentsForRange(
    week.queryStart,
    week.queryEnd,
  );
  const days = mapWeekToAgendaDays(week.mondayKey, appointments);

  return <AgendaView week={days} live />;
}
