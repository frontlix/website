"use client";

import { CalendarClock } from "lucide-react";
import type { DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import { AfspraakPrintButton } from "./AfspraakPrintButton";
import styles from "./AfspraakTab.module.css";

interface AfspraakTabProps {
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
}

/** Afspraak-tab: toont de ingeplande afspraak van deze lead (zelfde info als de
 *  agenda-modal, maar lead-specifiek) + een uitprint-knop die direct een nette
 *  afspraak-PDF maakt en de printdialoog opent (geen nieuw tabblad). */
export function AfspraakTab({ data = DOSSIER }: AfspraakTabProps) {
  const a = data.afspraak;

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className="rb-section-label">Ingeplande afspraak</span>
        {a.gepland ? (
          <AfspraakPrintButton info={a} triggerClassName={styles.printBtn} label="Uitprinten" />
        ) : null}
      </div>

      {!a.gepland ? (
        <div className={styles.leeg}>
          <CalendarClock size={26} strokeWidth={1.8} />
          <p>Nog geen afspraak ingepland voor deze lead.</p>
        </div>
      ) : (
        <>
          {/* Datum + tijd banner */}
          <div className={styles.banner}>
            <div>
              <span className={styles.bannerLabel}>Datum</span>
              <span className={styles.bannerValue}>{a.datumLang || "Onbekend"}</span>
            </div>
            <div className={styles.bannerTijd}>
              <span className={styles.bannerLabel}>Tijd</span>
              <span className={styles.bannerValue}>{a.tijd || "Onbekend"}</span>
            </div>
          </div>

          {/* Klus */}
          <section className={styles.kaart}>
            <h3 className={styles.kaartTitel}>Klus</h3>
            {a.dienst ? <Row label="Dienst" value={a.dienst} /> : null}
            {a.subDiensten ? <Row label="Werkzaamheden" value={a.subDiensten} /> : null}
            {a.oppervlakte ? <Row label="Oppervlakte" value={a.oppervlakte} /> : null}
            {a.groeneAanslag ? <Row label="Groene aanslag" value="Aanwezig" /> : null}
            {a.plantenAfschermen ? <Row label="Planten" value="Afschermen" /> : null}
          </section>

          {/* Locatie + contact */}
          <div className={styles.grid}>
            <section className={styles.kaart}>
              <h3 className={styles.kaartTitel}>Locatie</h3>
              {a.adres ? <Row label="Adres" value={a.adres} /> : null}
              {a.plaats ? <Row label="Plaats" value={a.plaats} /> : null}
              {a.reisAfstand ? (
                <Row
                  label="Reisafstand"
                  value={a.reisTijd ? `${a.reisAfstand} · ${a.reisTijd}` : a.reisAfstand}
                />
              ) : null}
            </section>
            <section className={styles.kaart}>
              <h3 className={styles.kaartTitel}>Contact</h3>
              {a.telefoon ? <Row label="Telefoon" value={a.telefoon} /> : null}
            </section>
          </div>

          {a.geboektOp ? (
            <p className={styles.voet}>Afspraak geboekt op {a.geboektOp}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Label-boven-waarde-rij binnen een kaart. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}
