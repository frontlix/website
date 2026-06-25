// Client-helpers voor de "Klus afronden"-knoppen in het lead-dossier.
//
// `setKlusGeblokkeerd` POST't naar de bestaande proxy-route
// /api/dashboard/lead/<id>/klus-status (die naar de bot doorforwardt) om
// leads.klus_geblokkeerd te zetten. Voor "Klus afgerond" gebruikt de UI de
// server-action completeAppointment (dashboard_status='afgehandeld').
//
// `toonKlusAfrondenKnoppen` bepaalt of de twee knoppen zichtbaar zijn: alleen
// wanneer de lead een afspraak op of vóór vandaag heeft EN nog open staat.

export type KlusStatusResult = { ok: true } | { ok: false; error: string }

/** Zet (of unset) leads.klus_geblokkeerd via de bot-proxy-route. */
export async function setKlusGeblokkeerd(
  leadId: string,
  geblokkeerd: boolean,
): Promise<KlusStatusResult> {
  try {
    const res = await fetch(`/api/dashboard/lead/${leadId}/klus-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klus_geblokkeerd: geblokkeerd }),
    })
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    if (res.ok && body?.ok !== false) return { ok: true }
    return {
      ok: false,
      error: typeof body?.error === 'string' ? body.error : `Mislukt (HTTP ${res.status}).`,
    }
  } catch {
    return { ok: false, error: 'Netwerkfout, probeer het opnieuw.' }
  }
}

/** Amsterdam-dagsleutel (YYYY-MM-DD) van een datum/ISO-string, voor dag-compare. */
function dayKeyAmsterdam(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Toon de "Klus afgerond" / "Klus niet doorgegaan"-knoppen? Alleen wanneer de
 * lead een afspraak op of vóór vandaag heeft (afspraak_datum <= vandaag,
 * Amsterdam) EN nog open staat (dashboard_status === 'open'). Bij een
 * toekomstige afspraak of een al-afgehandelde lead niet.
 */
export function toonKlusAfrondenKnoppen(
  afspraakDatum: string | null | undefined,
  dashboardStatus: string | null | undefined,
): boolean {
  if (dashboardStatus !== 'open') return false
  if (!afspraakDatum) return false
  const d = new Date(afspraakDatum)
  if (Number.isNaN(d.getTime())) return false
  return dayKeyAmsterdam(d) <= dayKeyAmsterdam(new Date())
}
