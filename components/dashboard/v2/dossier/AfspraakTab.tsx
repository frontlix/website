"use client";

import { CalendarClock, Printer } from "lucide-react";
import type { DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import styles from "./AfspraakTab.module.css";

interface AfspraakTabProps {
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
  /** Echte lead_id, nodig voor de uitprint-link. Zonder (demo) is de knop uit. */
  leadId?: string;
}

/** Afspraak-tab: toont de ingeplande afspraak van deze lead (zelfde info als de
 *  agenda-modal, maar lead-specifiek) + een uitprint-knop die de printbare
 *  prikbord-kaart in een nieuw tabblad opent. */
export function AfspraakTab({ data = DOSSIER, leadId }: AfspraakTabProps) {
  const a = data.afspraak;
  const kanPrinten = Boolean(leadId && a.gepland);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className="rb-section-label">Ingeplande afspraak</span>
        {kanPrinten ? (
          <a
            href={`/dashboard/afspraak-preview/${leadId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.printBtn}
          >
            <Printer size={13} strokeWidth={2.2} />
            Uitprinten
          </a>
        ) : (
          <button
            type="button"
            className={styles.printBtn}
            disabled
            title={a.gepland ? "Alleen beschikbaar met een echte lead" : "Nog geen afspraak"}
            style={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            <Printer size={13} strokeWidth={2.2} />
            Uitprinten
          </button>
        )}
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
