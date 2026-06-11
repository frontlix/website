"use client";

// ─────────────────────────────────────────────────────────────────────
// Client-wrapper voor de v2 Agenda. Houdt de modal-/selectie-state vast
// en wired de knoppen aan de BESTAANDE server-actions:
//   - "Afronden"  → completeAppointment(leadId)   (lib/dashboard/agenda-actions)
//   - "Verzetten" → rescheduleAppointment(leadId, iso)
// De weergave-data (week) komt als prop van de server-component (echte
// Supabase-data of demo-fallback). Geen nieuwe DB-logica hier.
// ─────────────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AgendaHeader } from "./AgendaHeader";
import { WeekGrid } from "./WeekGrid";
import { AppointmentDetail, type Selectie } from "./AppointmentDetail";
import { RouteContactModal } from "./RouteContactModal";
import { NewAppointmentModal } from "./NewAppointmentModal";
import type { AgendaDag, AgendaItem } from "./agenda-data";
import {
  completeAppointment,
  rescheduleAppointment,
} from "@/lib/dashboard/agenda-actions";
import styles from "@/app/dashboard/v2/agenda/page.module.css";

interface AgendaViewProps {
  /** Echte (of demo-fallback) week-data van de server-component. */
  week: AgendaDag[];
  /** True wanneer er een echte sessie is: knoppen roepen dan de
   *  server-actions aan i.p.v. lokale demo-state te muteren. */
  live: boolean;
}

export function AgendaView({ week, live }: AgendaViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Bij demo (geen sessie) muteren we lokaal zodat de preview blijft werken.
  const [demoWeek, setDemoWeek] = useState<AgendaDag[]>(week);
  const view = live ? week : demoWeek;

  const [selectie, setSelectie] = useState<Selectie | null>(null);
  const [route, setRoute] = useState<AgendaItem | null>(null);
  const [nieuw, setNieuw] = useState(false);

  function rondAf() {
    if (!selectie) return;
    const { item } = selectie;

    if (live && item.leadId) {
      const leadId = item.leadId;
      startTransition(async () => {
        await completeAppointment(leadId);
        router.refresh();
      });
      setSelectie(null);
      return;
    }

    // Demo-fallback: lokaal afvinken.
    const { dag } = selectie;
    setDemoWeek((w) =>
      w.map((d) =>
        d.dag !== dag.dag
          ? d
          : {
              ...d,
              items: d.items.map((it) =>
                it.tijd === item.tijd ? { ...it, klaar: true } : it,
              ),
            },
      ),
    );
    setSelectie(null);
  }

  function openRoute() {
    if (!selectie) return;
    setRoute(selectie.item);
    setSelectie(null);
  }

  return (
    <div className={styles.page}>
      <AgendaHeader onNieuw={() => setNieuw(true)} />

      <WeekGrid
        className={styles.grid}
        week={view}
        onSelect={(dag, item) => setSelectie({ dag, item })}
        onPlan={() => setNieuw(true)}
      />

      <AppointmentDetail
        selectie={selectie}
        onClose={() => setSelectie(null)}
        onAfronden={rondAf}
        onRoute={openRoute}
      />
      <RouteContactModal item={route} onClose={() => setRoute(null)} />
      <NewAppointmentModal open={nieuw} onClose={() => setNieuw(false)} onOpslaan={() => setNieuw(false)} />
    </div>
  );
}
