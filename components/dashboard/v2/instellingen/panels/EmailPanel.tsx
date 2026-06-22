"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Check, AlertTriangle, Info } from "lucide-react";
import { StatusPill } from "@/components/dashboard/v2/ui";
import { Field } from "../Field";
import {
  EMAIL_PROVIDERS,
  type EmailConnectionState,
  type EmailProviderKey,
} from "../instellingen-data";
import integrStyles from "./IntegratiesPanel.module.css";
import panelStyles from "./panels.module.css";

export interface EmailPanelProps {
  /** Begin-status uit email_connections (server-side via getEmailConnectionStatus). */
  email: EmailConnectionState;
  /** false in de demo-fallback (geen sessie): de connect/disconnect-acties zijn dan no-op. */
  live: boolean;
}

/**
 * E-mailkoppeling (Instellingen > Integraties, eigen blok onder de Google
 * Agenda-koppeling). Een bedrijf koppelt zijn eigen verzendadres (SMTP met
 * wachtwoord) zodat offertes en klant-mail aantoonbaar vanuit dat adres
 * vertrekken. Drie statussen: niet gekoppeld (velden + testen), gekoppeld
 * (groen + ontkoppelen, leeg wachtwoordveld voor de bewerk-flow) en
 * needs_reconnect (rode banner + opnieuw koppelen). Microsoft 365 is hard
 * geblokkeerd in de UI; de connect-route weigert het ook server-side.
 * Routes: POST /api/integrations/email/connect en /disconnect.
 */
export function EmailPanel({ email, live }: EmailPanelProps) {
  const router = useRouter();

  const connected = email.connected;
  const needsReconnect = connected && Boolean(email.needsReconnect);

  // Form-state. Bij een bestaande koppeling vullen we de bekende velden voor,
  // maar het wachtwoordveld blijft leeg (bewerk-flow: leeg = huidige houden).
  const initialProvider: EmailProviderKey = (email.provider as EmailProviderKey) ?? "hostinger";
  const [provider, setProvider] = useState<EmailProviderKey>(initialProvider);
  const [smtpHost, setSmtpHost] = useState(
    EMAIL_PROVIDERS[initialProvider]?.smtpHost ?? "",
  );
  const [smtpPort, setSmtpPort] = useState(
    String(EMAIL_PROVIDERS[initialProvider]?.smtpPort ?? 465),
  );
  const [security, setSecurity] = useState<"ssl" | "starttls">(
    EMAIL_PROVIDERS[initialProvider]?.security ?? "ssl",
  );
  const [emailAdres, setEmailAdres] = useState(email.email ?? "");
  const [wachtwoord, setWachtwoord] = useState("");
  const [afzenderNaam, setAfzenderNaam] = useState(email.senderName ?? "");
  const [replyTo, setReplyTo] = useState(email.replyTo ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMicrosoft = provider === "microsoft";
  const preset = EMAIL_PROVIDERS[provider];

  /** Provider-keuze voorvult host, poort en beveiliging (behalve bij "Anders"). */
  function handleProvider(next: EmailProviderKey) {
    setProvider(next);
    setError(null);
    const p = EMAIL_PROVIDERS[next];
    if (!p) return;
    if (p.smtpHost !== null) setSmtpHost(p.smtpHost);
    setSmtpPort(String(p.smtpPort));
    setSecurity(p.security);
  }

  async function connect() {
    if (!live || isMicrosoft || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/email/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          smtp_host: smtpHost.trim(),
          smtp_port: Number(smtpPort),
          security,
          email: emailAdres.trim(),
          password: wachtwoord,
          sender_name: afzenderNaam.trim(),
          reply_to: replyTo.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Koppelen mislukt. Probeer het opnieuw.");
        return;
      }
      // Server-prop herladen zodat de groene "Gekoppeld"-staat verschijnt.
      setWachtwoord("");
      router.refresh();
    } catch {
      setError("Koppelen mislukt. Controleer je verbinding en probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!live || busy) return;
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/integrations/email/disconnect", { method: "POST" });
      router.refresh();
    } catch {
      setError("Ontkoppelen mislukt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  // De koppel-velden tonen we wanneer er nog geen werkende koppeling is, of
  // wanneer de koppeling opnieuw moet (needs_reconnect).
  const toonVelden = !connected || needsReconnect;

  return (
    <>
      <div className={integrStyles.head}>
        <span className={integrStyles.headIcon}>
          <Mail size={22} />
        </span>
        <div className={integrStyles.headBody}>
          <div className={integrStyles.headTitleRow}>
            <span className={integrStyles.headTitle}>E-mail (eigen adres)</span>
            {connected && !needsReconnect ? (
              <StatusPill kind="new">Gekoppeld</StatusPill>
            ) : needsReconnect ? (
              <StatusPill kind="hot">Werkt niet meer</StatusPill>
            ) : (
              <StatusPill kind="sent">Niet gekoppeld</StatusPill>
            )}
          </div>
          <div className={integrStyles.headSub}>
            Koppel je eigen verzendadres zodat offertes en klant-mail vanuit jouw
            adres vertrekken, niet vanuit Frontlix.
          </div>
        </div>
      </div>

      <div className={integrStyles.body}>
        {connected && !needsReconnect && (
          <div className={integrStyles.accountRow}>
            <span className={integrStyles.accountLabel}>Gekoppeld als</span>
            <span className={integrStyles.accountValue}>
              {email.email ?? "onbekend adres"}
            </span>
          </div>
        )}

        {needsReconnect && (
          <div className={`${integrStyles.status} ${integrStyles.statusErr}`}>
            <AlertTriangle size={13} />
            Je e-mailkoppeling werkt niet meer (wachtwoord gewijzigd of verlopen).
            Klant-mail gaat nu tijdelijk weer vanaf Frontlix. Koppel opnieuw om
            vanaf je eigen adres te versturen.
          </div>
        )}

        {toonVelden && (
          <>
            <div className={`${panelStyles.grid2} ${panelStyles.gridTop}`}>
              <Field
                label="Provider"
                value={provider}
                onChange={(v) => handleProvider(v as EmailProviderKey)}
                options={EMAIL_PROVIDERS_OPTIONS}
                breed
              />
              <Field
                label="SMTP-server"
                value={smtpHost}
                onChange={setSmtpHost}
                placeholder={preset?.hostHint ?? "smtp.jouwhoster.nl"}
              />
              <Field
                label="Poort"
                value={smtpPort}
                onChange={(v) => setSmtpPort(v.replace(/[^0-9]/g, ""))}
              />
              <Field
                label="Beveiliging"
                value={security}
                onChange={(v) => setSecurity(v as "ssl" | "starttls")}
                options={SECURITY_OPTIONS}
              />
              <div className={panelStyles.wide}>
                <Field
                  label="E-mailadres"
                  value={emailAdres}
                  onChange={setEmailAdres}
                  placeholder="offertes@jouwbedrijf.nl"
                  breed
                />
                <div className={panelStyles.veldUitleg}>
                  Gebruik exact het adres waarmee je inlogt bij je hoster, geen
                  alias. Een afwijkend afzenderadres wordt door de mailserver
                  geweigerd.
                </div>
              </div>
              <Field
                label="Wachtwoord"
                value={wachtwoord}
                onChange={setWachtwoord}
                type="password"
                placeholder={
                  connected
                    ? "laat leeg om huidig wachtwoord te houden"
                    : "wachtwoord van je mailbox"
                }
              />
              <Field
                label="Afzendernaam"
                value={afzenderNaam}
                onChange={setAfzenderNaam}
                placeholder="Jouw bedrijfsnaam"
              />
              <Field
                label="Reply-to (optioneel)"
                value={replyTo}
                onChange={setReplyTo}
                placeholder="info@jouwbedrijf.nl"
                breed
              />
            </div>

            {preset?.caveat && (
              <div className={integrStyles.liveNote}>
                <Info size={14} className={integrStyles.liveNoteIcon} />
                <span>{preset.caveat}</span>
              </div>
            )}

            {isMicrosoft && (
              <div className={`${integrStyles.status} ${integrStyles.statusErr}`}>
                <AlertTriangle size={13} />
                Microsoft 365 ondersteunt geen wachtwoord-SMTP meer (sinds april
                2026). Gebruik een mailbox bij een NL-hoster, bijvoorbeeld
                Hostinger of TransIP.
              </div>
            )}

            {error && (
              <div className={`${integrStyles.status} ${integrStyles.statusErr}`}>
                <AlertTriangle size={13} />
                {error}
              </div>
            )}

            <div className={integrStyles.actions}>
              <button
                type="button"
                className={`${integrStyles.btnLink} ${integrStyles.btnPrimary}`}
                onClick={connect}
                disabled={busy || isMicrosoft || !live}
              >
                {busy ? "Bezig..." : "Testen en koppelen"}
              </button>
              {connected && (
                <button
                  type="button"
                  className={`${integrStyles.btnLink} ${integrStyles.btnSecondary}`}
                  onClick={disconnect}
                  disabled={busy || !live}
                >
                  Ontkoppelen
                </button>
              )}
            </div>
          </>
        )}

        {connected && !needsReconnect && (
          <>
            <div className={`${panelStyles.grid2} ${panelStyles.gridTop}`}>
              <Field
                label="Afzendernaam"
                value={afzenderNaam}
                onChange={setAfzenderNaam}
                placeholder="Jouw bedrijfsnaam"
              />
              <Field
                label="Reply-to (optioneel)"
                value={replyTo}
                onChange={setReplyTo}
                placeholder="info@jouwbedrijf.nl"
              />
              <Field
                label="Wachtwoord"
                value={wachtwoord}
                onChange={setWachtwoord}
                type="password"
                placeholder="laat leeg om huidig wachtwoord te houden"
                breed
              />
            </div>

            {error && (
              <div className={`${integrStyles.status} ${integrStyles.statusErr}`}>
                <AlertTriangle size={13} />
                {error}
              </div>
            )}

            {email.testPassedAt && (
              <span className={`${integrStyles.status} ${integrStyles.statusOk}`}>
                <Check size={13} strokeWidth={2.5} />
                Laatst getest op {formatTest(email.testPassedAt)}.
              </span>
            )}

            <div className={integrStyles.actions}>
              <button
                type="button"
                className={`${integrStyles.btnLink} ${integrStyles.btnPrimary}`}
                onClick={connect}
                disabled={busy || !live}
              >
                {busy ? "Bezig..." : "Testen en koppelen"}
              </button>
              <button
                type="button"
                className={`${integrStyles.btnLink} ${integrStyles.btnSecondary}`}
                onClick={disconnect}
                disabled={busy || !live}
              >
                Ontkoppelen
              </button>
            </div>
          </>
        )}

        <div className={integrStyles.liveNote}>
          <Info size={14} className={integrStyles.liveNoteIcon} />
          <span>
            Koppelen test je op de live site. Een wijziging is binnen een minuut
            actief in je geautomatiseerde berichten.
          </span>
        </div>
      </div>
    </>
  );
}

// Provider-opties voor de select (key + zichtbaar label).
const EMAIL_PROVIDERS_OPTIONS = Object.entries(EMAIL_PROVIDERS).map(
  ([value, p]) => ({ value, label: p.label }),
);

const SECURITY_OPTIONS = [
  { value: "ssl", label: "SSL (poort 465)" },
  { value: "starttls", label: "STARTTLS (poort 587)" },
];

/** Datum-string (ISO) → leesbare nl-datum, streep-vrij. */
function formatTest(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
