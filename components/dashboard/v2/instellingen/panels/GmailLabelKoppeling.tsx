// components/dashboard/v2/instellingen/panels/GmailLabelKoppeling.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, AlertTriangle, ExternalLink } from "lucide-react";
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

  const effectiveLabelName = gmail.labelName ?? DEFAULT_LABEL;

  return (
    <div style={{ marginTop: 16 }}>
      {/* OAuth-terugmelding */}
      {result === "ok" && (
        <span className={`${integStyles.status} ${integStyles.statusOk}`}>
          <Check size={13} strokeWidth={2.5} />
          Label aangemaakt in je Gmail. Stel hieronder zelf het filter in.
        </span>
      )}
      {result && result !== "ok" && (
        <span className={`${integStyles.status} ${integStyles.statusErr}`}>
          <AlertTriangle size={13} />
          Koppelen is niet gelukt. Probeer het opnieuw.
        </span>
      )}

      {gmail.connected ? (
        /* ── Gekoppeld: label weergeven + filter-instructie + ontkoppelknop ── */
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
              {effectiveLabelName}
            </span>
          </div>

          {/* Filter-instructie */}
          <div
            style={{
              marginTop: 14,
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
                fontWeight: 700,
                color: "var(--rb-ink)",
                lineHeight: 1.55,
              }}
            >
              Label &lsquo;{effectiveLabelName}&rsquo; staat klaar in je Gmail.
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 12.5,
                color: "var(--rb-ink)",
                lineHeight: 1.6,
              }}
            >
              Nog één keer instellen, dan komen je goedkeuringsmails er automatisch in: open Gmail,
              zoek op de mails met onderwerp &ldquo;Offerte ter goedkeuring&rdquo;, klik op
              &ldquo;Filter maken&rdquo; en kies het label &ldquo;{effectiveLabelName}&rdquo;.
            </p>
            <div style={{ marginTop: 10 }}>
              <a
                href="https://mail.google.com/mail/u/0/#search/subject%3A%22Offerte+ter+goedkeuring%22"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--rb-blue)",
                  textDecoration: "none",
                }}
              >
                Open de zoekopdracht in Gmail
                <ExternalLink size={13} strokeWidth={2.5} />
              </a>
            </div>
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
              Maak dit label aan in mijn Gmail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
