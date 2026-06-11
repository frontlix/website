import { v2Session } from "@/lib/dashboard/v2/session";
import { getPricingImpactBaseline } from "@/lib/dashboard/pricing-impact-queries";
import { getTagsWithCounts, type TagWithCount } from "@/lib/dashboard/tags-queries";
import { getConnectionStatus } from "@/lib/dashboard/calendar-connection-queries";
import { getAllPrefs } from "@/lib/dashboard/notifications/queries";
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
  QUOTE_DEFAULTS,
} from "@/components/dashboard/v2/instellingen/instellingen-data";
import {
  toCompanyProfile,
  toWorkRadius,
  toDiensten,
  toGeldigheid,
  toReminders,
  toMeldingen,
  toTeam,
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
        diensten={SERVICES_DEFAULT}
        dagen={DAYS_DEFAULT}
        dienstKeyByNaam={{}}
        geldigheid={QUOTE_DEFAULTS.geldigheid}
        reminders={REMINDERS_DEFAULT}
        meldingen={NOTIFICATIONS_DEFAULT}
        meldingEventByTitel={{}}
        team={TEAM}
        pricing={[]}
        pricingBaseline={null}
        tags={[]}
        gcal={{ connected: false, googleEmail: null, calendarId: null }}
        basePostcode=""
        baseHuisnummer=""
        baseLabel="BASIS"
        baseHasCoords={false}
        baseLat={null}
        baseLng={null}
        live={false}
      />
    );
  }

  const { supabase } = s;

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
  ] = await Promise.all([
    supabase
      .from("tenant_settings")
      .select(
        "bedrijfsnaam, chatbot_naam, eigenaar_email, eigenaar_whatsapp, eigenaar_spoed_telefoon, plaats, postcode, adres, offerte_geldigheid_dagen, radius_max_km, reminder_dag_1, reminder_dag_2, reminder_dag_3, calendar_link, base_huisnummer, base_label, base_lat, base_lng, daily_digest_tijd, omzet_doel_maand",
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
    getConnectionStatus(),
  ]);

  // Casten zoals de bestaande code (Supabase geeft zonder gegen. types `never`).
  const tenant = (tenantRaw.data as TenantSettingsRow | null) ?? null;
  const pricing = (pricingRaw.data as PricingRuleRow[] | null) ?? [];
  const services = (servicesRaw.data as ServiceOfferingRow[] | null) ?? [];
  const team = (teamRaw.data as TeamMemberRow[] | null) ?? [];
  const tags = tagsRaw as TagWithCount[];
  const prefs = (notifPrefs as NotificationPreferenceRow[] | null) ?? [];

  // ── Mappers: DB-rij → bestaande v2-component-props ─────────────────────
  const dienstKeyByNaam = Object.fromEntries(buildDienstKeyLookup(services));
  const meldingEventByTitel = Object.fromEntries(buildMeldingEventLookup());

  // Beschikbaarheid (kolom 049). Apart + defensief geladen: zolang de
  // migratie nog niet is toegepast bestaat de kolom niet, dan faalt deze
  // query stil (data = null) en vallen we terug op DAYS_DEFAULT, zodat de
  // rest van de instellingen-pagina niet breekt.
  const { data: beschRow } = await supabase
    .from("tenant_settings")
    .select("beschikbaarheid")
    .limit(1)
    .maybeSingle();
  const beschVal = (beschRow as { beschikbaarheid?: DaySlot[] | null } | null)?.beschikbaarheid;
  const dagen: DaySlot[] =
    Array.isArray(beschVal) && beschVal.length === 7 ? beschVal : DAYS_DEFAULT;

  return (
    <InstellingenClient
      profiel={toCompanyProfile(tenant)}
      radius={toWorkRadius(tenant)}
      diensten={toDiensten(services)}
      dagen={dagen}
      dienstKeyByNaam={dienstKeyByNaam}
      geldigheid={toGeldigheid(tenant)}
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
      basePostcode={tenant?.postcode ?? ""}
      baseHuisnummer={tenant?.base_huisnummer ?? ""}
      baseLabel={tenant?.base_label ?? "BASIS"}
      baseHasCoords={
        typeof tenant?.base_lat === "number" && typeof tenant?.base_lng === "number"
      }
      baseLat={tenant?.base_lat ?? null}
      baseLng={tenant?.base_lng ?? null}
      live
    />
  );
}
