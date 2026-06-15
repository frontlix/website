"use client";

// ─────────────────────────────────────────────────────────────────────
// "Vandaag"-paneel onder de compacte week: toont voor de afspraak van vandaag
// hetzelfde als de Route & contact-modal (route, adres/telefoon, navigeren/
// bellen/WhatsApp) + Afronden, inline. Links de afspraak + contact + acties,
// rechts de mini-routekaart met adres en vertrektijd. Afronden hangt aan de
// handler uit AgendaView (server-action / demo). Geen DB-logica hier.
// ─────────────────────────────────────────────────────────────────────

import { Check, Navigation, Phone, MessageCircle } from "lucide-react";
import { Card, Button, Avatar } from "@/components/dashboard/v2/ui";
import { RouteMap } from "./RouteMap";
import { KlusDetails } from "./KlusDetails";
import type { AgendaItem, RouteBase } from "./agenda-data";
import { EMPTY_DUUR } from "./agenda-data";
import {
  klantNaam,
  klantInitiaal,
  klantTelefoon,
  klantPlaats,
  klantAdres,
  eindTijd,
  reisLabel,
  mapsHref,
  normalizeTel,
} from "./agenda-derive";
import styles from "./TodayPanel.module.css";

interface TodayPanelProps {
  /** De afspraak van vandaag, of null wanneer er vandaag niets staat. */
  item: AgendaItem | null;
  /** Afspraak van vandaag afronden. */
  onAfronden: () => void;
  /** Open "nieuwe afspraak" (lege staat). */
  onPlan: () => void;
  /** True terwijl het afronden loopt: knop disabled + "Bezig…" als feedback. */
  bezig?: boolean;
  /** Vertrekadres/werkplaats voor de live routekaart; null = SVG-fallback. */
  base?: RouteBase | null;
}

export function TodayPanel({ item, onAfronden, onPlan, bezig, base }: TodayPanelProps) {
  if (!item) {
    return (
      <Card pad="none" className={styles.empty}>
        <span className={styles.emptyText}>Geen afspraak vandaag.</span>
        <Button variant="secondary" size="sm" onClick={onPlan}>
          + Plan iets in
        </Button>
      </Card>
    );
  }

  const eind = eindTijd(item);
  const reis = reisLabel(item.afstandKm);
  const subregel =
    item.duur !== EMPTY_DUUR ? `${item.duur} werk · ${item.sub}` : item.sub;
  const adres = klantAdres(item);
  const tel = normalizeTel(klantTelefoon(item));

  return (
    <Card pad="none" className={styles.panel}>
      <div className={styles.left}>
        <div className={styles.kicker}>
          Vandaag · {item.tijd}
          {eind ? ` tot ${eind}` : ""}
        </div>
        <h2 className={styles.title}>
          {item.klaar ? (
            <Check size={20} strokeWidth={3} className={styles.titleCheck} />
          ) : null}
          {item.titel}
        </h2>
        <div className={styles.sub}>{subregel}</div>

        {item.klusInfo ? <KlusDetails info={item.klusInfo} /> : null}

        <div className={styles.contact}>
          <Avatar
            name={klantNaam(item)}
            initials={klantInitiaal(item)}
            size={36}
            radius={12}
          />
          <span className={styles.contactMain}>
            <span className={styles.contactName}>{klantNaam(item)}</span>
            <span className={styles.contactSub}>
              {klantTelefoon(item)}
              {klantPlaats(item) ? ` · ${klantPlaats(item)}` : ""}
            </span>
          </span>
        </div>

        <div className={styles.actions}>
          {item.klaar ? (
            <span className={styles.donePill}>
              <Check size={14} strokeWidth={3} />
              Afgerond
            </span>
          ) : (
            <Button variant="primary" onClick={onAfronden} disabled={bezig}>
              <Check size={15} strokeWidth={2.6} />
              {bezig ? "Bezig…" : "Afronden"}
            </Button>
          )}
          <a
            href={mapsHref(adres)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.actionBtn} ${styles.actionSec}`}
          >
            <Navigation size={15} strokeWidth={2.4} />
            Start navigatie
          </a>
          <a href={`tel:${tel}`} className={`${styles.actionBtn} ${styles.actionSec}`}>
            <Phone size={15} strokeWidth={2.4} />
            Bel
          </a>
          <a
            href={`https://wa.me/${tel}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.actionBtn} ${styles.actionWa}`}
          >
            <MessageCircle size={15} strokeWidth={2.4} />
            WhatsApp
          </a>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.routeLabel}>Route naar de klant</div>
        <RouteMap
          reistijd={reis?.tijd}
          afstand={reis?.afstand}
          klant={{ lat: item.lat, lng: item.lng }}
          base={base}
        />
        <div className={styles.tiles}>
          <div className={styles.tile}>
            <div className={styles.tileLabel}>Adres</div>
            <div className={styles.tileVal}>{adres}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
