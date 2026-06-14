'use server'

import { getDashboardSupabase } from './supabase-server'
import { normalizePhone } from './lead-filters'

export type ExistingClientMatch = {
  lead_id: string
  naam: string
  bedrijfsnaam: string | null
  telefoon: string
  email: string | null
  postcode: string | null
  huisnummer: string | null
  straat: string | null
  plaats: string | null
  totaal_prijs: number | null
  aangemaakt: string | null
}

const SEARCH_COLUMNS =
  'lead_id, naam, bedrijfsnaam, telefoon, email, postcode, huisnummer, straat, plaats, totaal_prijs, aangemaakt'

/**
 * Live-search voor de "zoek bestaande klant"-flow in de manual-offerte-
 * wizard. Matcht op naam / telefoon / postcode / straat / plaats; geeft
 * max 25 hits terug. De dropdown toont er 5 tegelijk en laat door de rest
 * scrollen, dus een ruimere limit maakt het scrollen pas zinvol zonder de
 * payload te laten ontsporen.
 *
 * Zoekt over niet-gearchiveerde leads, gearchiveerde klanten kun je
 * via de gewone leads-tabel terughalen, dat is geen wizard-context.
 *
 * Veiligheid: punten en komma's strippen we uit de input voordat we
 * 'm in PostgREST `.or(...)` gooien, dat zijn syntax-tekens binnen
 * de filter-string. Andere ilike-wildcards (`%`, `_`) laten we staan.
 */
export async function searchExistingClients(
  q: string,
): Promise<ExistingClientMatch[]> {
  const safe = q.replace(/[,.]/g, ' ').trim()
  // Vanaf 1 teken zoeken: de owner verwacht al een match op de eerste letter.
  // De .or()-match is een "contains" en de resultaten zijn op 8 gecapt, dus
  // ook een enkele letter blijft een korte, bruikbare lijst.
  if (safe.length < 1) return []

  const supabase = await getDashboardSupabase()
  const qTel = normalizePhone(safe)

  // Zelfde pattern als getLeadsList, uitgebreid met postcode + straat +
  // plaats. Telefoon-match draait op de genormaliseerde versie zodat
  // "06 12 34 56 78" en "+31612345678" beide hetzelfde nummer vinden.
  const { data, error } = await supabase
    .from('leads')
    .select(SEARCH_COLUMNS)
    .eq('dashboard_archived', false)
    .or(
      [
        `naam.ilike.%${safe}%`,
        `bedrijfsnaam.ilike.%${safe}%`,
        `telefoon.ilike.%${qTel}%`,
        `postcode.ilike.%${safe}%`,
        `straat.ilike.%${safe}%`,
        `plaats.ilike.%${safe}%`,
      ].join(','),
    )
    .order('aangemaakt', { ascending: false })
    .limit(25)

  if (error) {
    console.error('[searchExistingClients] query failed:', error)
    return []
  }
  return (data as unknown as ExistingClientMatch[] | null) ?? []
}
