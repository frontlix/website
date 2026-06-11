"use client";

import { useState } from "react";
import { Check, ArrowRight, CalendarClock } from "lucide-react";
import { Modal, Button } from "@/components/dashboard/v2/ui";
import type { AgendaDag, AgendaItem } from "./agenda-data";
import { EMPTY_DUUR } from "./agenda-data";
import { klantNaam, klantInitiaal, klantPlaats, klantTelefoon } from "./agenda-derive";
import styles from "./AppointmentDetail.module.css";

export interface Selectie {
  dag: AgendaDag;
  item: AgendaItem;
}

interface AppointmentDetailProps {
  selectie: Selectie | null;
  onClose: () => void;
  /** Afspraak afronden (alleen voor niet-deadlines). */
  onAfronden: () => void;
  /** Afspraak verzetten naar een nieuw ISO-tijdstip (alleen live, met leadId).
   *  Optioneel: zonder handler blijft de verzet-knop verborgen. */
  onVerzetten?: (newIso: string) => void;
  /** Open de route & contact-kaart voor deze afspraak. */
  onRoute: () => void;
}

/**
 * Lokale (Amsterdam) datum+tijd-string "YYYY-MM-DDTHH:MM" uit de afspraak-ISO,
 * geschikt als waarde voor een datetime-local input. De gebruiker zit in NL,
 * dus de input-waarde wordt straks weer als Amsterdam-tijd geïnterpreteerd
 * (zelfde aanpak als de mobiele herplan-sheet).
 */
function isoToLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Detail van een afspraak: afronden + verzetten + route naar klant (port van
 *  PAgenda, uitgebreid met de bestaande reschedule-action). */
export function AppointmentDetail({
  selectie,
  onClose,
  onAfronden,
  onVerzetten,
  onRoute,
}: AppointmentDetailProps) {
  const isDeadline = selectie?.item.type === "deadline";
  const canReschedule = Boolean(
    onVerzetten && selectie?.item.leadId && selectie?.item.iso,
  );

  const [herplannen, setHerplannen] = useState(false);
  const [nieuweTijd, setNieuweTijd] = useState("");

  function open(item: AgendaItem) {
    setNieuweTijd(item.iso ? isoToLocalInput(item.iso) : "");
    setHerplannen(true);
  }

  function bevestigVerzetten() {
    if (!onVerzetten || !nieuweTijd) return;
    const local = new Date(`${nieuweTijd}:00`);
    if (!Number.isFinite(local.getTime())) return;
    onVerzetten(local.toISOString());
    setHerplannen(false);
  }

  function close() {
    setHerplannen(false);
    onClose();
  }

  return (
    <Modal open={!!selectie} onClose={close} width={480} label="Afspraak">
      {selectie ? (
        <div className={styles.body}>
          <div className={styles.meta}>
            {selectie.dag.dag} · {selectie.item.tijd}
            {selectie.item.duur !== EMPTY_DUUR ? ` · ${selectie.item.duur}` : ""}
          </div>
          <h2 className={styles.title}>{selectie.item.titel}</h2>
          <div className={styles.sub}>{selectie.item.sub}</div>

          {!isDeadline ? (
            <>
              <button type="button" className={styles.contact} onClick={onRoute}>
                <span className={styles.contactAvatar}>{klantInitiaal(selectie.item)}</span>
                <span className={styles.contactMain}>
                  <span className={styles.contactName}>{klantNaam(selectie.item)}</span>
                  <span className={styles.contactSub}>
                    {klantTelefoon(selectie.item)}
                    {klantPlaats(selectie.item) ? ` · ${klantPlaats(selectie.item)}` : ""}
                  </span>
                </span>
                <span className={styles.contactCta}>
                  Route &amp; contact
                  <ArrowRight size={13} strokeWidth={2.4} />
                </span>
              </button>
              <div className={styles.checklist}>
                <strong>Checklist:</strong> hogedrukspuit · impregnatiemiddel · afzetlint
              </div>
            </>
          ) : (
            <div className={styles.deadline}>
              Offerte van <strong>&euro;395</strong> verloopt om 16:00. Surface stelt voor: stuur een herinnering met
              5% korting bij akkoord vandaag.
            </div>
          )}

          {herplannen && canReschedule ? (
            <div className={styles.herplan}>
              <label className={styles.herplanLabel} htmlFor="agenda-herplan">
                Nieuwe datum en tijd
              </label>
              <input
                id="agenda-herplan"
                type="datetime-local"
                className={styles.herplanInput}
                value={nieuweTijd}
                onChange={(e) => setNieuweTijd(e.target.value)}
              />
              <div className={styles.herplanActions}>
                <Button variant="primary" className={styles.flex} onClick={bevestigVerzetten}>
                  Bevestig verzetten
                </Button>
                <Button variant="secondary" className={styles.flex} onClick={() => setHerplannen(false)}>
                  Terug
                </Button>
              </div>
            </div>
          ) : null}

          <div className={styles.actions}>
            {!selectie.item.klaar && !isDeadline ? (
              <Button variant="primary" className={styles.flex} onClick={onAfronden}>
                <Check size={15} strokeWidth={2.6} />
                Afronden
              </Button>
            ) : null}
            {!isDeadline && canReschedule && !herplannen ? (
              <Button variant="secondary" className={styles.flex} onClick={() => open(selectie.item)}>
                <CalendarClock size={15} strokeWidth={2.4} />
                Verzetten
              </Button>
            ) : null}
            {isDeadline ? (
              <Button variant="primary" className={styles.flex} onClick={close}>
                Stuur herinnering
              </Button>
            ) : null}
            <Button variant="secondary" className={styles.flex} onClick={close}>
              Sluiten
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
