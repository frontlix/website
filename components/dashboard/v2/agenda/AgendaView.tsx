"use client";

// ─────────────────────────────────────────────────────────────────────
// Client-wrapper voor de v2 Agenda. Houdt de weergave (week/maand) +
// modal-state vast. Klik op een afspraak opent direct de Route & contact-
// modal (met "Afronden"); er is geen aparte detail-tussenstap meer.
// "Afronden" wired aan de bestaande server-action completeAppointment;
// in de demo (geen sessie) muteren we lokale state. Geen DB-logica hier.
// ─────────────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AgendaHeader, type AgendaView as AgendaViewMode } from "./AgendaHeader";
import { WeekGrid } from "./WeekGrid";
import { MonthGrid } from "./MonthGrid";
import { TodayPanel } from "./TodayPanel";
import { RouteContactModal } from "./RouteContactModal";
import { NewAppointmentModal, type NieuweAfspraak } from "./NewAppointmentModal";
import type { KlantOptie } from "./KlantSelect";
import type { AgendaDag, AgendaItem, AgendaType, AgendaMaandCel, RouteBase } from "./agenda-data";
import { vandaagItem } from "./agenda-derive";
import { completeAppointment, bookAppointment } from "@/lib/dashboard/agenda-actions";
import styles from "@/app/dashboard/v2/agenda/page.module.css";

interface AgendaViewProps {
  /** Echte (of demo-fallback) week-data van de server-component. */
  week: AgendaDag[];
  /** Periodelabel voor de weekweergave (bv. "Week 24 · 8 t/m 14 juni 2026"). */
  weekLabel: string;
  /** Maandag-key (YYYY-MM-DD) van de vorige week, voor de navigatieknop. */
  weekPrevKey: string;
  /** Maandag-key (YYYY-MM-DD) van de volgende week, voor de navigatieknop. */
  weekNextKey: string;
  /** ISO-dagkeys (YYYY-MM-DD) van de 7 getoonde week-dagen, voor het plaatsen
   *  van een nieuwe afspraak op de juiste dag. */
  weekDateKeys: string[];
  /** Echte (of demo-fallback) maand-cellen (7×N grid, Ma..Zo). */
  month: AgendaMaandCel[];
  /** Maandlabel (bv. "Juni 2026") voor de kop in de maandweergave. */
  monthLabel: string;
  /** Bestaande leads om in "Nieuwe afspraak" aan te koppelen. */
  klanten: KlantOptie[];
  /** True wanneer er een echte sessie is: knoppen roepen dan de
   *  server-actions aan i.p.v. lokale demo-state te muteren. */
  live: boolean;
  /** Vertrekadres/werkplaats voor de live routekaart; null = SVG-fallback. */
  base?: RouteBase | null;
}

export function AgendaView({
  week,
  weekLabel,
  weekPrevKey,
  weekNextKey,
  weekDateKeys,
  month,
  monthLabel,
  klanten,
  live,
  base,
}: AgendaViewProps) {
  const router = useRouter();
  const [bezig, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<AgendaViewMode>("week");

  // Bij demo (geen sessie) muteren we lokaal zodat de preview blijft werken.
  const [demoWeek, setDemoWeek] = useState<AgendaDag[]>(week);
  const [demoMonth, setDemoMonth] = useState<AgendaMaandCel[]>(month);
  const weekDagen = live ? week : demoWeek;
  const maandCellen = live ? month : demoMonth;

  // Geselecteerde afspraak: opent direct de Route & contact-modal.
  const [route, setRoute] = useState<AgendaItem | null>(null);
  const [nieuw, setNieuw] = useState(false);
  const [nieuwError, setNieuwError] = useState<string | null>(null);

  function openNieuw() {
    setNieuwError(null);
    setNieuw(true);
  }

  // De afspraak van vandaag voor het "Vandaag"-paneel (eerste open klus/bezoek).
  const vandaag = vandaagItem(weekDagen);

  /** Markeer een afspraak in de demo-data af (match op tijd+titel, de demo-
   *  titels zijn uniek). Houdt week- én maandweergave consistent. */
  function vinkDemoAf(item: AgendaItem) {
    const raakt = (it: AgendaItem) =>
      it.tijd === item.tijd && it.titel === item.titel ? { ...it, klaar: true } : it;
    setDemoWeek((w) => w.map((d) => ({ ...d, items: d.items.map(raakt) })));
    setDemoMonth((cells) => cells.map((c) => ({ ...c, items: c.items.map(raakt) })));
  }

  /** Afronden van de geselecteerde (route-modal) afspraak. */
  function rondAfRoute() {
    if (!route) return;
    const item = route;

    if (live && item.leadId) {
      const leadId = item.leadId;
      startTransition(async () => {
        await completeAppointment(leadId);
        router.refresh();
      });
      setRoute(null);
      return;
    }

    vinkDemoAf(item);
    setRoute(null);
  }

  /** Afronden vanuit het "Vandaag"-paneel (week): de afgeleide vandaag-afspraak. */
  function rondVandaagAf() {
    if (!vandaag) return;
    const { item } = vandaag;

    if (live && item.leadId) {
      const leadId = item.leadId;
      startTransition(async () => {
        await completeAppointment(leadId);
        router.refresh();
      });
      return;
    }

    vinkDemoAf(item);
  }

  /** Nieuwe afspraak opslaan.
   *  Live: boeken via de bot (book-appointment) → Google Agenda-event +
   *  Supabase + bevestiging; daarna verschijnt 'ie in de agenda. Vereist een
   *  gekoppelde klant (lead).
   *  Demo: lokaal toevoegen op de gekozen ISO-dag (week + maand). */
  function voegToe({
    titel,
    klant,
    leadId,
    telefoon,
    adres,
    afstandKm,
    datum,
    tijd,
    duur,
    notifyWhatsapp,
    notifyEmail,
  }: NieuweAfspraak) {
    if (live) {
      if (!leadId) {
        setNieuwError("Koppel een bestaande klant om de afspraak in te plannen.");
        return;
      }
      setNieuwError(null);
      startTransition(async () => {
        const res = await bookAppointment(leadId, datum, tijd, {
          notifyWhatsapp,
          notifyEmail,
        });
        if (res.ok) {
          router.refresh();
          setNieuw(false);
        } else {
          setNieuwError(res.error);
        }
      });
      return;
    }

    const type: AgendaType = /plaatsbezoek|bezoek/i.test(titel) ? "bezoek" : "klus";
    const item: AgendaItem = {
      tijd,
      duur,
      titel,
      sub: klant || "",
      plaats: "",
      type,
      klaar: false,
      klant: klant || undefined,
      leadId,
      telefoon: telefoon || undefined,
      adres: adres || undefined,
      afstandKm,
    };
    const opTijd = (a: AgendaItem, b: AgendaItem) => a.tijd.localeCompare(b.tijd);

    // Week: plaats op de dag waarvan de ISO-key matcht (indien zichtbaar).
    const wIdx = weekDateKeys.indexOf(datum);
    if (wIdx >= 0) {
      setDemoWeek((w) =>
        w.map((d, i) =>
          i !== wIdx ? d : { ...d, items: [...d.items, item].sort(opTijd) },
        ),
      );
    }

    // Maand: plaats in de cel met dezelfde ISO-dagkey (indien zichtbaar).
    setDemoMonth((cells) =>
      cells.map((c) =>
        c.dateKey === datum ? { ...c, items: [...c.items, item].sort(opTijd) } : c,
      ),
    );

    setNieuw(false);
  }

  return (
    <div className={styles.page}>
      <AgendaHeader
        view={viewMode}
        label={viewMode === "maand" ? monthLabel : weekLabel}
        weekPrevKey={weekPrevKey}
        weekNextKey={weekNextKey}
        onViewChange={setViewMode}
        onNieuw={openNieuw}
      />

      {viewMode === "week" ? (
        <>
          <WeekGrid
            className={styles.grid}
            week={weekDagen}
            onSelect={(_dag, item) => setRoute(item)}
            onPlan={openNieuw}
          />
          <TodayPanel
            item={vandaag?.item ?? null}
            onAfronden={rondVandaagAf}
            onPlan={openNieuw}
            base={base}
          />
        </>
      ) : (
        <MonthGrid
          className={styles.grid}
          cells={maandCellen}
          onSelect={(_cel, item) => setRoute(item)}
          onPlan={openNieuw}
        />
      )}

      <RouteContactModal item={route} onClose={() => setRoute(null)} onAfronden={rondAfRoute} base={base} />
      <NewAppointmentModal
        open={nieuw}
        onClose={() => {
          setNieuw(false);
          setNieuwError(null);
        }}
        klanten={klanten}
        klantVerplicht={live}
        bezig={bezig}
        error={nieuwError}
        onOpslaan={voegToe}
      />
    </div>
  );
}
