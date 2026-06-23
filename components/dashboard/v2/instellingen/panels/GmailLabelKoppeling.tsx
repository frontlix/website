// components/dashboard/v2/instellingen/panels/GmailLabelKoppeling.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { StatusPill } from "@/components/dashboard/v2/ui";
import type { GmailConnectionState } from "../instellingen-data";
import integStyles from "./IntegratiesPanel.module.css";
import fieldStyles from "../Field.module.css";

interface Props {
  gmail: GmailConnectionState;
  live: boolean;
}

const DEFAULT_LABEL = "Offertes ter goedkeuring";

export default function GmailLabelKoppeling({ gmail, live }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [labelName, setLabelName] = useState(gmail.labelName ?? DEFAULT_LABEL);
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [ontkoppelFout, setOntkoppelFout] = useState(false);

  const result = searchParams.get("gmail"); // ok | error | state_error | forbidden | null

  function koppel() {
    const naam = labelName.trim() || DEFAULT_LABEL;
    window.location.href = `/api/integrations/gmail/authorize?label=${encodeURIComponent(naam)}`;
  }

  async function ontkoppel() {
    setBusy(true);
    setOntkoppelFout(false);
    const res = await fetch("/api/integrations/gmail/disconnect", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setOntkoppelFout(true);
      return;
    }
    router.refresh();
  }

  if (!live) {
    return null; // demo-fallback: geen acties
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* OAuth-terugmelding */}
      {result === "ok" && (
        <span className={`${integStyles.status} ${integStyles.statusOk}`}>
          <Check size={13} strokeWidth={2.5} />
          Gmail gekoppeld. Nieuwe goedkeuringsmails krijgen automatisch het label.
        </span>
      )}
      {result && result !== "ok" && (
        <span className={`${integStyles.status} ${integStyles.statusErr}`}>
          <AlertTriangle size={13} />
          Koppelen is niet gelukt. Probeer het opnieuw.
        </span>
      )}

      {gmail.connected ? (
        /* ── Gekoppeld: account + label weergeven, ontkoppelknop ── */
        <div style={{ marginTop: result ? 12 : 0 }}>
          <div className={integStyles.accountRow}>
            <span className={integStyles.accountLabel}>Gekoppeld account</span>
            <span className={integStyles.accountValue}>
              {gmail.googleEmail ?? "onbekend account"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <StatusPill kind="new">Gekoppeld</StatusPill>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--rb-muted)",
              }}
            >
              label:
            </span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--rb-ink)",
              }}
            >
              {gmail.labelName ?? DEFAULT_LABEL}
            </span>
          </div>

          <div className={integStyles.actions}>
            <button
              type="button"
              className={`${integStyles.btnLink} ${integStyles.btnSecondary}`}
              onClick={ontkoppel}
              disabled={busy}
            >
              {busy ? "Bezig..." : "Ontkoppelen"}
            </button>
          </div>

          {ontkoppelFout && (
            <span
              className={`${integStyles.status} ${integStyles.statusErr}`}
              style={{ marginTop: 8 }}
            >
              <AlertTriangle size={13} />
              Ontkoppelen is niet gelukt. Probeer het opnieuw.
            </span>
          )}
        </div>
      ) : (
        /* ── Niet gekoppeld: labelnaam-veld + koppelknop ── */
        <div style={{ marginTop: result ? 12 : 0 }}>
          <div>
            <div className={fieldStyles.label}>Naam van het label</div>
            <div className={fieldStyles.box}>
              <input
                className={fieldStyles.input}
                type="text"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          <div className={integStyles.actions}>
            <button
              type="button"
              className={`${integStyles.btnLink} ${integStyles.btnPrimary}`}
              onClick={koppel}
            >
              Maak automatisch een mapje in mijn mail
            </button>
          </div>
        </div>
      )}

      {/* ── Geen Gmail? Uitklap-hulp ── */}
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--rb-font)",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--rb-blue)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          onClick={() => setShowHelp((v) => !v)}
        >
          {showHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Geen Gmail? Zo stel je het zelf in
        </button>

        {showHelp && (
          <div
            style={{
              marginTop: 10,
              padding: "12px 16px",
              background: "var(--rb-field)",
              border: "1px solid var(--rb-line)",
              borderRadius: "var(--rb-r-card-sm)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                color: "var(--rb-ink)",
                lineHeight: 1.55,
              }}
            >
              Maak in je mailprogramma een filter of regel aan met deze voorwaarde:
            </p>
            <ul
              style={{
                margin: "8px 0 0",
                paddingLeft: 18,
                fontSize: 12.5,
                color: "var(--rb-ink)",
                lineHeight: 1.6,
              }}
            >
              <li>
                Onderwerp bevat:{" "}
                <code
                  style={{
                    fontFamily: "var(--rb-font)",
                    fontWeight: 700,
                    background: "var(--rb-field-2, var(--rb-card))",
                    border: "1px solid var(--rb-line)",
                    borderRadius: 5,
                    padding: "1px 6px",
                    fontSize: 12,
                    color: "var(--rb-ink)",
                  }}
                >
                  Offerte ter goedkeuring
                </code>
              </li>
            </ul>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 12.5,
                color: "var(--rb-muted)",
                lineHeight: 1.55,
              }}
            >
              Laat de mail in je inbox staan en koppel er een label of map aan, bijvoorbeeld{" "}
              <strong style={{ color: "var(--rb-ink)" }}>{DEFAULT_LABEL}</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
