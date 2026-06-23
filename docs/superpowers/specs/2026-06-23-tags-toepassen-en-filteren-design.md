# Tags toepassen op leads + filteren op tags

Datum: 2026-06-23
Status: ontwerp (goedgekeurd, wacht op spec-review)
Repo: `Frontlix website` (dashboard, v2)

## Probleem / doel

Tags bestaan al (aanmaken/beheren in Instellingen, plus 5 systeem-tags), maar in het v2-dashboard kun je ze in de praktijk nergens **gebruiken**:

- Je kunt een tag **niet aan een lead hangen** (de tag-UI is nooit in het v2-leaddossier gebouwd; verdween met de oude desktop-versie).
- Je kunt de leadlijst **niet filteren op tags** (de filter-logica bestaat in de code, maar de UI en de aansluiting op het v2-pad ontbreken).

Doel: de eigenaar kan handmatig tags op leads zetten en de leadlijst op tags filteren. Geen automatische tags, de bot doet niets met tags.

## Besluiten (met Chris afgestemd)

- **Tag toevoegen aan een lead**: alleen **kiezen uit bestaande** tags. Nieuwe tags aanmaken/beheren blijft in Instellingen (geen inline-aanmaken in het dossier).
- **Filter op meerdere tags**: **AND** (een lead matcht alleen als hij álle gekozen tags heeft).

## Wat al bestaat (hergebruiken, niet opnieuw bouwen)

- Server-acties: `addTagToLead(leadId, tagId)`, `removeTagFromLead(leadId, tagId)` (`lib/dashboard/tag-actions.ts`) — incl. auth + `revalidatePath('/leads/<id>')` + `revalidatePath('/leads')`.
- Queries: `getAllTags()` en `getTagsForLead(leadId)` (`lib/dashboard/tag-queries.ts`).
- AND-filterlogica: `getLeadsList(filters, opts)` (`lib/dashboard/lead-queries.ts`) doet al een 2-staps AND-tagfilter (vindt lead-ids die ÁLLE `filters.tags` hebben). Wordt nu alleen met lege filters aangeroepen.
- URL-filter-serialisatie: `lib/dashboard/lead-filters.ts` parset en serialiseert de `tags`-parameter al, en `filterCount` telt hem mee.

## Deel 1 — Tag-knop in het leaddossier

### Datastroom
- `app/dashboard/v2/leads/[lead_id]/page.tsx` (server): naast `getLeadDetail(lead_id)` ook `getAllTags()` en `getTagsForLead(lead_id)` ophalen en als props doorgeven aan `DossierView`.
- `DossierView` geeft ze door aan een nieuw component `LeadTagsRow`.

### Component: `LeadTagsRow` (nieuw, client)
- **Plek**: in de kop van het dossier (`styles.kop` in `DossierView.tsx`), bij naam/status.
- **Toont**: de huidige tags als chips (naam + kleur + icoon, hergebruik de bestaande tag-pill-stijl/icon-map uit `components/dashboard/instellingen/tag-icons.tsx`), elk met een kruisje.
- **Verwijderen**: kruisje → `removeTagFromLead(leadId, tagId)`.
- **Toevoegen**: een "+ tag"-knop opent een dropdown met de **beschikbare** tags (`getAllTags()` minus de al-toegekende); klikken → `addTagToLead(leadId, tagId)`.
- **Geen** aanmaak-veld in de dropdown (bewust; aanmaken zit in Instellingen). Als er geen tags bestaan: lege-staat-tekst met verwijzing naar Instellingen.
- **UI-feedback**: optimistische update (chip direct toevoegen/verwijderen), bij fout terugdraaien. De server-acties revalidaten al, dus na `router.refresh()`/revalidate klopt de serverstand.

**Interface:**
- Props: `LeadTagsRow({ leadId: string, leadTags: Tag[], allTags: Tag[], live: boolean })`.
- `live=false` (demo-fallback, geen sessie): chips read-only, geen acties.

## Deel 2 — Tag-filter in de leadlijst

### Datastroom
- `app/dashboard/v2/leads/page.tsx` parset de `tags`-param uit de searchParams (via de bestaande `parseLeadsFilters`) en geeft die door aan **`getLeadsList({ tags }, opts)`**, zodat de database de AND-pre-filter doet. Nu wordt `getLeadsList(undefined, ...)` aangeroepen; alleen die call-sites krijgen de tags mee.
- De overige filters (bron/urgent/sort/zoek) blijven via `applyLeadsFilters(allLeads, sp)` in-memory lopen, ongewijzigd. `applyLeadsFilters` hoeft de tags niet nogmaals toe te passen (al op DB-niveau gefilterd).

### Component: tag-keuze in `LeadsFilter.tsx`
- In de bestaande filter-popover (onder Bron / Alleen urgent / Sorteer op) een blok **Tags** met de lijst tags (uit `getAllTags()`, doorgegeven als prop) en een checkbox per tag.
- Aanvinken/uitvinken werkt de `tags`-searchParam bij (comma-separated tag-ids), net als de andere filters in dit component (URL-gebaseerd, `router.replace`).
- De filter-teller op de knop telt de tags al mee (`filterCount`).
- `LeadsFilter` krijgt een nieuwe prop `allTags: Tag[]` (de leadlijst-pagina haalt `getAllTags()` op en geeft hem door tot in de filter-popover).

### Gedrag
- Geen tags gekozen → geen tagfilter (alle leads, zoals nu).
- Eén of meer tags → alleen leads met **alle** gekozen tags (AND, via `getLeadsList`).
- Werkt zowel op de actieve als de archief-lijst (beide call-sites van `getLeadsList`).

## Buiten scope
- Tags aanmaken/verwijderen/herkleuren (blijft in Instellingen).
- Inline-aanmaken in het dossier.
- Automatische/systeem-toekenning van tags.
- De bot iets met tags laten doen.

## Foutafhandeling
- Tag toevoegen/verwijderen faalt → optimistische UI terugdraaien + nette melding; geen harde crash.
- `getAllTags()`/`getTagsForLead()` faalt → leeg lijstje (geen chips / geen filteropties), gelogd; pagina blijft werken.

## Testen
- **Unit**: de tag-AND-filter in `getLeadsList` heeft mogelijk al dekking (`lead-queries.test.ts`); zo niet, een test toevoegen die bevestigt dat alleen leads met álle gekozen tags terugkomen.
- **Component/handmatig**: tag toevoegen/verwijderen in het dossier (chip verschijnt/verdwijnt, server revalidate), en het filter (kies 2 tags → alleen leads met beide).
- Bestaande `tag-actions.test.ts` dekt de server-acties al.

## Bestanden (overzicht)
- Wijzigen: `app/dashboard/v2/leads/[lead_id]/page.tsx` (tags ophalen + doorgeven), `components/dashboard/v2/dossier/DossierView.tsx` (LeadTagsRow tonen), `app/dashboard/v2/leads/page.tsx` (tags doorgeven aan getLeadsList + getAllTags voor de filter), `components/dashboard/v2/leads/LeadsFilter.tsx` (tag-keuze) + de plek die `LeadsFilter` rendert (allTags doorgeven).
- Nieuw: `components/dashboard/v2/dossier/LeadTagsRow.tsx` (+ module-css).
- Hergebruik: `tag-actions.ts`, `tag-queries.ts`, `lead-queries.ts` (getLeadsList AND-filter), `tag-icons.tsx`.
