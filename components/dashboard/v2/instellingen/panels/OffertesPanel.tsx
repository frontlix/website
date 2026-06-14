"use client";

import { Minus, Plus } from "lucide-react";
import { Toggle } from "@/components/dashboard/v2/ui";
import { Field } from "../Field";
import type { OffertesInstellingen } from "../instellingen-data";
import styles from "./panels.module.css";

interface OffertesPanelProps {
  offertes: OffertesInstellingen;
  onChange: (patch: Partial<OffertesInstellingen>) => void;
}

/** Offertes: standaardinstellingen die echt op tenant_settings worden
 *  opgeslagen (geldigheid, BTW, betaaltermijn, offertenummer-voorvoegsel) en
 *  door zowel het dashboard als de bot worden gebruikt bij het maken van een
 *  offerte. Aanbetaling staat nog op "Binnenkort". */
export function OffertesPanel({ offertes, onChange }: OffertesPanelProps) {
  // Aanbetaling is nog niet gebouwd: de toggle staat uit en wijzigt niets.
  const aanbetalingAan = false;

  // Jaar voor het voorbeeld-nummer (client-side, zelfde jaar op server en client).
  const jaar = new Date().getFullYear();
  const prefix = offertes.prefix.trim() || "SS";

  return (
    <>
      <div className={`${styles.grid2} ${styles.gridTop}`}>
        <div>
          <div className={styles.fieldLabel}>Geldigheid</div>
          <div className={styles.geldigStepper}>
            <button
              type="button"
              className={styles.geldigBtn}
              onClick={() => onChange({ geldigheid: Math.max(7, offertes.geldigheid - 7) })}
              disabled={offertes.geldigheid <= 7}
              aria-label="Geldigheid verlagen"
            >
              <Minus size={15} strokeWidth={2.5} />
            </button>
            <span className={styles.geldigValue}>{offertes.geldigheid} dagen</span>
            <button
              type="button"
              className={styles.geldigBtn}
              onClick={() => onChange({ geldigheid: Math.min(60, offertes.geldigheid + 7) })}
              disabled={offertes.geldigheid >= 60}
              aria-label="Geldigheid verhogen"
            >
              <Plus size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <Field
          label="BTW-tarief"
          value={offertes.btw}
          onChange={(v) => onChange({ btw: v })}
          suffix="%"
        />
        <Field
          label="Betaaltermijn"
          value={offertes.betaaltermijn}
          onChange={(v) => onChange({ betaaltermijn: v.replace(/[^0-9]/g, "") })}
          suffix="dagen na afronding"
        />
        <div>
          <Field
            label="Offertenummer, voorvoegsel"
            value={offertes.prefix}
            onChange={(v) => onChange({ prefix: v.toUpperCase().replace(/[^A-Z0-9-]/g, "") })}
          />
          <div className={styles.veldUitleg}>
            Elke offerte krijgt automatisch een uniek, doorlopend nummer: voorvoegsel + jaar + volgnummer,
            bijvoorbeeld <strong className={styles.strong}>{prefix}-{jaar}-001</strong>, {prefix}-{jaar}-002. Het
            volgnummer loopt vanzelf op en begint elk jaar opnieuw bij 001.
          </div>
        </div>
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.rowMain}>
          <div className={styles.rowTitle}>
            Aanbetaling vragen{" "}
            <span className={styles.demoBadge}>Binnenkort</span>
          </div>
          <div className={styles.rowSub}>
            25% vooraf bij klussen boven €750, deze instelling werken we binnenkort uit
          </div>
        </div>
        <Toggle
          value={aanbetalingAan}
          onChange={() => {}}
          aria-label="Aanbetaling vragen, binnenkort beschikbaar"
        />
      </div>
    </>
  );
}
