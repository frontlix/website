import type { User } from "@supabase/supabase-js";
import { getDashboardSupabase } from "@/lib/dashboard/supabase-server";
import { getCurrentUser, getCurrentUserProfile } from "@/lib/dashboard/auth";
import type { DashboardUserProfile } from "@/lib/dashboard/auth";

export interface V2Session {
  supabase: Awaited<ReturnType<typeof getDashboardSupabase>>;
  user: User;
  profile: DashboardUserProfile;
}

/**
 * Niet-redirectende sessie voor de v2-koppeling. Retourneert de
 * (approved) sessie + tenant-gescopete Supabase-client, of `null` als er
 * geen geldige sessie is.
 *
 * Pagina's gebruiken dit als: `const s = await v2Session()` en vallen bij
 * `null` terug op demo-data, zodat de preview in dev (zonder login) blijft
 * renderen. In productie dwingt de middleware al auth af, dus daar is er
 * altijd een sessie en wordt de demo-tak nooit geraakt. Verwijder de
 * demo-takken zodra v2 het live dashboard definitief vervangt.
 */
export async function v2Session(): Promise<V2Session | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getCurrentUserProfile();
  if (!profile || profile.tenant_status !== "approved") return null;

  const supabase = await getDashboardSupabase();
  return { supabase, user, profile };
}

/** Initialen uit de email-prefix (zelfde afleiding als de bestaande shell). */
export function initialsFromEmail(email: string | null | undefined): string {
  const prefix = (email ?? "").split("@")[0] || "U";
  return prefix.slice(0, 2).toUpperCase();
}
