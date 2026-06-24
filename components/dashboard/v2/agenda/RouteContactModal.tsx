"use client";

import { Navigation, Phone, MessageCircle, Check, CalendarClock, X, Printer } from "lucide-react";
import { Modal, Button } from "@/components/dashboard/v2/ui";
import type { AgendaItem, RouteBase } from "./agenda-data";
import { klantNaam, klantAdres, klantTelefoon, mapsHref, normalizeTel, reisLabel } from "./agenda-derive";
import { RouteMap } from "./RouteMap";
import { KlusDetails } from "./KlusDetails";
import styles from "./RouteContactModal.module.css";

interface RouteContactModalProps {
  item: AgendaItem | null;
  onClose: () => void;
  /** Afspraak afronden (klus/bezoek). Zonder handler blijft de knop verborgen. */
  onAfronden?: () => void;
  /** Afspraak verzetten (klus/bezoek). Zonder handler blijft de knop verborgen. */
  onVerzetten?: () => void;
  /** Afspraak annuleren (klus/bezoek). Zonder handler blijft de knop verborgen. */
  onAnnuleren?: () => void;
  /** Vertrekadres/werkplaats voor de live routekaart; null = SVG-fallback. */
  base?: RouteBase | null;
}

/** Route & contact-kaart: mini-route, adres/telefoon en navigeren/bellen/
 *  WhatsApp (port van PAgenda). De knoppen openen echte deep-links naar Google
 *  Maps, de telefoon en WhatsApp op basis van het klantadres/-nummer. */
export function RouteContactModal({ item, onClose, onAfronden, onVerzetten, onAnnuleren, base }: RouteContactModalProps) {
  const reis = item ? reisLabel(item.afstandKm) : null;
  const adres = item ? klantAdres(item) : "";
  const telefoon = item ? klantTelefoon(item) : "";
  const tel = normalizeTel(telefoon);
  const kanAfronden = Boolean(item && onAfronden && item.type !== "deadline");
  const kanVerzetten = Boolean(item && onVerzetten && item.type !== "deadline");
  const kanAnnuleren = Boolean(item && onAnnuleren && item.type !== "deadline");

  return (
    <Modal open={!!item} onClose={onClose} width={540} label="Route en contact">
      {item ? (
        <div className={styles.body}>
          <div className={styles.kicker}>Route &amp; contact</div>
          <h2 className={styles.title}>{klantNaam(item)}</h2>
          <div className={styles.sub}>
            {item.sub} · {item.tijd}
          </div>

          {item.klusInfo ? <KlusDetails info={item.klusInfo} /> : null}

          <RouteMap
            reistijd={reis?.tijd}
            afstand={reis?.afstand}
            klant={{ lat: item.lat, lng: item.lng }}
            base={base}
          />

          <div className={styles.grid}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>Adres</div>
              <div className={styles.fieldValue}>{adres}</div>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>Telefoon</div>
              <div className={styles.fieldValue}>{telefoon}</div>
            </div>
          </div>

          {item.klaar ? (
            <div className={styles.afrondRow}>
              <span className={styles.donePill}>
                <Check size={14} strokeWidth={3} />
                Afgerond
              </span>
            </div>
          ) : kanAfronden ? (
            <Button variant="primary" className={styles.afrondBtn} onClick={onAfronden}>
              <Check size={15} strokeWidth={2.6} />
              Afronden
            </Button>
          ) : null}

          {kanVerzetten || kanAnnuleren ? (
            <div className={styles.beheerRow}>
              {kanVerzetten ? (
                <Button variant="secondary" className={styles.flex} onClick={onVerzetten}>
                  <CalendarClock size={15} strokeWidth={2.4} />
                  Verzetten
                </Button>
              ) : null}
              {kanAnnuleren ? (
                <Button variant="ghost" className={styles.flex} onClick={onAnnuleren}>
                  <X size={15} strokeWidth={2.4} />
                  Annuleren
                </Button>
              ) : null}
            </div>
          ) : null}

          {/* Uitprint-knop: opent een printbare A4-kaart met alle afspraakinfo
              in een nieuw tabblad (voor op het prikbord). Alleen bij een echte
              lead; externe Google-afspraken (geen leadId) hebben geen detail. */}
          {item.leadId ? (
            <a
              href={`/dashboard/afspraak-preview/${item.leadId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.printBtn}
            >
              <Printer size={15} strokeWidth={2.4} />
              Afspraak uitprinten
            </a>
          ) : null}

          <div className={styles.actions}>
            <a
              href={mapsHref(adres)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.flexWide} ${styles.navLink}`}
            >
              <Navigation size={15} strokeWidth={2.4} />
              Start navigatie
            </a>
            <a href={`tel:${tel}`} className={`${styles.flex} ${styles.belBtn}`}>
              <Phone size={15} strokeWidth={2.4} />
              Bel
            </a>
            <a
              href={`https://wa.me/${tel}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.flex} ${styles.waBtn}`}
            >
              <MessageCircle size={15} strokeWidth={2.4} />
              WhatsApp
            </a>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
