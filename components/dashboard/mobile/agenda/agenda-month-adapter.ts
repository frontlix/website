// Adapter: een maand-AgendaItem (v2-datavorm, uit mapMonthToCells) → de mobiele
// AgendaEvent-vorm, zodat een aangetikte maand-afspraak dezelfde detail-drilldown
// (FlowKlus / FlowPlaatsbezoek / FlowEigen) opent als de week-lijst.
//
// De maand-pijplijn levert AgendaItem's (geen AgendaEvent). De velden overlappen
// grotendeels; deze adapter mapt 1-op-1 wat aanwezig is. Een maand-item zonder
// leadId (externe Google-afspraak) wordt 'eigen' (read-only), de rest 'klus'
// (zoals de mobiele week-mapper alle echte afspraken als klus toont).

import type { AgendaItem } from '@/components/dashboard/v2/agenda/agenda-data'
import type { AgendaEvent, AgendaEventKind } from './agenda-mock'

/** v2-AgendaType + lead-aanwezigheid → mobiele AgendaEventKind. */
function toKind(item: AgendaItem): AgendaEventKind {
  // Read-only externe afspraak (geen lead) → 'eigen' (geen lead-acties).
  if (!item.leadId) return 'eigen'
  // De mobiele week-mapper toont alle echte afspraken als 'klus'; bezoek/deadline
  // bestaan in de DB niet als apart soort, dus we volgen dat hier ook.
  return 'klus'
}

/** Tik op een maand-afspraak → mobiel AgendaEvent voor de detail-drilldown.
 *  `dateKey` (YYYY-MM-DD) komt van de maand-cel (AgendaItem zelf draagt 'm niet). */
export function agendaItemToEvent(item: AgendaItem, dateKey = ''): AgendaEvent {
  return {
    id: item.leadId ?? item.key ?? `${item.tijd}-${item.titel}`,
    kind: toKind(item),
    naam: item.klant || item.titel.replace(/^Klus · /, ''),
    adres: item.adres || (item.plaats || '—'),
    start: item.tijd || '00:00',
    // De maand-pijplijn houdt geen eindtijd bij; toon de starttijd ook als einde
    // (de detail-flow leidt de duur niet uit deze waarde af voor echte data).
    end: item.tijd || '00:00',
    date: dateKey,
    m2: item.klusInfo?.m2,
    dienst: item.klusInfo?.categorie ?? undefined,
    klant: item.klant,
    lead: item.leadId,
    telefoon: item.telefoon || undefined,
    afstandKm: item.afstandKm ?? null,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
  }
}
