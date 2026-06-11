"use client";

import { useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/dashboard/v2/ui";
import { SettingsNav } from "@/components/dashboard/v2/instellingen/SettingsNav";
import {
  SETTINGS_SUBHEAD,
  DAYS_DEFAULT,
  OPENING_DEFAULTS,
  type SettingsSection,
  type CompanyProfile,
  type Service,
  type DaySlot,
  type Reminder,
  type NotificationSetting,
  type TeamMember,
} from "@/components/dashboard/v2/instellingen/instellingen-data";
import type { PricingRuleRow } from "@/components/dashboard/v2/instellingen/instellingen-mappers";
import type { PricingImpactBaseline } from "@/lib/dashboard/pricing-impact-queries";
import type { TagWithCount } from "@/lib/dashboard/tags-queries";
import { BedrijfsprofielPanel } from "@/components/dashboard/v2/instellingen/panels/BedrijfsprofielPanel";
import { DienstenPanel } from "@/components/dashboard/v2/instellingen/panels/DienstenPanel";
import {
  PrijzenPanel,
  type PricingSaveHandle,
} from "@/components/dashboard/v2/instellingen/panels/PrijzenPanel";
import { TagsPanel } from "@/components/dashboard/v2/instellingen/panels/TagsPanel";
import { BeschikbaarheidPanel } from "@/components/dashboard/v2/instellingen/panels/BeschikbaarheidPanel";
import { KanalenPanel } from "@/components/dashboard/v2/instellingen/panels/KanalenPanel";
import { IntegratiesPanel } from "@/components/dashboard/v2/instellingen/panels/IntegratiesPanel";
import { OpeningsberichtPanel } from "@/components/dashboard/v2/instellingen/panels/OpeningsberichtPanel";
import { RemindersPanel } from "@/components/dashboard/v2/instellingen/panels/RemindersPanel";
import { OffertesPanel } from "@/components/dashboard/v2/instellingen/panels/OffertesPanel";
import { TeamPanel } from "@/components/dashboard/v2/instellingen/panels/TeamPanel";
import { MeldingenPanel } from "@/components/dashboard/v2/instellingen/panels/MeldingenPanel";
import { AbonnementPanel } from "@/components/dashboard/v2/instellingen/panels/AbonnementPanel";
import panelStyles from "@/components/dashboard/v2/instellingen/panels/panels.module.css";
import styles from "@/app/dashboard/v2/instellingen/page.module.css";

import { saveOmzetDoelMaand } from "@/lib/dashboard/omzet-doel-actions";
import { updateBedrijfsprofiel } from "@/lib/dashboard/bedrijfsprofiel-actions";
import { saveBeschikbaarheid } from "@/lib/dashboard/beschikbaarheid-actions";
import { toggleServiceOffering } from "@/lib/dashboard/service-offerings-actions";
import { updateReminderDays } from "@/lib/dashboard/reminder-actions";
import { togglePrefAction } from "@/lib/dashboard/notifications/prefs-actions";
import type { NotificationEventType, NotificationKanaal } from "@/lib/dashboard/notifications/types";

export interface InstellingenClientProps {
  profiel: CompanyProfile;
  radius: number;
  diensten: Service[];
  /** Beschikbaarheid (werkdagen + tijden) uit tenant_settings.beschikbaarheid. */
  dagen: DaySlot[];
  /** dienst-naam (label) → dienst_key voor de toggle-actie. */
  dienstKeyByNaam: Record<string, string>;
  geldigheid: number;
  reminders: Reminder[];
  meldingen: NotificationSetting[];
  /** melding-titel → event_type voor de toggle-actie. */
  meldingEventByTitel: Record<string, NotificationEventType>;
  /** Echte team-data (approved dashboard_user_profiles), owner eerst. */
  team: TeamMember[];
  /** Prijsregels (pricing_rules) + wat-als-baseline, voor het PrijzenPanel. */
  pricing: PricingRuleRow[];
  pricingBaseline: PricingImpactBaseline | null;
  /** Tags + lead-counts (getTagsWithCounts), voor het TagsPanel. */
  tags: TagWithCount[];
  /** Google Agenda-koppelstatus (calendar_connections), voor het IntegratiesPanel. */
  gcal: { connected: boolean; googleEmail: string | null; calendarId: string | null };
  /** Bewerkbare thuisbasis-velden (saveTenantBase: postcode + huisnummer + label). */
  basePostcode: string;
  baseHuisnummer: string;
  baseLabel: string;
  baseHasCoords: boolean;
  baseLat: number | null;
  baseLng: number | null;
  /** false in de demo-fallback (geen sessie): acties zijn dan no-op. */
  live: boolean;
}

/**
 * Client-wrapper voor v2 Instellingen. Houdt de paneel-state vast (zoals de
 * oude client-page) maar wordt gevoed door echte server-data via props en
 * koppelt elke knop aan de bestaande server-actions. Visuele opzet, spacing en
 * scroll/hoogte blijven exact gelijk aan de demo-versie.
 */
export function InstellingenClient(props: InstellingenClientProps) {
  const [menu, setMenu] = useState<SettingsSection>("Bedrijfsprofiel");
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [, startTransition] = useTransition();

  // Bedrijfsprofiel + werkgebied + maanddoel (init uit echte data).
  // De thuisbasis is nu bewerkbaar in BedrijfsprofielPanel via saveTenantBase
  // (postcode + huisnummer + label + geocoding), zelfde flow als v1 TenantBaseForm.
  const [profiel, setProfiel] = useState<CompanyProfile>(props.profiel);
  const [radius, setRadius] = useState(props.radius);

  // Diensten
  const [diensten, setDiensten] = useState<Service[]>(props.diensten);
  // Beschikbaarheid (init uit echte data; opslaan via saveBeschikbaarheid).
  const [dagen, setDagen] = useState<DaySlot[]>(props.dagen);
  // Openingsbericht (tekst loopt via Meta-approval, blijft client-state)
  const [openTab, setOpenTab] = useState("Gevel");
  const [openTpl, setOpenTpl] = useState<Record<string, string>>(OPENING_DEFAULTS);
  // Reminders (dagen uit echte data, tekst placeholder)
  const [reminders, setReminders] = useState<Reminder[]>(props.reminders);
  // Meldingen (toggles uit echte data)
  const [meldingen, setMeldingen] = useState<NotificationSetting[]>(props.meldingen);
  // Offertes (aanbetaling staat op statische demo, niet aan opslag gekoppeld)
  const [geldigheid, setGeldigheid] = useState<number>(props.geldigheid);

  // Prijzen: PrijzenPanel registreert hier zijn batch-save-handle, zodat de
  // globale Opslaan-knop de pending prijswijzigingen wegschrijft (geen eigen
  // "Alles opslaan"-knop meer in het paneel).
  const prijzenSaveRef = useRef<PricingSaveHandle | null>(null);

  function flashOpgeslagen() {
    setOpgeslagen(true);
    window.setTimeout(() => setOpgeslagen(false), 1600);
  }

  // ── Mutatie-handlers (hergebruiken bestaande server-actions) ────────────

  // Werkstraal: er bestaat (nog) geen server-action voor radius_max_km, dus
  // dit blijft client-state (zoals de demo). Zie follow-ups.
  function handleRadius(next: number) {
    setRadius(next);
  }

  function handleDienstToggle(naam: string, actief: boolean) {
    setDiensten((ds) => ds.map((x) => (x.naam === naam ? { ...x, actief } : x)));
    if (!props.live) return;
    const key = props.dienstKeyByNaam[naam];
    if (!key) return;
    startTransition(async () => {
      const res = await toggleServiceOffering(key, actief);
      if (!res.ok) {
        // rollback bij fout
        setDiensten((ds) => ds.map((x) => (x.naam === naam ? { ...x, actief: !actief } : x)));
      }
    });
  }

  function handleReminderDag(index: number, dag: string) {
    setReminders((rs) => rs.map((x, i) => (i === index ? { ...x, dag } : x)));
  }

  function handleMeldingToggle(titel: string, aan: boolean) {
    setMeldingen((ms) => ms.map((x) => (x.titel === titel ? { ...x, aan } : x)));
    if (!props.live) return;
    const event = props.meldingEventByTitel[titel];
    if (!event) return;
    const kanaal: NotificationKanaal = "in_app";
    startTransition(async () => {
      const res = await togglePrefAction(event, kanaal, aan);
      if (!res.ok) {
        setMeldingen((ms) => ms.map((x) => (x.titel === titel ? { ...x, aan: !aan } : x)));
      }
    });
  }

  /** Globale Opslaan-knop: schrijft de batch-bare velden van het actieve paneel. */
  function bewaar() {
    flashOpgeslagen();
    if (!props.live) return;

    startTransition(async () => {
      if (menu === "Bedrijfsprofiel") {
        // Bedrijfsgegevens opslaan (bedrijfsnaam, adres, postcode, plaats,
        // e-mail, telefoon) + maanddoel (parse nl-formaat "25.000" → 25000).
        // De thuisbasis heeft een eigen "Opslaan & geocoden"-knop in
        // BedrijfsprofielPanel (saveTenantBase, met geocoding).
        await updateBedrijfsprofiel({
          bedrijfsnaam: profiel.naam,
          adres: profiel.adres,
          postcode: profiel.postcode,
          plaats: profiel.plaats,
          eigenaar_email: profiel.mail,
          telefoon: profiel.tel,
        });
        const doelNum = parseDoel(profiel.doel);
        await saveOmzetDoelMaand(doelNum);
      } else if (menu === "Prijzen") {
        // Pending prijswijzigingen wegschrijven via de in PrijzenPanel
        // geregistreerde batch-save-handle (updatePricingRulesBatch).
        await prijzenSaveRef.current?.();
      } else if (menu === "Reminders") {
        // reminder_dag_1/2/3 opslaan.
        for (let i = 0; i < reminders.length && i < 3; i++) {
          const num = (i + 1) as 1 | 2 | 3;
          const days = parseInt(reminders[i].dag, 10);
          if (Number.isInteger(days) && days >= 1 && days <= 90) {
            await updateReminderDays(num, days);
          }
        }
      } else if (menu === "Beschikbaarheid") {
        // Werkdagen + tijden opslaan in tenant_settings.beschikbaarheid; de
        // Surface-bot leest deze kolom om alleen binnen deze dagen/tijden
        // afspraken voor te stellen.
        await saveBeschikbaarheid(dagen);
      }
      // Andere panels (toggles/meldingen) slaan direct op bij interactie.
    });
  }

  function renderPanel() {
    switch (menu) {
      case "Bedrijfsprofiel":
        return (
          <BedrijfsprofielPanel
            profiel={profiel}
            onProfiel={(patch) => setProfiel((p) => ({ ...p, ...patch }))}
            radius={radius}
            onRadius={handleRadius}
            basePostcode={props.basePostcode}
            baseHuisnummer={props.baseHuisnummer}
            baseLabel={props.baseLabel}
            hasCoords={props.baseHasCoords}
            currentLat={props.baseLat}
            currentLng={props.baseLng}
            live={props.live}
          />
        );
      case "Diensten & prijzen":
        return (
          <DienstenPanel
            diensten={diensten}
            onToggle={handleDienstToggle}
          />
        );
      case "Prijzen":
        return (
          <PrijzenPanel
            rules={props.pricing}
            baseline={props.pricingBaseline}
            onRegisterSave={(handle) => {
              prijzenSaveRef.current = handle;
            }}
          />
        );
      case "Tags":
        return <TagsPanel tags={props.tags} />;
      case "Beschikbaarheid":
        // TODO(hoofd-agent): koppelen aan tenant_settings.beschikbaarheid +
        // saveBeschikbaarheid-action. Tot die DB-kolom bestaat blijft dit
        // lokale state (geen server-action naar een niet-bestaande kolom).
        return (
          <BeschikbaarheidPanel
            dagen={dagen}
            onToggle={(dag, aan) =>
              setDagen((ds) => ds.map((x) => (x.dag === dag ? { ...x, aan } : x)))
            }
            onTime={(dag, veld, waarde) =>
              setDagen((ds) =>
                ds.map((x) => (x.dag === dag ? { ...x, [veld]: waarde } : x)),
              )
            }
          />
        );
      case "Kanalen":
        return <KanalenPanel />;
      case "Integraties":
        return (
          <IntegratiesPanel
            connected={props.gcal.connected}
            googleEmail={props.gcal.googleEmail}
            calendarId={props.gcal.calendarId}
          />
        );
      case "Openingsbericht":
        return (
          <OpeningsberichtPanel
            templates={openTpl}
            activeTab={openTab}
            onTab={setOpenTab}
            onChange={(tab, tekst) => setOpenTpl((t) => ({ ...t, [tab]: tekst }))}
          />
        );
      case "Reminders":
        return (
          <RemindersPanel
            reminders={reminders}
            onDag={handleReminderDag}
            onTekst={(index, tekst) =>
              setReminders((rs) => rs.map((x, i) => (i === index ? { ...x, tekst } : x)))
            }
          />
        );
      case "Offertes":
        return <OffertesPanel geldigheid={geldigheid} onGeldigheid={setGeldigheid} />;
      case "Team":
        return <TeamPanel leden={props.team} />;
      case "Meldingen":
        return <MeldingenPanel meldingen={meldingen} onToggle={handleMeldingToggle} />;
      case "Abonnement":
        return <AbonnementPanel />;
      default:
        return null;
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Instellingen</h1>

      <div className={styles.layout}>
        <SettingsNav active={menu} onSelect={setMenu} />

        <Card pad="none" className={`${styles.panel} ${panelStyles.vars}`}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>{menu}</h2>
              <div className={styles.panelSub}>{SETTINGS_SUBHEAD[menu]}</div>
            </div>
            <button
              type="button"
              onClick={bewaar}
              className={`${styles.saveBtn} ${opgeslagen ? styles.saved : ""}`}
            >
              {opgeslagen ? (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  Opgeslagen
                </>
              ) : (
                "Opslaan"
              )}
            </button>
          </div>

          <div className={styles.panelBody}>{renderPanel()}</div>
        </Card>
      </div>
    </div>
  );
}

// ── Parse-helpers (nl-formaat ↔ getal) ──────────────────────────────────

/** "25.000" / "€25.000" → 25000; lege string → null (= doel wissen). */
function parseDoel(raw: string): number | null {
  const cleaned = (raw ?? "").replace(/[^0-9]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
