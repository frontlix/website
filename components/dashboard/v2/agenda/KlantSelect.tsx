"use client";

// Gestylede klant-autocomplete voor "Nieuwe afspraak": zoek in bestaande leads
// (live: echte leads, demo: demo-leads). Vervangt de native datalist met een
// dropdown in de rebrand-stijl. Vrij typen mag, een keuze koppelt het lead.

import { useState } from "react";
import { Search } from "lucide-react";
import styles from "./KlantSelect.module.css";

export interface KlantOptie {
  /** Lead-id bij een echte koppeling (live). Demo/vrij getypt: leeg. */
  leadId?: string;
  naam: string;
  plaats?: string;
  telefoon?: string;
  adres?: string;
  afstandKm?: number;
}

interface KlantSelectProps {
  klanten: KlantOptie[];
  /** Huidige tekst in het veld. */
  value: string;
  /** Tekstwijziging + (bij keuze uit de lijst) het gekoppelde lead. */
  onChange: (value: string, gekozen: KlantOptie | null) => void;
}

function initialen(naam: string): string {
  const parts = naam.trim().split(/\s+/);
  const eerste = parts[0]?.[0] ?? "";
  const laatste = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (eerste + laatste).toUpperCase() || "K";
}

export function KlantSelect({ klanten, value, onChange }: KlantSelectProps) {
  const [open, setOpen] = useState(false);

  const q = value.trim().toLowerCase();
  const matches = (q
    ? klanten.filter((k) => k.naam.toLowerCase().includes(q))
    : klanten
  ).slice(0, 8);

  function kies(k: KlantOptie) {
    onChange(k.naam, k);
    setOpen(false);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        <Search size={15} strokeWidth={2.2} className={styles.icon} />
        <input
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => {
            onChange(e.target.value, null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Zoek een klant (optioneel)"
          autoComplete="off"
        />
      </div>

      {open && matches.length > 0 ? (
        <div className={styles.dropdown}>
          {matches.map((k) => (
            <button
              type="button"
              key={k.leadId ?? k.naam}
              className={styles.option}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => kies(k)}
            >
              <span className={styles.avatar}>{initialen(k.naam)}</span>
              <span className={styles.optMain}>
                <span className={styles.optName}>{k.naam}</span>
                {k.plaats ? <span className={styles.optSub}>{k.plaats}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
