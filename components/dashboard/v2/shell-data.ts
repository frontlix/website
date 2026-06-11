import "server-only";
import { v2Session, initialsFromEmail } from "@/lib/dashboard/v2/session";
import { toAmsterdamDayKey } from "@/lib/dashboard/calendar";
import { PRIMARY_NAV, TENANT, type NavItem } from "./demo-data";

export interface V2ShellData {
  tenant: string;
  userInitials: string;
  nav: NavItem[];
  /** True = geen sessie, de pagina's tonen demo-data (dev-preview). */
  isDemo: boolean;
}

/**
 * Levert de shell-header-data voor de v2-layout: tenant-naam, gebruiker-
 * initialen en de pill-nav met echte badges (open leads, komende
 * afspraken). Valt zonder sessie terug op demo (dev-preview).
 *
 * Queries zijn 1-op-1 dezelfde als de bestaande (app)-layout, zodat de
 * badges exact matchen met het huidige dashboard.
 */
export async function getV2ShellData(): Promise<V2ShellData> {
  const s = await v2Session();
  if (!s) {
    return { tenant: TENANT.tenant, userInitials: TENANT.initials, nav: PRIMARY_NAV, isDemo: true };
  }

  const { supabase, user, profile } = s;
  const [settingsRes, openLeadsRes, upcomingApptsRes] = await Promise.all([
    supabase.from("tenant_settings").select("bedrijfsnaam").limit(1).maybeSingle(),
    // Actieve leads: niet-gearchiveerd en niet 'afgehandeld' (NULL telt mee).
    supabase
      .from("leads")
      .select("lead_id", { count: "exact", head: true })
      .eq("dashboard_archived", false)
      .or("dashboard_status.is.null,dashboard_status.neq.afgehandeld"),
    // Komende afspraken vanaf vandaag, op de echte afspraakdatum.
    supabase
      .from("leads")
      .select("lead_id", { count: "exact", head: true })
      .not("afspraak_datum", "is", null)
      .gte("afspraak_datum", toAmsterdamDayKey(new Date().toISOString())),
  ]);

  const settings = settingsRes.data as { bedrijfsnaam: string | null } | null;
  const tenant = settings?.bedrijfsnaam ?? profile.bedrijfsnaam ?? "Dashboard";
  const leadsCount = openLeadsRes.count ?? 0;
  const agendaCount = upcomingApptsRes.count ?? 0;

  const nav: NavItem[] = PRIMARY_NAV.map((n) => {
    if (n.label === "Leads") return { ...n, badge: leadsCount || null };
    if (n.label === "Agenda") return { ...n, badge: agendaCount || null };
    // Inbox heeft (nog) geen aparte unread-state in de DB, net als de oude shell.
    if (n.label === "Inbox") return { ...n, badge: null };
    return n;
  });

  return { tenant, userInitials: initialsFromEmail(user.email), nav, isDemo: false };
}
