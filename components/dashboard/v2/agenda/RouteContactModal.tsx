"use client";

import { Navigation, Phone, MessageCircle } from "lucide-react";
import { Modal } from "@/components/dashboard/v2/ui";
import type { AgendaItem } from "./agenda-data";
import { klantNaam, klantAdres, klantTelefoon } from "./agenda-derive";
import { RouteMap } from "./RouteMap";
import styles from "./RouteContactModal.module.css";

interface RouteContactModalProps {
  item: AgendaItem | null;
  onClose: () => void;
}

/** Maps-directions deep-link naar het klantadres (opent de routebeschrijving
 *  vanaf de huidige locatie in Google Maps, web of app). */
function mapsHref(adres: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adres)}`;
}

/** Nummer naar internationaal formaat voor tel:/wa.me (NL: 06… → 316…). */
function normalizeTel(tel: string): string {
  const digits = tel.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `31${digits.slice(1)}`;
  return digits;
}

/** Route & contact-kaart: mini-route, adres/telefoon en navigeren/bellen/
 *  WhatsApp (port van PAgenda). De knoppen openen echte deep-links naar Google
 *  Maps, de telefoon en WhatsApp op basis van het klantadres/-nummer. */
export function RouteContactModal({ item, onClose }: RouteContactModalProps) {
  const reistijd = item?.tijd === "09:00" ? "22 min" : "28 min";
  const adres = item ? klantAdres(item) : "";
  const telefoon = item ? klantTelefoon(item) : "";
  const tel = normalizeTel(telefoon);

  return (
    <Modal open={!!item} onClose={onClose} width={540} label="Route en contact">
      {item ? (
        <div className={styles.body}>
          <div className={styles.kicker}>Route &amp; contact</div>
          <h2 className={styles.title}>{klantNaam(item)}</h2>
          <div className={styles.sub}>
            {item.sub} · {item.tijd}
          </div>

          <RouteMap reistijd={reistijd} />

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
