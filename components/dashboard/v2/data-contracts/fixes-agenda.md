# Fix-brief: Agenda (data-koppeling)

Los onderstaande parity-issues op. Houd de v2-look + scroll/hoogte ongewijzigd; verander alleen wat nodig is. Gebruik de bestaande (app)-implementatie als referentie (hergebruik geocode/validatie/acties, verzin niets nieuws). Behoud de demo-fallback (geen sessie -> demo).

## 1. [MEDIUM] `components/dashboard/v2/agenda/agenda-mappers.ts`

**Probleem:** Items worden in WeekGrid gekeyd op it.tijd (key={it.tijd}) en in AgendaView's demo-afvink-logica/selectie ook op tijd gematcht. De live-mapper kan meerdere echte afspraken op dezelfde dag met dezelfde afspraak_starttijd opleveren (twee leads om 09:00 is realistisch; de query de-dupliceert niet). Dat geeft dubbele React-keys (warning + mogelijk een verkeerd/overgeslagen blok) en, in de demo-tak, een afvink-actie die per ongeluk meerdere items tegelijk 'klaar' zet. De demo-tijden waren uniek per dag, dus dit gat ontstaat juist door echte data.

**Fix:** Geef het AgendaItem een stabiele unieke key mee (de mapper heeft leadId al) en key WeekGrid/het selectie- en demo-afvink-matchen daarop i.p.v. op it.tijd. Voor live is leadId altijd aanwezig; voor demo val terug op `${dag}-${tijd}-${index}`. Houd de prop-vorm intact (optioneel veld).

## 2. [MEDIUM] `app/dashboard/v2/agenda/page.tsx`

**Probleem:** De (app)-weekview toont in de sidebar AgendaUpcomingList (komende 7 dagen) en vooral AgendaFollowupList met getOwnerFollowups() + getStaleOfferteFollowups() (de 'Op te volgen'-leads: wachten-op-eigenaar-review en stale offertes). De v2-pagina laat deze data volledig weg. Dat is een functioneel zichtbaar gat t.o.v. de bestaande pagina (de owner-review/stale-offerte-attentie verdwijnt).

**Fix:** Bevestig expliciet dat dit binnen het goedgekeurde v2-ontwerp valt (de v2-look heeft geen agenda-sidebar) en noteer het als bewuste afwijking/follow-up in de oplevering. Indien het wel mee moet: koppel de bestaande getOwnerFollowups/getStaleOfferteFollowups in de server-component en geef het door aan een v2-plek; verzin geen nieuwe query. Niet stilzwijgend laten vallen.
