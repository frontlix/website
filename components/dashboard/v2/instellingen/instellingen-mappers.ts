// ─────────────────────────────────────────────────────────────────────
// Instellingen-mappers: echte Supabase-rijen → de prop-vormen die de
// bestaande v2-instellingen-panels al verwachten. De prop-vormen
// (CompanyProfile, Service, Reminder, NotificationSetting, ...) blijven
// ONGEWIJZIGD; we vullen ze met echte data i.p.v. de demo-defaults.
//
// Bron-queries staan in app/dashboard/(app)/instellingen/page.tsx en de
// lib/dashboard-helpers; deze module mapt alleen, geen DB-logica.
// ─────────────────────────────────────────────────────────────────────

import type {
  CompanyProfile,
  Service,
  Reminder,
  NotificationSetting,
  TeamMember,
  OffertesInstellingen,
  EmailConnectionState,
  WhatsAppConnectionState,
} from "./instellingen-data";
import { EMAIL_CONNECTION_DEFAULT, WHATSAPP_CONNECTION_DEFAULT } from "./instellingen-data";
import type { EmailConnectionStatus } from "@/lib/dashboard/email-connection-queries";
import type { WhatsAppConnectionStatus } from "@/lib/dashboard/whatsapp-connection-queries";
import {
  REMINDERS_DEFAULT,
  WORK_RADIUS_DEFAULT,
} from "./instellingen-data";
import type { NotificationPreferenceRow } from "@/lib/dashboard/notifications/types";
import {
  EVENT_LABELS,
  EVENT_TYPES_ORDERED,
} from "@/lib/dashboard/notifications/types";

// ── Bron-rijvormen (zelfde cast als de bestaande (app)-pagina) ──────────

export type TenantSettingsRow = {
  bedrijfsnaam: string | null;
  chatbot_naam: string | null;
  eigenaar_email: string | null;
  eigenaar_whatsapp: string | null;
  eigenaar_spoed_telefoon: string | null;
  plaats: string | null;
  postcode: string | null;
  adres: string | null;
  offerte_geldigheid_dagen: number | null;
  offerte_btw_tarief: number | null;
  offerte_betaaltermijn_dagen: number | null;
  offerte_nummer_prefix: string | null;
  radius_max_km: number | null;
  reminder_dag_1: number | null;
  reminder_dag_2: number | null;
  reminder_dag_3: number | null;
  calendar_link: string | null;
  base_huisnummer: string | null;
  base_label: string | null;
  base_lat: number | null;
  base_lng: number | null;
  daily_digest_tijd: string | null;
  omzet_doel_maand: number | null;
};

export type PricingRuleRow = {
  rule_key: string;
  label: string;
  waarde: number;
  eenheid: string | null;
  sort_order: number | null;
};

export type ServiceOfferingRow = {
  dienst_key: string;
  label: string;
  actief: boolean;
  sort_order: number | null;
};

/**
 * Eén rij uit dashboard_user_profiles (zelfde query/cast als de (app)-pagina,
 * waar TeamSection deze tenant_status='approved'-rijen toont).
 */
export type TeamMemberRow = {
  user_id: string;
  bedrijfsnaam: string | null;
  is_owner: boolean;
  tenant_status: "pending" | "approved" | "rejected";
};

// ── Bedrijfsprofiel ─────────────────────────────────────────────────────

/** tenant_settings → CompanyProfile (bedrijfsnaam, adres, contact, maanddoel).
 *  adres/postcode/plaats blijven aparte (bewerkbare) velden; KvK bestaat niet
 *  op tenant_settings en zit daarom niet in CompanyProfile. */
export function toCompanyProfile(t: TenantSettingsRow | null): CompanyProfile {
  return {
    naam: t?.bedrijfsnaam ?? "",
    botNaam: t?.chatbot_naam ?? "",
    adres: (t?.adres ?? "").trim(),
    postcode: (t?.postcode ?? "").trim(),
    plaats: (t?.plaats ?? "").trim(),
    tel: t?.eigenaar_whatsapp ?? "",
    spoedTel: t?.eigenaar_spoed_telefoon ?? "",
    mail: t?.eigenaar_email ?? "",
    doel:
      t?.omzet_doel_maand != null
        ? formatDoel(t.omzet_doel_maand)
        : "",
  };
}

/** Maanddoel als gegroepeerd getal (25000 → "25.000"), streep-vrij. */
function formatDoel(value: number): string {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(value);
}

/** Het vertrekadres-label voor het werkgebied-veld (BedrijfsprofielPanel.basis). */
export function toWorkBase(t: TenantSettingsRow | null): string {
  const delen = [
    t?.base_huisnummer ? `${t.adres ?? ""} ${t.base_huisnummer}`.trim() : t?.adres,
    t?.postcode,
    t?.plaats,
  ]
    .map((x) => (x ?? "").trim())
    .filter(Boolean);
  return delen.join(", ");
}

/** Werkstraal in km (tenant_settings.radius_max_km), met demo-default als fallback. */
export function toWorkRadius(t: TenantSettingsRow | null): number {
  return t?.radius_max_km != null ? Number(t.radius_max_km) : WORK_RADIUS_DEFAULT;
}

// ── Diensten & prijzen ──────────────────────────────────────────────────

/**
 * service_offerings (aan/uit + label) → de Service[]-vorm die DienstenPanel
 * verwacht. Diensten blijven gesorteerd op sort_order.
 *
 * GEEN prijs-join: in de (app)-implementatie worden service_offerings en
 * pricing_rules nooit gejoind (DienstenSection = toggles, PrijzenEditor leeft
 * apart op rule_key). dienst_key en rule_key vallen niet aantoonbaar samen, dus
 * een join hier zou stille lege prijzen tonen en een niet-opslaande Opslaan
 * geven. We mappen daarom alleen label + actief; bedrag/eenheid blijven leeg
 * (DienstenPanel rendert geen prijs meer, spiegelt v1).
 */
export function toDiensten(services: ServiceOfferingRow[]): Service[] {
  return [...services]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s) => ({
      naam: s.label,
      bedrag: "",
      eenheid: "",
      actief: s.actief,
    }));
}

/**
 * dienst_key opzoeken bij een paneel-naam (label). DienstenPanel werkt op
 * `naam` (= label); de toggle-actie heeft de key nodig. We bouwen de lookup
 * uit de service_offerings-rijen.
 */
export function buildDienstKeyLookup(
  services: ServiceOfferingRow[],
): Map<string, string> {
  return new Map(services.map((s) => [s.label, s.dienst_key]));
}

// ── Offertes ────────────────────────────────────────────────────────────

/** Geldigheid in dagen uit tenant_settings (default 14, zoals de demo). */
export function toGeldigheid(t: TenantSettingsRow | null): number {
  return t?.offerte_geldigheid_dagen != null
    ? Number(t.offerte_geldigheid_dagen)
    : 14;
}

/** tenant_settings → bewerkbare offerte-instellingen (geldigheid, btw,
 *  betaaltermijn, offertenummer-voorvoegsel). */
export function toOffertesInstellingen(t: TenantSettingsRow | null): OffertesInstellingen {
  return {
    geldigheid: toGeldigheid(t),
    btw: t?.offerte_btw_tarief != null ? String(t.offerte_btw_tarief) : "21",
    betaaltermijn:
      t?.offerte_betaaltermijn_dagen != null ? String(t.offerte_betaaltermijn_dagen) : "14",
    prefix: (t?.offerte_nummer_prefix ?? "SS").trim() || "SS",
  };
}

// ── Reminders ───────────────────────────────────────────────────────────

/**
 * tenant_settings.reminder_dag_1/2/3 → Reminder[].dag. De tekst zelf loopt
 * via Meta-approval (template_aanvragen) en zit niet op tenant_settings; we
 * houden de demo-teksten als zichtbare placeholder en mappen alleen de
 * dagen-waarden uit de echte data.
 */
export function toReminders(t: TenantSettingsRow | null): Reminder[] {
  const dagen = [t?.reminder_dag_1, t?.reminder_dag_2, t?.reminder_dag_3];
  return REMINDERS_DEFAULT.map((r, i) => ({
    ...r,
    dag: dagen[i] != null ? String(dagen[i]) : r.dag,
  }));
}

// ── Meldingen ───────────────────────────────────────────────────────────

/**
 * notification_preferences → NotificationSetting[] voor MeldingenPanel.
 * De v2-MeldingenPanel toont één toggle per event (geen kanaal-matrix); we
 * vatten een event als "aan" samen zodra een van zijn kanalen aan staat
 * (in de praktijk in_app). Titel/sub komen uit EVENT_LABELS zodat ze in sync
 * blijven met het bestaande (app)-systeem.
 */
export function toMeldingen(prefs: NotificationPreferenceRow[]): NotificationSetting[] {
  const aanByEvent = new Map<string, boolean>();
  for (const p of prefs) {
    aanByEvent.set(p.event_type, (aanByEvent.get(p.event_type) ?? false) || p.enabled);
  }
  return EVENT_TYPES_ORDERED.map((event) => {
    const label = EVENT_LABELS[event];
    return {
      titel: label.titel,
      sub: label.sub,
      aan: aanByEvent.get(event) ?? false,
    };
  });
}

/** Omgekeerde lookup: paneel-titel → event_type (voor de toggle-actie). */
export function buildMeldingEventLookup(): Map<string, (typeof EVENT_TYPES_ORDERED)[number]> {
  const out = new Map<string, (typeof EVENT_TYPES_ORDERED)[number]>();
  for (const event of EVENT_TYPES_ORDERED) {
    out.set(EVENT_LABELS[event].titel, event);
  }
  return out;
}

// ── Team ────────────────────────────────────────────────────────────────

/**
 * dashboard_user_profiles (approved) → TeamMember[] voor TeamPanel. Owner
 * eerst, daarna leden; sub/init afgeleid van bedrijfsnaam zoals de (app)-
 * TeamSection (die toont bedrijfsnaam + owner/member-pill). Geen demo-
 * fabricatie: ontbrekende namen vallen terug op "Onbekend".
 */
export function toTeam(rows: TeamMemberRow[]): TeamMember[] {
  return [...rows]
    .sort((a, b) => Number(b.is_owner) - Number(a.is_owner))
    .map((r) => {
      const naam = (r.bedrijfsnaam ?? "").trim() || "Onbekend";
      return {
        naam,
        rol: r.is_owner ? "Owner" : "Member",
        sub: r.is_owner
          ? "Alles, beslissingen, prijzen, instellingen"
          : "Agenda en klussen afronden, geen prijzen",
        init: initialen(naam),
        owner: r.is_owner,
      };
    });
}

// ── E-mailkoppeling ───────────────────────────────────────────────────────

/**
 * getEmailConnectionStatus()-resultaat → de EmailConnectionState-prop die het
 * EmailPanel verwacht. De vormen lopen vrijwel 1-op-1; deze mapper houdt de
 * grens expliciet en geeft nooit een wachtwoord door (de query-helper levert
 * dat ook niet). Bij geen koppeling: { connected: false }.
 */
export function toEmailConnectionState(
  status: EmailConnectionStatus,
): EmailConnectionState {
  if (!status.connected) return EMAIL_CONNECTION_DEFAULT;
  return {
    connected: true,
    email: status.email,
    senderName: status.senderName,
    replyTo: status.replyTo ?? null,
    provider: status.provider ?? null,
    testPassedAt: status.testPassedAt ?? null,
    needsReconnect: Boolean(status.needsReconnect),
  };
}

// ── WhatsApp-koppeling ──────────────────────────────────────────────────

/**
 * getWhatsAppConnectionStatus()-resultaat → de WhatsAppConnectionState-prop
 * die het WhatsAppPanel verwacht. De vormen lopen vrijwel 1-op-1; deze mapper
 * houdt de grens expliciet en geeft nooit een token door (de query-helper
 * levert dat ook niet). Bij geen koppeling: { connected: false }.
 */
export function toWhatsAppConnectionState(
  status: WhatsAppConnectionStatus,
): WhatsAppConnectionState {
  if (!status.connected) return WHATSAPP_CONNECTION_DEFAULT;
  return {
    connected: true,
    displayPhoneNumber: status.displayPhoneNumber ?? null,
    needsReconnect: Boolean(status.needsReconnect),
  };
}

/** Initialen uit een naam ("Anna Smit" → "AS"), max 2 letters. */
function initialen(naam: string): string {
  const delen = naam.split(/\s+/).filter(Boolean);
  if (delen.length === 0) return "?";
  if (delen.length === 1) return delen[0].slice(0, 2).toUpperCase();
  return (delen[0][0] + delen[delen.length - 1][0]).toUpperCase();
}
