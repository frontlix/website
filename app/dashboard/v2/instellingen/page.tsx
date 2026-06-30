import { v2Session } from "@/lib/dashboard/v2/session";
import { getPricingImpactBaseline } from "@/lib/dashboard/pricing-impact-queries";
import { getTagsWithCounts, type TagWithCount } from "@/lib/dashboard/tags-queries";
import { getConnectionStatus } from "@/lib/dashboard/calendar-connection-queries";
import { getEmailConnectionStatus } from "@/lib/dashboard/email-connection-queries";
import { getWhatsAppConnectionStatus } from "@/lib/dashboard/whatsapp-connection-queries";
import { getGmailConnectionStatus } from "@/lib/dashboard/gmail-connection-queries";
import { getRecentTemplateAanvragen } from "@/lib/dashboard/template-queries";
import { getAllPrefs } from "@/lib/dashboard/notifications/queries";
import { getKlusStatusMelden } from "@/lib/dashboard/tenant-base";
import { countConverted, avgOfferteWaarde } from "@/lib/dashboard/stats-queries";
import { periodToRange } from "@/lib/dashboard/period";
import type { NotificationPreferenceRow } from "@/lib/dashboard/notifications/types";
import { InstellingenClient } from "@/components/dashboard/v2/instellingen/InstellingenClient";
import {
  PROFILE_DEFAULT,
  DAYS_DEFAULT,
  type DaySlot,
  WORK_RADIUS_DEFAULT,
  SERVICES_DEFAULT,
  REMINDERS_DEFAULT,
  NOTIFICATIONS_DEFAULT,
  TEAM,
  OFFERTES_DEFAULT,
} from "@/components/dashboard/v2/instellingen/instellingen-data";
import {
  toCompanyProfile,
  toWorkRadius,
  toMinM2BuitenStraal,
  toDiensten,
  toOffertesInstellingen,
  toReminders,
  toMeldingen,
  toTeam,
  toEmailConnectionState,
  toWhatsAppConnectionState,
  buildDienstKeyLookup,
  buildMeldingEventLookup,
  type TenantSettingsRow,
  type ServiceOfferingRow,
  type PricingRuleRow,
  type TeamMemberRow,
} from "@/components/dashboard/v2/instellingen/instellingen-mappers";

export const dynamic = "force-dynamic";

/**
 * v2 Instellingen, server-component. Haalt dezelfde tenant-gescopete data op
 * als de bestaande (app)/instellingen-pagina (RLS actief via s.supabase) en
 * mapt die naar de prop-vormen die de bestaande v2-panels verwachten. Zonder
 * sessie (dev-preview) vallen we terug op de demo-data zodat de pagina blijft
 * renderen. De interactie + knoppen zitten in InstellingenClient.
 */
export default async function InstellingenPage() {
  const s = await v2Session();

  // ── Demo-fallback (geen sessie, dev-preview) ───────────────────────────
  if (!s) {
    return (
      <InstellingenClient
        profiel={PROFILE_DEFAULT}
        radius={WORK_RADIUS_DEFAULT}
        minM2={200}
        diensten={SERVICES_DEFAULT}
        dagen={DAYS_DEFAULT}
        dienstKeyByNaam={{}}
        offertes={OFFERTES_DEFAULT}
        reminders={REMINDERS_DEFAULT}
        meldingen={NOTIFICATIONS_DEFAULT}
        meldingEventByTitel={{}}
        team={TEAM}
        pricing={[]}
        pricingBaseline={null}
        tags={[]}
        gcal={{ connected: false, googleEmail: null, calendarId: null }}
        email={{ connected: false }}
        whatsapp={{ connected: false }}
        gmail={{ connected: false, googleEmail: null, labelName: null }}
        basePostcode=""
        baseHuisnummer=""
        baseLabel="BASIS"
        baseHasCoords={false}
        baseLat={null}
        baseLng={null}
        logoUrl={null}
        templateAanvragen={[]}
        userEmail=""
        notifPrefs={[]}
        digestTijd="08:00"
        klusStatusMelden={true}
        huidigeStand=""
        live={false}
      />
    );
  }

  const { supabase, tenantId } = s;

  // Maand-range voor de omzet-stand; vooraf berekend zodat countConverted +
  // avgOfferteWaarde mee kunnen draaien in de Promise.all hieronder.
  const maand = periodToRange("deze-maand", new Date());

  // ── Echte data ophalen (zelfde queries/condities als de (app)-pagina) ──
  // gcal-status en tags lopen via hun eigen helpers (service-role/RLS, zoals
  // de (app)-pagina), de overige tabellen via de tenant-gescopete client.
  const [
    tenantRaw,
    pricingRaw,
    servicesRaw,
    teamRaw,
    baselineRaw,
    tagsRaw,
    notifPrefs,
    gcalStatus,
    emailStatus,
    whatsappStatus,
    gmailStatus,
    aanvragenRaw,
    convertedMaand,
    avgWaarde,
    beschRaw,
    logoRaw,
    offRaw,
    radiusExtraRaw,
    klusStatusMelden,
  ] = await Promise.all([
    supabase
      .from("tenant_settings")
      .select(
        "bedrijfsnaam, chatbot_naam, eigenaar_email, eigenaar_naam, eigenaar_whatsapp, eigenaar_spoed_telefoon, plaats, postcode, adres, offerte_geldigheid_dagen, radius_max_km, reminder_dag_1, reminder_dag_2, reminder_dag_3, calendar_link, base_huisnummer, base_label, base_lat, base_lng, daily_digest_tijd, omzet_doel_maand",
      )
      .limit(1)
      .maybeSingle(),
    // Prijzen: zelfde query als de (app)-pagina; PrijzenPanel toont ze.
    supabase
      .from("pricing_rules")
      .select("rule_key, label, waarde, eenheid, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("service_offerings")
      .select("dienst_key, label, actief, sort_order")
      .order("sort_order", { ascending: true }),
    // Team: approved dashboard_user_profiles (zelfde filter als TeamSection).
    supabase
      .from("dashboard_user_profiles")
      .select("user_id, bedrijfsnaam, is_owner, tenant_status")
      .eq("tenant_status", "approved"),
    // Wat-als-baseline (laatste 30 leads) voor de prijzen-simulator.
    getPricingImpactBaseline(30),
    getTagsWithCounts(),
    getAllPrefs(),
    tenantId
      ? getConnectionStatus(tenantId)
      : Promise.resolve({ connected: false, googleEmail: null, calendarId: null, connectedAt: null }),
    // E-mailkoppel-status (email_connections, service-role). Niet-geheim; bevat
    // nooit het wachtwoord. Het EmailPanel toont hiermee de juiste status.
    tenantId ? getEmailConnectionStatus(tenantId) : Promise.resolve({ connected: false }),
    // WhatsApp-koppel-status (whatsapp_connections, service-role). Niet-geheim;
    // bevat nooit het access-token. Het WhatsAppPanel toont hiermee de juiste
    // status (niet gekoppeld / gekoppeld / opnieuw koppelen).
    tenantId ? getWhatsAppConnectionStatus(tenantId) : Promise.resolve({ connected: false }),
    // Gmail-label-koppelstatus (gmail_connections, service-role). Niet-geheim;
    // bevat nooit het OAuth-token. Het BedrijfsprofielPanel toont hiermee de
    // juiste Gmail-koppelstatus.
    tenantId
      ? getGmailConnectionStatus(tenantId)
      : Promise.resolve({ connected: false, googleEmail: null, labelName: null }),
    // Template-aanvragen (openingsbericht + reminders); de panels filteren zelf
    // op de voor hen relevante templates.
    getRecentTemplateAanvragen(),
    // Maand-omzet + de defensief-geladen migratie-kolommen (beschikbaarheid/
    // logo/offerte) draaien nu MEE in deze Promise.all i.p.v. sequentieel erna,
    // dus parallel zonder extra round-trip-lagen. De drie tenant_settings-
    // queries blijven apart zodat een ontbrekende migratie-kolom alleen die ene
    // op default zet (niet alle drie).
    countConverted(maand),
    avgOfferteWaarde(maand),
    supabase.from("tenant_settings").select("beschikbaarheid").limit(1).maybeSingle(),
    supabase.from("tenant_settings").select("logo_url").limit(1).maybeSingle(),
    supabase
      .from("tenant_settings")
      .select("offerte_btw_tarief, offerte_betaaltermijn_dagen, offerte_nummer_prefix")
      .limit(1)
      .maybeSingle(),
    // Werkgebied-grens (057): aparte defensieve query, zodat een ontbrekende
    // migratie-kolom alleen op default terugvalt i.p.v. de hele query te breken.
    supabase
      .from("tenant_settings")
      .select("radius_min_m2_buiten_straal")
      .limit(1)
      .maybeSingle(),
    // "Klus afronden"-toggle (063): defensieve helper (ontbrekende migratie-kolom
    // → default true), zelfde patroon als getRadiusMaxKm.
    getKlusStatusMelden(),
  ]);

  // Casten zoals de bestaande code (Supabase geeft zonder gegen. types `never`).
  const tenant = (tenantRaw.data as TenantSettingsRow | null) ?? null;
  const pricing = (pricingRaw.data as PricingRuleRow[] | null) ?? [];
  const services = (servicesRaw.data as ServiceOfferingRow[] | null) ?? [];
  const team = (teamRaw.data as TeamMemberRow[] | null) ?? [];
  const tags = tagsRaw as TagWithCount[];
  const prefs = (notifPrefs as NotificationPreferenceRow[] | null) ?? [];

  // Huidige omzet-stand deze maand voor het maanddoel-blok (zelfde berekening
  // als de Overzicht-ring). convertedMaand + avgWaarde komen uit de Promise.all.
  const omzetMaand = Math.round((convertedMaand ?? 0) * (avgWaarde ?? 0));
  const omzetDoel =
    Number((tenant as { omzet_doel_maand?: number | null } | null)?.omzet_doel_maand) || 0;
  const omzetPct = omzetDoel > 0 ? Math.round((omzetMaand / omzetDoel) * 100) : null;
  const huidigeStand =
    `€${omzetMaand.toLocaleString("nl-NL")}` +
    (omzetPct != null ? ` (${omzetPct}%)` : "");

  // ── Mappers: DB-rij → bestaande v2-component-props ─────────────────────
  const dienstKeyByNaam = Object.fromEntries(buildDienstKeyLookup(services));
  const meldingEventByTitel = Object.fromEntries(buildMeldingEventLookup());

  // Beschikbaarheid (049), logo (050) en offerte-instellingen (051): defensief
  // geladen (ontbrekende migratie-kolom → data null → default), nu via de
  // Promise.all hierboven i.p.v. drie sequentiële queries.
  const beschVal = (beschRaw.data as { beschikbaarheid?: DaySlot[] | null } | null)
    ?.beschikbaarheid;
  const dagen: DaySlot[] =
    Array.isArray(beschVal) && beschVal.length === 7 ? beschVal : DAYS_DEFAULT;
  const logoUrl = (logoRaw.data as { logo_url?: string | null } | null)?.logo_url ?? null;
  const offRowObj = (offRaw.data as Partial<TenantSettingsRow> | null) ?? {};
  const radiusExtra =
    (radiusExtraRaw.data as { radius_min_m2_buiten_straal?: number | null } | null) ?? null;
  const minM2 = toMinM2BuitenStraal(radiusExtra as TenantSettingsRow | null);
  const offertes = toOffertesInstellingen(
    tenant ? ({ ...tenant, ...offRowObj } as TenantSettingsRow) : null,
  );

  return (
    <InstellingenClient
      profiel={toCompanyProfile(tenant)}
      radius={toWorkRadius(tenant)}
      minM2={minM2}
      diensten={toDiensten(services)}
      dagen={dagen}
      dienstKeyByNaam={dienstKeyByNaam}
      offertes={offertes}
      reminders={toReminders(tenant)}
      meldingen={toMeldingen(prefs)}
      meldingEventByTitel={meldingEventByTitel}
      team={toTeam(team)}
      pricing={pricing}
      pricingBaseline={baselineRaw}
      tags={tags}
      gcal={{
        connected: gcalStatus.connected,
        googleEmail: gcalStatus.googleEmail,
        calendarId: gcalStatus.calendarId,
      }}
      email={toEmailConnectionState(emailStatus)}
      whatsapp={toWhatsAppConnectionState(whatsappStatus)}
      gmail={{
        connected: gmailStatus.connected,
        googleEmail: gmailStatus.googleEmail,
        labelName: gmailStatus.labelName,
      }}
      basePostcode={tenant?.postcode ?? ""}
      baseHuisnummer={tenant?.base_huisnummer ?? ""}
      baseLabel={tenant?.base_label ?? "BASIS"}
      baseHasCoords={
        typeof tenant?.base_lat === "number" && typeof tenant?.base_lng === "number"
      }
      baseLat={tenant?.base_lat ?? null}
      baseLng={tenant?.base_lng ?? null}
      logoUrl={logoUrl}
      templateAanvragen={aanvragenRaw}
      userEmail={s.user.email ?? ""}
      notifPrefs={prefs}
      digestTijd={tenant?.daily_digest_tijd ?? "08:00"}
      klusStatusMelden={klusStatusMelden}
      huidigeStand={huidigeStand}
      live
    />
  );
}
