"use client";

import { useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { Check, AlertTriangle, MapPin } from "lucide-react";
import { Button } from "@/components/dashboard/v2/ui";
import { saveTenantBase } from "@/lib/dashboard/tenant-base-actions";
import { uploadTenantLogo } from "@/lib/dashboard/logo-actions";
import { Field } from "../Field";
import type { CompanyProfile } from "../instellingen-data";
import styles from "./panels.module.css";

interface BedrijfsprofielPanelProps {
  profiel: CompanyProfile;
  onProfiel: (patch: Partial<CompanyProfile>) => void;
  radius: number;
  onRadius: (next: number) => void;
  /** Huidige logo-URL (tenant_settings.logo_url); null = nog geen logo. */
  logoUrl: string | null;
  /** Echte omzet-stand deze maand ("€X (Y%)"); leeg = toon verwijzing naar Overzicht. */
  huidigeStand?: string;
  /** Bewerkbare thuisbasis-velden (saveTenantBase: postcode + huisnummer + label). */
  basePostcode: string;
  baseHuisnummer: string;
  baseLabel: string;
  hasCoords: boolean;
  currentLat: number | null;
  currentLng: number | null;
  /** false in demo-fallback (geen sessie): de geocode-actie wordt dan niet aangeroepen. */
  live: boolean;
}

type BaseStatus =
  | { kind: "idle" }
  | { kind: "success"; lat: number; lng: number; city: string | null }
  | { kind: "error"; message: string };

/** Bedrijfsprofiel: logo, gegevens, werkgebied (adres + straal) en maanddoel. */
export function BedrijfsprofielPanel({
  profiel,
  onProfiel,
  radius,
  onRadius,
  logoUrl: propLogoUrl,
  basePostcode,
  baseHuisnummer,
  baseLabel,
  hasCoords,
  currentLat,
  currentLng,
  huidigeStand,
  live,
}: BedrijfsprofielPanelProps) {
  // Thuisbasis-velden, bewerkbaar (gemirrord van v1 TenantBaseForm).
  const [postcode, setPostcode] = useState(basePostcode);
  const [huisnummer, setHuisnummer] = useState(baseHuisnummer);
  const [label, setLabel] = useState(baseLabel || "BASIS");
  const [status, setStatus] = useState<BaseStatus>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  // Werkstraal als invulveld: lokale string-buffer zodat vrij typen (en even
  // leegmaken) soepel gaat; de geparste km-waarde gaat via onRadius naar de
  // parent, die hem met de globale "Opslaan"-knop wegschrijft naar
  // tenant_settings.radius_max_km (saveBedrijfsprofiel).
  const [straalInput, setStraalInput] = useState(String(radius));

  // Logo-upload: lokale state zodat een nieuw logo direct zichtbaar is, los van
  // de server-revalidatie. uploadTenantLogo doet de upload naar de storage-
  // bucket + opslag van de URL op tenant_settings.logo_url.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(propLogoUrl);
  const [logoPending, startLogoTransition] = useTransition();
  const [logoError, setLogoError] = useState<string | null>(null);
  const initiaal = (profiel.naam.trim().charAt(0) || "?").toUpperCase();

  function pickLogo() {
    if (!live) return;
    fileInputRef.current?.click();
  }

  function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset, zodat hetzelfde bestand opnieuw kan triggeren
    if (!file || !live) return;
    setLogoError(null);
    const fd = new FormData();
    fd.append("logo", file);
    startLogoTransition(async () => {
      const res = await uploadTenantLogo(fd);
      if (res.ok) setLogoUrl(res.url);
      else setLogoError(res.error);
    });
  }

  function bewaarBasis() {
    setStatus({ kind: "idle" });
    if (!live) return;
    startTransition(async () => {
      const res = await saveTenantBase({ postcode, huisnummer, label });
      if (res.ok) {
        setStatus({ kind: "success", lat: res.lat, lng: res.lng, city: res.city });
      } else {
        setStatus({ kind: "error", message: res.error });
      }
    });
  }

  return (
    <>
      <div className={styles.logoRow}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Bedrijfslogo" className={styles.logoImg} />
        ) : (
          <div className={styles.logo}>{initiaal}</div>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onLogoChange}
            hidden
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={pickLogo}
            disabled={!live || logoPending}
          >
            {logoPending ? "Uploaden…" : "Logo wijzigen"}
          </Button>
          <div className={`${styles.logoHint} ${logoError ? styles.logoHintErr : ""}`}>
            {logoError ?? "PNG, JPG of WebP · min. 400×400 · max 2 MB"}
          </div>
        </div>
      </div>

      {/* Bedrijfsgegevens: bewerkbaar zodra er een sessie is. Wijzigingen lopen
          via onProfiel naar de parent-state en worden door de globale
          "Opslaan"-knop weggeschreven met updateBedrijfsprofiel
          (tenant_settings). Zonder sessie (demo-fallback) blijven de velden
          read-only/placeholder. KvK staat niet op tenant_settings en is daarom
          geen veld. */}
      <div className={`${styles.grid2} ${styles.gridTop}`}>
        <Field
          label="Bedrijfsnaam"
          value={profiel.naam}
          onChange={(v) => onProfiel({ naam: v })}
          readOnly={!live}
        />
        <Field
          label="Bot-naam"
          value={profiel.botNaam}
          onChange={(v) => onProfiel({ botNaam: v })}
          readOnly={!live}
        />
        <Field
          label="Adres"
          value={profiel.adres}
          onChange={(v) => onProfiel({ adres: v })}
          readOnly={!live}
          breed
        />
        <Field
          label="Postcode"
          value={profiel.postcode}
          onChange={(v) => onProfiel({ postcode: v })}
          readOnly={!live}
        />
        <Field
          label="Plaats"
          value={profiel.plaats}
          onChange={(v) => onProfiel({ plaats: v })}
          readOnly={!live}
        />
        <Field
          label="Eigenaar (naam)"
          value={profiel.eigenaarNaam}
          onChange={(v) => onProfiel({ eigenaarNaam: v })}
          readOnly={!live}
        />
        <Field
          label="Eigenaar WhatsApp"
          value={profiel.tel}
          onChange={(v) => onProfiel({ tel: v })}
          readOnly={!live}
        />
        <Field
          label="Spoed-telefoon"
          value={profiel.spoedTel}
          onChange={(v) => onProfiel({ spoedTel: v })}
          readOnly={!live}
        />
        <Field
          label="E-mail"
          value={profiel.mail}
          onChange={(v) => onProfiel({ mail: v })}
          readOnly={!live}
          breed
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Werkgebied</div>
        <div className={styles.sectionSub}>
          Vul je thuisbasis in en kies de straal waarbinnen je werkt, Surface accepteert klussen daarbinnen automatisch
        </div>

        {/* Thuisbasis: bewerkbaar. Bij opslaan geocodet saveTenantBase de
            postcode + huisnummer via postcode.tech naar base_lat/lng + label
            op tenant_settings (zelfde flow als v1 TenantBaseForm). */}
        <div className={styles.baseForm}>
          <Field label="Postcode" value={postcode} onChange={setPostcode} />
          <Field label="Huisnummer" value={huisnummer} onChange={setHuisnummer} />
          <Field label="Pin-label" value={label} onChange={setLabel} breed />

          <div className={styles.baseActions}>
            <button
              type="button"
              onClick={bewaarBasis}
              disabled={pending || !postcode.trim() || !huisnummer.trim()}
              className={styles.geoBtn}
            >
              {pending ? "Geocoden…" : "Opslaan & geocoden"}
            </button>

            {hasCoords && status.kind === "idle" && (
              <span className={`${styles.baseStatus} ${styles.baseStatusInfo}`}>
                <MapPin size={13} />
                Huidige basis:{" "}
                <span className={styles.baseCoords}>
                  {currentLat?.toFixed(5)}, {currentLng?.toFixed(5)}
                </span>
              </span>
            )}
            {status.kind === "success" && (
              <span className={`${styles.baseStatus} ${styles.baseStatusOk}`}>
                <Check size={13} strokeWidth={2.5} />
                Opgeslagen{status.city ? ` · ${status.city}` : ""} ·{" "}
                <span className={styles.baseCoords}>
                  {status.lat.toFixed(5)}, {status.lng.toFixed(5)}
                </span>
              </span>
            )}
            {status.kind === "error" && (
              <span className={`${styles.baseStatus} ${styles.baseStatusErr}`}>
                <AlertTriangle size={13} />
                {status.message}
              </span>
            )}
          </div>
        </div>

        <div className={styles.goalGrid}>
          <Field
            label="Werkstraal"
            value={straalInput}
            onChange={(v) => {
              const cleaned = v.replace(/[^0-9]/g, "");
              setStraalInput(cleaned);
              const n = parseInt(cleaned, 10);
              if (Number.isFinite(n)) onRadius(n);
            }}
            suffix="km"
            readOnly={!live}
          />
          <div className={styles.goalHint}>
            Surface accepteert klussen automatisch binnen deze straal vanaf je thuisbasis
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Maanddoel</div>
        <div className={styles.sectionSub}>De omzet-ring op je Overzicht rekent naar dit doel toe</div>
        <div className={styles.goalGrid}>
          <Field
            label="Doel deze maand"
            value={profiel.doel}
            onChange={(v) => onProfiel({ doel: v })}
            prefix="€"
            suffix="per maand"
          />
          <div className={styles.goalHint}>
            {huidigeStand ? (
              <>
                Huidige stand: <strong className={styles.strong}>{huidigeStand}</strong> deze maand
              </>
            ) : (
              <>Je actuele stand zie je op het Overzicht</>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
