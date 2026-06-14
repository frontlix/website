"use client";

import { useState, useTransition } from "react";
import { Check, AlertTriangle, Plus, X } from "lucide-react";
import { Toggle, Button } from "@/components/dashboard/v2/ui";
import { Field } from "../Field";
import { requestNewService } from "@/lib/dashboard/dienst-aanvraag-actions";
import type { Service } from "../instellingen-data";
import styles from "./panels.module.css";

interface DienstenPanelProps {
  diensten: Service[];
  onToggle: (naam: string, actief: boolean) => void;
  /** false in de demo-fallback (geen sessie): de aanvraag wordt dan niet verstuurd. */
  live: boolean;
}

type AanvraagStatus =
  | { kind: "idle" }
  | { kind: "success" }
  | { kind: "demo" }
  | { kind: "error"; message: string };

const LEEG = {
  naam: "",
  omschrijving: "",
  prijsmodel: "",
  indicatie: "",
  botVragen: "",
  opmerking: "",
};

const PRIJSMODEL_OPTIES = [
  { value: "", label: "Kies een prijsmodel" },
  { value: "per_m2", label: "Per m²" },
  { value: "vast", label: "Vast bedrag" },
  { value: "per_uur", label: "Per uur" },
  { value: "op_aanvraag", label: "Op aanvraag" },
];

/**
 * Diensten met aan/uit-toggle (gekoppeld aan service_offerings) plus een
 * "Dienst toevoegen"-uitklapformulier. Een dienst écht zelf toevoegen kan niet
 * zinvol vanuit het dashboard (bot-intake + prijslogica leven in de Surface-
 * config), dus dit is een AANVRAAG: de gegevens gaan via requestNewService als
 * Slack-melding naar Frontlix, wij zetten de dienst handmatig klaar.
 *
 * Geen prijs-kolom op de lijst: in v1 leven prijzen volledig apart
 * (PrijzenEditor, gekeyd op pricing_rules.rule_key) en worden service_offerings
 * en pricing_rules nooit gejoind. We spiegelen v1 DienstenSection: alleen toggles.
 */
export function DienstenPanel({ diensten, onToggle, live }: DienstenPanelProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(LEEG);
  const [status, setStatus] = useState<AanvraagStatus>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof LEEG>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    if (status.kind !== "idle") setStatus({ kind: "idle" });
  }

  function toggleForm() {
    setOpen((o) => !o);
    setStatus({ kind: "idle" });
  }

  function verstuur() {
    if (!form.naam.trim()) {
      setStatus({ kind: "error", message: "Geef de dienst een naam." });
      return;
    }
    if (!live) {
      // Demo-fallback: niets versturen, wel de owner laten zien wat er zou gebeuren.
      setStatus({ kind: "demo" });
      return;
    }
    startTransition(async () => {
      const res = await requestNewService({
        naam: form.naam,
        omschrijving: form.omschrijving,
        prijsmodel: form.prijsmodel,
        indicatiePrijs: form.indicatie,
        botVragen: form.botVragen,
        opmerking: form.opmerking,
      });
      if (res.ok) {
        setForm(LEEG);
        setOpen(false);
        setStatus({ kind: "success" });
      } else {
        setStatus({ kind: "error", message: res.error });
      }
    });
  }

  return (
    <div className={styles.list}>
      {diensten.map((d) => (
        <div key={d.naam} className={styles.row}>
          <Toggle
            value={d.actief}
            onChange={(v) => onToggle(d.naam, v)}
            aria-label={`${d.naam} aan of uit`}
          />
          <span className={`${styles.rowTitle} ${styles.rowMain} ${d.actief ? "" : styles.dim}`}>
            {d.naam}
          </span>
        </div>
      ))}

      {!open && (
        <Button variant="secondary" size="sm" className={styles.addBtn} onClick={toggleForm}>
          <Plus size={15} strokeWidth={2.5} />
          Dienst toevoegen
        </Button>
      )}

      {/* Bevestiging na een geslaagde aanvraag (form is dan ingeklapt). */}
      {!open && status.kind === "success" && (
        <div className={`${styles.baseStatus} ${styles.baseStatusOk} ${styles.addBtn}`}>
          <Check size={14} strokeWidth={2.5} />
          Aanvraag verstuurd, we zetten de dienst voor je klaar.
        </div>
      )}

      {open && (
        <div className={styles.section}>
          <div className={styles.addHead}>
            <div>
              <div className={styles.sectionTitle}>Dienst aanvragen</div>
              <div className={styles.sectionSub}>
                Vul de dienst in, wij configureren de bot en prijs en zetten hem voor je klaar.
              </div>
            </div>
            <button type="button" onClick={toggleForm} className={styles.addClose} aria-label="Sluiten">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className={styles.baseForm}>
            <div className={styles.baseFull}>
              <Field
                label="Dienstnaam"
                value={form.naam}
                onChange={(v) => set("naam", v)}
                placeholder="bijv. Terras reinigen"
              />
            </div>
            <div className={styles.baseFull}>
              <Field
                label="Wat houdt het in"
                value={form.omschrijving}
                onChange={(v) => set("omschrijving", v)}
                placeholder="Korte omschrijving van de dienst"
                multiline
              />
            </div>
            <Field
              label="Hoe prijzen?"
              value={form.prijsmodel}
              onChange={(v) => set("prijsmodel", v)}
              options={PRIJSMODEL_OPTIES}
            />
            <Field
              label="Indicatieve prijs"
              value={form.indicatie}
              onChange={(v) => set("indicatie", v)}
              placeholder="bijv. €4 per m² of vanaf €150"
            />
            <div className={styles.baseFull}>
              <Field
                label="Wat moet de bot uitvragen? (optioneel)"
                value={form.botVragen}
                onChange={(v) => set("botVragen", v)}
                placeholder="bijv. oppervlakte in m², type ondergrond"
                multiline
              />
            </div>
            <div className={styles.baseFull}>
              <Field
                label="Opmerking (optioneel)"
                value={form.opmerking}
                onChange={(v) => set("opmerking", v)}
                placeholder="Iets wat we moeten weten"
                multiline
              />
            </div>

            <div className={styles.baseActions}>
              <button
                type="button"
                onClick={verstuur}
                disabled={pending || !form.naam.trim()}
                className={styles.geoBtn}
              >
                {pending ? "Versturen…" : "Aanvraag versturen"}
              </button>

              {status.kind === "error" && (
                <span className={`${styles.baseStatus} ${styles.baseStatusErr}`}>
                  <AlertTriangle size={13} />
                  {status.message}
                </span>
              )}
              {status.kind === "demo" && (
                <span className={`${styles.baseStatus} ${styles.baseStatusInfo}`}>
                  In de demo wordt de aanvraag niet verstuurd.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
