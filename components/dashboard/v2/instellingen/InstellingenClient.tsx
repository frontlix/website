"use client";

import { useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/dashboard/v2/ui";
import { SettingsNav } from "@/components/dashboard/v2/instellingen/SettingsNav";
import {
  SETTINGS_SUBHEAD,
  DAYS_DEFAULT,
  OPENING_DEFAULTS,
  OPENING_TEMPLATES,
  type SettingsSection,
  type CompanyProfile,
  type Service,
  type DaySlot,
  type Reminder,
  type NotificationSetting,
  type TeamMember,
  type OffertesInstellingen,
  type EmailConnectionState,
  type WhatsAppConnectionState,
  type GmailConnectionState,
} from "@/components/dashboard/v2/instellingen/instellingen-data";
import type { PricingRuleRow } from "@/components/dashboard/v2/instellingen/instellingen-mappers";
import type { PricingImpactBaseline } from "@/lib/dashboard/pricing-impact-queries";
import type { TagWithCount } from "@/lib/dashboard/tags-queries";
import type { TemplateAanvraag } from "@/lib/dashboard/template-queries";
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
import { EmailPanel } from "@/components/dashboard/v2/instellingen/panels/EmailPanel";
import { OpeningsberichtPanel } from "@/components/dashboard/v2/instellingen/panels/OpeningsberichtPanel";
import { RemindersPanel } from "@/components/dashboard/v2/instellingen/panels/RemindersPanel";
import { OffertesPanel } from "@/components/dashboard/v2/instellingen/panels/OffertesPanel";
import { TeamPanel } from "@/components/dashboard/v2/instellingen/panels/TeamPanel";
import { MeldingenPanel } from "@/components/dashboard/v2/instellingen/panels/MeldingenPanel";
import { AbonnementPanel } from "@/components/dashboard/v2/instellingen/panels/AbonnementPanel";
import { AccountPanel } from "@/components/dashboard/v2/instellingen/panels/AccountPanel";
import { AvgPanel } from "@/components/dashboard/v2/instellingen/panels/AvgPanel";
import panelStyles from "@/components/dashboard/v2/instellingen/panels/panels.module.css";
import styles from "@/app/dashboard/v2/instellingen/page.module.css";

import { saveOmzetDoelMaand } from "@/lib/dashboard/omzet-doel-actions";
import { updateBedrijfsprofiel } from "@/lib/dashboard/bedrijfsprofiel-actions";
import { triggerBotConfigReload } from "@/lib/dashboard/bot-reload-actions";
import { saveOffertesInstellingen } from "@/lib/dashboard/offertes-instellingen-actions";
import { saveBeschikbaarheid } from "@/lib/dashboard/beschikbaarheid-actions";
import { toggleServiceOffering } from "@/lib/dashboard/service-offerings-actions";
import type {
  NotificationEventType,
  NotificationPreferenceRow,
} from "@/lib/dashboard/notifications/types";

export interface InstellingenClientProps {
  profiel: CompanyProfile;
  radius: number;
  /** Minimale klusgrootte (m2) buiten de straal (tenant_settings.radius_min_m2_buiten_straal). */
  minM2: number;
  diensten: Service[];
  /** Beschikbaarheid (werkdagen + tijden) uit tenant_settings.beschikbaarheid. */
  dagen: DaySlot[];
  /** dienst-naam (label) → dienst_key voor de toggle-actie. */
  dienstKeyByNaam: Record<string, string>;
  /** Bewerkbare offerte-instellingen (geldigheid, btw, betaaltermijn, prefix). */
  offertes: OffertesInstellingen;
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
  /** E-mailkoppel-status (email_connections), voor het EmailPanel. */
  email: EmailConnectionState;
  /** WhatsApp-koppel-status (whatsapp_connections), voor het WhatsAppPanel. */
  whatsapp: WhatsAppConnectionState;
  /** Gmail-label-koppelstatus (gmail_connections), voor het BedrijfsprofielPanel. */
  gmail: GmailConnectionState;
  /** Bewerkbare thuisbasis-velden (saveTenantBase: postcode + huisnummer + label). */
  basePostcode: string;
  baseHuisnummer: string;
  baseLabel: string;
  baseHasCoords: boolean;
  baseLat: number | null;
  baseLng: number | null;
  /** Huidige logo-URL (tenant_settings.logo_url); null = nog geen logo. */
  logoUrl: string | null;
  /** Template-aanvragen (openingsbericht + reminders), nieuwste eerst. */
  templateAanvragen: TemplateAanvraag[];
  /** Huidig e-mailadres (s.user.email) voor het Account-paneel; "" in demo. */
  userEmail: string;
  /** Ruwe notification_preferences-rijen voor de volledige meldingen-grid. */
  notifPrefs: NotificationPreferenceRow[];
  /** Daily-digest-tijd (HH:MM) uit tenant_settings.daily_digest_tijd. */
  digestTijd: string;
  /** Echte omzet-stand deze maand ("€X (Y%)") voor het maanddoel-blok; "" in demo. */
  huidigeStand: string;
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
  const [minM2, setMinM2] = useState(props.minM2);

  // Diensten
  const [diensten, setDiensten] = useState<Service[]>(props.diensten);
  // Beschikbaarheid (init uit echte data; opslaan via saveBeschikbaarheid).
  const [dagen, setDagen] = useState<DaySlot[]>(props.dagen);
  // Openingsbericht: tekst is bewerkbaar en wordt bij Opslaan INGEDIEND via
  // requestTemplateChange (Slack + Meta-approval). OpeningsberichtPanel
  // registreert hieronder zijn indien-functie; de globale Opslaan-knop roept
  // die aan. activeTab = template-key (lead_intake_*).
  const [openTab, setOpenTab] = useState(OPENING_TEMPLATES[0].key);
  const [openTpl, setOpenTpl] = useState<Record<string, string>>(OPENING_DEFAULTS);
  const openingSubmitRef = useRef<(() => Promise<void>) | null>(null);
  // Reminders: het paneel slaat de dagen direct op (op blur) en registreert
  // hier z'n indien-functie voor de tekst-templates (zelfde flow als opening).
  const remindersSubmitRef = useRef<(() => Promise<void>) | null>(null);
  // Reminders (dagen uit echte data, tekst placeholder)
  const [reminders, setReminders] = useState<Reminder[]>(props.reminders);
  // Meldingen (toggles uit echte data)
  const [meldingen] = useState<NotificationSetting[]>(props.meldingen);
  // Offertes: geldigheid, BTW, betaaltermijn en offertenummer-voorvoegsel,
  // echt opgeslagen op tenant_settings via de globale Opslaan-knop.
  const [offertes, setOffertes] = useState<OffertesInstellingen>(props.offertes);

  // E-mailkoppeling: status uit email_connections. Het EmailPanel koppelt en
  // ontkoppelt via z'n eigen "Testen en koppelen"/"Ontkoppelen"-knoppen (eigen
  // API-routes + router.refresh), net als het IntegratiesPanel. Niet gekoppeld
  // aan de globale Opslaan-knop.
  const [email] = useState<EmailConnectionState>(props.email);


  // Prijzen: PrijzenPanel registreert hier zijn batch-save-handle, zodat de
  // globale Opslaan-knop de pending prijswijzigingen wegschrijft (geen eigen
  // "Alles opslaan"-knop meer in het paneel).
  const prijzenSaveRef = useRef<PricingSaveHandle | null>(null);
  // PrijzenPanel meldt hier of er nog niet-opgeslagen prijswijzigingen openstaan.
  const pricingDirtyRef = useRef(false);

  function flashOpgeslagen() {
    setOpgeslagen(true);
    window.setTimeout(() => setOpgeslagen(false), 1600);
  }

  // ── Mutatie-handlers (hergebruiken bestaande server-actions) ────────────

  // Werkstraal: client-state die met de globale Opslaan-knop
  // (updateBedrijfsprofiel) naar tenant_settings.radius_max_km wordt
  // weggeschreven, zodat de bot/workflow de straal kan lezen.
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
        return;
      }
      // Dienst aan/uit direct naar de bot (best-effort; 60s-refresh is vangnet).
      await triggerBotConfigReload();
    });
  }

  function handleReminderDag(index: number, dag: string) {
    setReminders((rs) => rs.map((x, i) => (i === index ? { ...x, dag } : x)));
  }

  /** Globale Opslaan-knop: schrijft de batch-bare velden van het actieve paneel. */
  function bewaar() {
    // Let op: e-mailadres voor offerte-goedkeuringen en prijzen gaan bij opslaan
    // direct live naar de bot (geen extra bevestiging meer, op verzoek verwijderd).

    // Openingsbericht is geen "opslaan" maar een AANVRAAG (Meta-goedkeuring): het
    // OpeningsberichtPanel dient zelf in via requestTemplateChange en toont zijn
    // eigen statusmelding ("ingediend"). Geen generieke "Opgeslagen"-flash hier.
    if (menu === "Openingsbericht") {
      startTransition(async () => {
        await openingSubmitRef.current?.();
      });
      return;
    }

    // Reminders: net als het openingsbericht een AANVRAAG (Meta-goedkeuring) voor
    // de tekst. De dagen zijn al direct opgeslagen (op blur in het paneel). Het
    // RemindersPanel toont z'n eigen indien-status, dus geen generieke flash.
    if (menu === "Reminders") {
      startTransition(async () => {
        await remindersSubmitRef.current?.();
      });
      return;
    }

    // Account en Privacy hebben hun eigen knoppen (wachtwoord/e-mail/export/
    // verwijderen); de globale Opslaan-knop doet hier bewust niets, geen flash.
    if (menu === "Account" || menu === "Privacy") return;

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
          bot_naam: profiel.botNaam,
          adres: profiel.adres,
          postcode: profiel.postcode,
          plaats: profiel.plaats,
          eigenaar_email: profiel.mail,
          eigenaar_naam: profiel.eigenaarNaam,
          telefoon: profiel.tel,
          spoed_telefoon: profiel.spoedTel,
          radius_max_km: radius,
          min_m2_buiten_straal: minM2,
        });
        const doelNum = parseDoel(profiel.doel);
        await saveOmzetDoelMaand(doelNum);
      } else if (menu === "Prijzen") {
        // Pending prijswijzigingen wegschrijven via de in PrijzenPanel
        // geregistreerde batch-save-handle (updatePricingRulesBatch).
        await prijzenSaveRef.current?.();
      } else if (menu === "Offertes") {
        // Offerte-instellingen opslaan (geldigheid, btw, betaaltermijn, prefix).
        await saveOffertesInstellingen(offertes);
      } else if (menu === "Beschikbaarheid") {
        // Werkdagen + tijden opslaan in tenant_settings.beschikbaarheid; de
        // Surface-bot leest deze kolom om alleen binnen deze dagen/tijden
        // afspraken voor te stellen.
        await saveBeschikbaarheid(dagen);
      }
      // Andere panels (toggles/meldingen) slaan direct op bij interactie.

      // Vertel de bot dat de config is gewijzigd zodat hij direct herlaadt
      // (best-effort; de 60s-refresh van de bot is het vangnet).
      await triggerBotConfigReload();
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
            minM2={minM2}
            onMinM2={setMinM2}
            basePostcode={props.basePostcode}
            baseHuisnummer={props.baseHuisnummer}
            baseLabel={props.baseLabel}
            hasCoords={props.baseHasCoords}
            currentLat={props.baseLat}
            currentLng={props.baseLng}
            logoUrl={props.logoUrl}
            huidigeStand={props.huidigeStand}
            live={props.live}
            gmail={props.gmail}
          />
        );
      case "Diensten":
        return (
          <DienstenPanel
            diensten={diensten}
            onToggle={handleDienstToggle}
            live={props.live}
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
            onDirtyChange={(dirty) => {
              pricingDirtyRef.current = dirty;
            }}
          />
        );
      case "Tags":
        return <TagsPanel tags={props.tags} />;
      case "Beschikbaarheid":
        // Gekoppeld: de globale Opslaan-knop schrijft deze 7 dagen via
        // saveBeschikbaarheid naar tenant_settings.beschikbaarheid; de Surface-bot
        // leest die kolom bij het voorstellen van afspraak-slots (dag uit = geen
        // slots die dag).
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
          <>
            <IntegratiesPanel
              connected={props.gcal.connected}
              googleEmail={props.gcal.googleEmail}
              calendarId={props.gcal.calendarId}
            />
            <EmailPanel email={email} live={props.live} />
          </>
        );
      case "Openingsbericht":
        return (
          <OpeningsberichtPanel
            templates={openTpl}
            activeTab={openTab}
            onTab={setOpenTab}
            onChange={(tab, tekst) => setOpenTpl((t) => ({ ...t, [tab]: tekst }))}
            aanvragen={props.templateAanvragen}
            live={props.live}
            onRegisterSubmit={(handle) => {
              openingSubmitRef.current = handle;
            }}
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
            aanvragen={props.templateAanvragen}
            live={props.live}
            onRegisterSubmit={(handle) => {
              remindersSubmitRef.current = handle;
            }}
          />
        );
      case "Offertes":
        return (
          <OffertesPanel
            offertes={offertes}
            onChange={(patch) => setOffertes((o) => ({ ...o, ...patch }))}
          />
        );
      case "Team":
        return <TeamPanel leden={props.team} />;
      case "Meldingen":
        // Grid is zelfvoorzienend: schrijft per (event,kanaal) direct via
        // togglePrefAction. GEEN onToggle meer, anders schreef een
        // email/push/whatsapp-toggle stiekem ook de in_app-cel weg.
        return (
          <MeldingenPanel
            initialPrefs={props.notifPrefs}
            initialDigestTijd={props.digestTijd}
            live={props.live}
            meldingen={meldingen}
          />
        );
      case "Abonnement":
        return <AbonnementPanel />;
      case "Account":
        return <AccountPanel email={props.userEmail} live={props.live} />;
      case "Privacy":
        return <AvgPanel live={props.live} />;
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
