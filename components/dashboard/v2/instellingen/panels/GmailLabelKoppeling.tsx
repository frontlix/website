// components/dashboard/v2/instellingen/panels/GmailLabelKoppeling.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { GmailConnectionState } from "../instellingen-data";

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

  const result = searchParams.get("gmail"); // ok | error | state_error | forbidden | null

  function koppel() {
    const naam = labelName.trim() || DEFAULT_LABEL;
    window.location.href = `/api/integrations/gmail/authorize?label=${encodeURIComponent(naam)}`;
  }

  async function ontkoppel() {
    setBusy(true);
    await fetch("/api/integrations/gmail/disconnect", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  if (!live) {
    return null; // demo-fallback: geen acties
  }

  return (
    <div style={{ marginTop: 12 }}>
      {result === "ok" && <p>Gmail gekoppeld. Nieuwe goedkeuringsmails krijgen automatisch het label.</p>}
      {result && result !== "ok" && <p>Koppelen is niet gelukt. Probeer het opnieuw.</p>}

      {gmail.connected ? (
        <div>
          <p>
            Gekoppeld als <strong>{gmail.googleEmail ?? "onbekend account"}</strong>, label{" "}
            <strong>{gmail.labelName ?? DEFAULT_LABEL}</strong>.
          </p>
          <button type="button" onClick={ontkoppel} disabled={busy}>
            {busy ? "Bezig..." : "Ontkoppelen"}
          </button>
        </div>
      ) : (
        <div>
          <label>
            Naam van het label
            <input
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              maxLength={100}
            />
          </label>
          <button type="button" onClick={koppel}>
            Maak automatisch een mapje in mijn mail
          </button>
        </div>
      )}

      <button type="button" onClick={() => setShowHelp((v) => !v)}>
        Geen Gmail? Zo stel je het zelf in
      </button>
      {showHelp && (
        <div>
          <p>Maak in je mailprogramma een filter of regel aan met deze voorwaarde:</p>
          <ul>
            <li>Onderwerp bevat: <code>Offerte ter goedkeuring</code></li>
          </ul>
          <p>Laat de mail in je inbox staan en koppel er een label of map aan, bijvoorbeeld <strong>{DEFAULT_LABEL}</strong>.</p>
        </div>
      )}
    </div>
  );
}
