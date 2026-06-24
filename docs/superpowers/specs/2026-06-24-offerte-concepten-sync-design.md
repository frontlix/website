# Gedeelde offerte-concepten (cross-device sync)

Datum: 2026-06-24
Status: ontwerp goedgekeurd, klaar voor implementatieplan
Branch: `feat/concept-sync`

## Probleem

Bij het handmatig maken van een offerte bewaart het dashboard een half-afgemaakte
offerte als *concept*. Die concepten verschillen per apparaat: op desktop staan
andere concepten open dan op de telefoon. Twee oorzaken werken samen:

1. Concepten worden in `localStorage` van de browser bewaard. localStorage is
   per browser en per apparaat, dus synct per definitie nooit tussen desktop en
   telefoon.
2. Desktop en mobiel openen verschillende wizards, elk met een eigen
   localStorage-sleutel:
   - Desktop (`/dashboard/v2`): `OfferteWizard` (`components/dashboard/v2/offerte/`),
     sleutel `frontlix:v2:offerte-concepten`, bewaart een `OfferteDraftState`.
   - Mobiel/legacy (`/leads?nieuwe-offerte=1`): `ManualOfferteModal`
     (`components/dashboard/offerte/`), sleutel
     `frontlix-handmatige-offerte-drafts-v2`, bewaart een `DraftEntry` met een
     volledig `ManualOfferteData`-object.

De keuze voor localStorage was bewust (zie comment in `offerte-drafts.ts`): een
concept is nog geen lead en mag niet als halve lead in de bot-pijplijn belanden.
Die randvoorwaarde blijft staan.

## Doel

Concepten zijn overal gelijk: dezelfde lijst en dezelfde inhoud op elk apparaat,
en een concept dat op het ene apparaat begonnen is, kan op het andere geopend en
afgemaakt worden. Concepten blijven onzichtbaar voor de bot (geen halve leads).

### Scope-beslissingen (goedgekeurd)

- **Delen: gedeeld per account.** Alle concepten zijn van het bedrijf; Chris en
  Thierry zien dezelfde lijst op elk apparaat. Past bij de huidige single-tenant
  opzet. Geen eigenaar-filtering.
- **Aanpak: optie A.** Concepten naar de database, beide bestaande wizards
  blijven bestaan en delen dezelfde concepten via het gemeenschappelijke
  `ManualOfferteData`-formaat. Geen wizard-unificatie (dat was optie B, afgewezen
  als te veel werk en risico op mobiele weergave-regressie).

### Niet in scope

- De twee wizards samenvoegen tot één UI (optie B).
- Per-gebruiker of multi-tenant scheiding van concepten (komt pas bij echte
  multi-tenant uitrol).
- Wijzigingen aan de verstuur-flow zelf (`createManualLeadEnOfferte`) anders dan
  het opruimen van een concept na succesvol versturen.

## Ontwerp

### 1. Datamodel: tabel `offerte_concepten`

Eén nieuwe tabel, losstaand van `leads`/`offertes`/`prijsregels`, zodat de bot
de concepten nooit ziet.

| kolom | type | doel |
|-------|------|------|
| `id` | uuid, primary key, default `gen_random_uuid()` | concept-id, gedeeld door beide wizards |
| `data` | jsonb, not null | het volledige `ManualOfferteData`-object (de offerte-inhoud) |
| `label` | text, not null, default `''` | klant/bedrijfsnaam voor in de conceptenlijst |
| `totaal` | numeric, not null, default `0` | totaal incl. btw op moment van opslaan, alleen voor de lijst |
| `bijgewerkt_op` | timestamptz, not null, default `now()` | sortering nieuwste eerst |
| `aangemaakt_op` | timestamptz, not null, default `now()` | |

- Gedeeld per account, dus geen `lead_id`, geen `owner`/`user_id`. Consistent met
  de huidige single-tenant opzet (geen `tenant_id` op de bestaande tabellen).
- Migratie als volgnummer na de hoogste bestaande migratie in
  `supabase/migrations-frontlix/` (nu t/m 056; dit wordt 057 of hoger, afhankelijk
  van wat op het moment van implementatie het hoogste nummer is).
- Geen RLS-policies nodig voor dashboard-users: net als
  `leads`/`offertes`/`prijsregels` wordt er via de service-role geschreven,
  achter een `requireApprovedUser()`-gate (zie server-actions).
- **Opschoning:** maximaal 30 nieuwste concepten (zelfde grens als de huidige
  `MAX_DRAFTS`). Bij `upsertConcept` worden concepten buiten de 30 nieuwste
  verwijderd. Dit houdt de tabel klein zonder aparte cron.

### 2. Server-actions: `lib/dashboard/offerte-concept-actions.ts`

Nieuw bestand, dezelfde stijl als het bestaande `offerte-draft-actions.ts`:
`'use server'`, auth via `requireApprovedUser()`, schrijven via
`getDashboardAdmin()` (service-role), uniforme `Result`-shape, `NEXT_REDIRECT`
doorgooien.

```ts
type Concept = {
  id: string
  data: ManualOfferteData
  label: string
  totaal: number
  bijgewerktOp: number   // epoch ms, voor de UI-lijst
}

// Alle concepten, nieuwste eerst. Gedeeld per account.
listConcepten(): Promise<Result<Concept[]>>

// Insert of update op id. Trimt daarna tot de 30 nieuwste.
upsertConcept(input: {
  id: string
  data: ManualOfferteData
  label: string
  totaal: number
}): Promise<Result>

// Verwijder één concept op id (bij handmatig verwijderen en na versturen).
removeConcept(id: string): Promise<Result>
```

- `listConcepten` sorteert op `bijgewerkt_op desc`.
- `upsertConcept` doet een upsert op `id`; bij update zet het `bijgewerkt_op` op
  `now()`. Daarna verwijdert het alle rijen buiten de 30 nieuwste.
- Alle drie de actions zijn best-effort vanuit de UI: een fout stopt de wizard
  niet (zie randgevallen).

### 3. Gedeeld concept-formaat: `ManualOfferteData`

`ManualOfferteData` (`lib/dashboard/manual-offerte-types.ts`) is de
gemeenschappelijke taal: het bevat alle klant-, adres-, werk-, voegzand-,
kleur-, korting- en verzendvelden, plus alle per-regel prijs-overrides
(`*_override`). Beide wizards gebruiken het al richting de opslag-action
`createManualLeadEnOfferte`.

Wat `ManualOfferteData` niet bevat, is pure navigatie-state van de v2-wizard
(huidige wizardstap, zoekterm, `aiGebruikt`, regel-`volgorde`). Dat is bewust
acceptabel: bij hervatten opent de wizard op stap 1 (Klant), net als de legacy
modal nu doet in `hervatDraft`, en de regel-volgorde wordt herleid uit de gekozen
diensten. De offerte-inhoud blijft volledig behouden.

### 4. Wizard-integratie

**Mobiel/legacy (`ManualOfferteModal`):** bewaart al `ManualOfferteData` in
`DraftEntry.data`. Vervang de localStorage-lees/schrijf/verwijder-paden door
`listConcepten` / `upsertConcept` / `removeConcept`. De `DraftEntry`-structuur
(`{ id, savedAt, klantNaam, data }`) mapt direct: `data` = `Concept.data`,
`klantNaam` = `Concept.label`.

**Desktop (`OfferteWizard`):**
- Schrijven: de bestaande `mapWizardToManualOfferte(state)` levert de
  `ManualOfferteData` voor `upsertConcept`.
- Lezen: nieuwe mapper `mapManualOfferteToWizard(data): OfferteDraftState` in
  `components/dashboard/v2/offerte/offerte-mappers.ts`. Die zet een opgeslagen
  concept terug in de wizard-state. Alle velden zitten in `ManualOfferteData`;
  navigatie-velden (`stap`, `zoek`) krijgen zinnige defaults. `laadConcept`
  gebruikt deze mapper in plaats van de directe `d.state`.
- De auto-save (nu `useEffect` met 500ms debounce naar `upsertDraft`) schrijft
  voortaan naar `upsertConcept`. Debounce wordt verhoogd naar circa 1200ms zodat
  snel typen de database niet overbelast. De save draait via een transition en
  blokkeert de UI niet.
- Na succesvol versturen: vervang `removeDraft(draftId)` door
  `removeConcept(draftId)`.

### 5. Mappers en gedeelde helpers

- `mapWizardToManualOfferte` (bestaat): `OfferteDraftState`/wizard-state → `ManualOfferteData`.
- `mapManualOfferteToWizard` (nieuw): `ManualOfferteData` → `OfferteDraftState`.
  Inverse van bovenstaande voor de inhoudelijke velden; navigatie-velden op default.
- Label en totaal voor de lijst: hergebruik de bestaande label-afleiding
  (`conceptLabel` in de v2-wizard, `deriveKlantNaam` in de legacy modal) en het
  reeds berekende totaal incl. btw.

## Randgevallen en gedrag

- **Migratie van bestaande lokale concepten (goedgekeurd: eenmalige upload).**
  Bij de eerste keer dat een wizard na deze update opent, leest hij de bestaande
  localStorage-concepten (beide sleutels), uploadt ze eenmalig via
  `upsertConcept`, en wist daarna de localStorage-sleutel. Zo raakt geen bestaand
  concept kwijt en convergeert alles naar de database. De upload is best-effort
  (lukt het niet, dan blijft de lokale sleutel staan en wordt het de volgende
  keer opnieuw geprobeerd). Voor de v2-concepten worden de opgeslagen
  `OfferteDraftState`-velden via `mapWizardToManualOfferte` naar
  `ManualOfferteData` gebracht voor de upload.
- **Offline / opslagfout.** Een mislukte save stopt de wizard niet: je werk
  blijft op het scherm staan en wordt bij de volgende wijziging opnieuw
  weggeschreven. Het bestaande "opgeslagen"-vinkje weerspiegelt of de save echt
  geslaagd is (alleen tonen bij `ok: true`).
- **Samen bewerken.** Bewerken twee mensen hetzelfde concept-id, dan geldt
  last-write-wins op dat id. De conceptenlijst wordt bij elke keer openen
  ververst via `listConcepten`, zodat verwijderde of gewijzigde concepten
  zichtbaar bijwerken.
- **Concept onzichtbaar voor de bot.** De tabel heeft geen relatie met `leads`;
  de bot-queries raken haar nooit. Geen halve leads in de pijplijn.
- **Veldverlies tussen wizards.** Omdat beide wizards via `ManualOfferteData`
  praten en de mobiele wizard velden die hij niet toont (zoals per-regel
  overrides) toch in `data` laat staan, gaat openen-op-mobiel niets uit een
  desktop-concept verloren.

## Testplan

- Unit-test `mapManualOfferteToWizard`: round-trip
  `state -> mapWizardToManualOfferte -> mapManualOfferteToWizard` behoudt alle
  inhoudelijke velden (klant, diensten, m2, voegzand, kleur, korting incl.
  euro-modus en omschrijving, alle `*_override`-velden, geldigheid, kanaal).
- Unit-test opschoning: na 31 upserts blijven de 30 nieuwste over.
- Unit-test wipe-veiligheid: `upsertConcept` met lege/default data gedraagt zich
  voorspelbaar (geen onbedoelde lege concepten; spiegelt de bestaande
  `isDefaultsData`-guard in de legacy modal en de `heeftInhoud`-guard in v2).
- Integratie/handmatig: concept op desktop maken, op mobiel openen en afmaken, en
  andersom; concept verdwijnt uit de lijst na versturen; lijst is gelijk op beide
  apparaten.

## Oplevering en deploy

- Migratie `offerte_concepten` toepassen op `ntew` (dashboard-DB).
- Bouwen en testen lokaal (vitest + build groen).
- Deploy op de live branch `feat/dashboard-rebrand-v2` volgens de vaste route:
  `ssh VPS` -> `git pull origin feat/dashboard-rebrand-v2` -> `rm -rf .next` ->
  `npm run build` -> `pm2 restart frontlix` (één schone build, geen overlappende
  deploys).
- Verifieren op desktop en telefoon dat dezelfde concepten verschijnen.
