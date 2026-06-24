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
| `data` | jsonb, not null | canonieke `ManualOfferteData` (de offerte-inhoud); gedeelde, cross-wizard vorm |
| `v2_state` | jsonb, nullable | rijke `OfferteDraftState` van de v2-wizard, alleen gevuld als v2 het laatst schreef; voor volledig v2-herstel |
| `label` | text, not null, default `''` | klant/bedrijfsnaam voor in de conceptenlijst |
| `totaal` | numeric, not null, default `0` | totaal incl. btw op moment van opslaan, alleen voor de lijst |
| `bijgewerkt_op` | timestamptz, not null, default `now()` | sortering nieuwste eerst |
| `aangemaakt_op` | timestamptz, not null, default `now()` | |

- **Waarom twee payload-kolommen.** `ManualOfferteData` is de gemeenschappelijke
  taal, maar de v2-wizard bewaart een rijkere `OfferteDraftState` met velden die
  `ManualOfferteData` niet kent: losse vrije meerwerk-regels (`vrij`, naam + euro
  per regel; bij verzenden samengeperst tot één `extra_arbeid`-veld), plus
  `klantType`, `onderhoudWeken`, `korstmosToeslag`, `btw`, `volgorde`. Zou een
  v2-concept alleen als `ManualOfferteData` worden bewaard, dan zou hervatten
  (ook desktop-naar-desktop) die losse meerwerk-regels verliezen. Daarom bewaart
  v2 zijn volledige state in `v2_state` én een canonieke `data` voor de lijst en
  voor het openen vanaf mobiel. De legacy modal werkt al puur met
  `ManualOfferteData`, dus die laat `v2_state` op `null`.
- Gedeeld per account, dus geen `lead_id`, geen `owner`/`user_id`. Consistent met
  de huidige single-tenant opzet (geen `tenant_id` op de bestaande tabellen).
- Migratie als volgnummer na de hoogste bestaande migratie in
  `supabase/migrations-frontlix/`. Op moment van schrijven is dat 059, dus dit
  wordt `060_offerte_concepten.sql`. Bij implementatie verifieren dat 060 nog
  vrij is; zo niet, het eerstvolgende vrije nummer nemen.
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
  v2State: OfferteDraftState | null   // rijke v2-state, null bij legacy-concept
  label: string
  totaal: number
  bijgewerktOp: number                // epoch ms, voor de UI-lijst
}

// Alle concepten, nieuwste eerst. Gedeeld per account.
listConcepten(): Promise<Result<Concept[]>>

// Insert of update op id. Trimt daarna tot de 30 nieuwste.
// v2State expliciet meegeven (de v2-wizard vult 'm, legacy geeft null door zodat
// een legacy-bewerking een verouderde v2-state wist).
upsertConcept(input: {
  id: string
  data: ManualOfferteData
  v2State: OfferteDraftState | null
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
- Schrijven: de auto-save bouwt de canonieke `ManualOfferteData` met de bestaande
  `mapWizardToManualOfferte`, en geeft tegelijk de volledige `OfferteDraftState`
  mee als `v2State`. De `vrij` → `extraArbeid`-omzetting en het bouwen van de
  `WizardSubmitState` (nu inline in `handleVerstuur`, regel ~724-768) worden naar
  een gedeelde helper `buildManualOfferteFromWizard(...)` getrokken, zodat
  auto-save en verzenden exact dezelfde `ManualOfferteData` produceren (DRY).
- Lezen: nieuwe mapper `mapManualOfferteToWizard(data): OfferteDraftState` in
  `components/dashboard/v2/offerte/offerte-mappers.ts`. `laadConcept` gebruikt
  `v2State` wanneer aanwezig (volledig herstel, inclusief `vrij`), en valt anders
  (legacy-concept) terug op `mapManualOfferteToWizard(data)`. Navigatie-velden
  (`stap`, `zoek`) krijgen zinnige defaults; openen gebeurt op stap 1.
- De auto-save (nu `useEffect` met 500ms debounce naar `upsertDraft`) schrijft
  voortaan naar `upsertConcept` (met `data` + `v2State`). Debounce wordt verhoogd
  naar circa 1200ms zodat snel typen de database niet overbelast. De save draait
  via een transition en blokkeert de UI niet.
- Na succesvol versturen: vervang `removeDraft(draftId)` door
  `removeConcept(draftId)`.

De legacy modal geeft bij `upsertConcept` altijd `v2State: null` mee: bewerkt
iemand op mobiel een concept dat op desktop begon, dan wordt de (nu verouderde)
`v2_state` gewist en valt v2 bij het volgende openen terug op
`mapManualOfferteToWizard(data)`. De canonieke `data` blijft kloppen.

### 5. Mappers en gedeelde helpers

- `mapWizardToManualOfferte` (bestaat): `WizardSubmitState` → `ManualOfferteData`.
  De wizard bouwt die `WizardSubmitState` nu inline in `handleVerstuur`.
- `buildManualOfferteFromWizard` (nieuw, refactor): trekt het bouwen van de
  `WizardSubmitState` (incl. de `vrij` → `extraArbeid`-omzetting en de
  `voegzandDekking`/`perMin` uit pricing) uit `handleVerstuur` in een herbruikbare
  helper, zodat verzenden én auto-save dezelfde `ManualOfferteData` produceren.
- `mapManualOfferteToWizard` (nieuw): `ManualOfferteData` → `OfferteDraftState`.
  Inverse voor de inhoudelijke velden, gebruikt als fallback wanneer een concept
  geen `v2State` heeft (legacy-concept). Navigatie-velden op default; `vrij` wordt
  uit `extra_arbeid` als één regel teruggezet (legacy heeft geen losse vrije
  regels, dus geen detailverlies dat er was).
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
  keer opnieuw geprobeerd). Voor v2-concepten gaat de opgeslagen
  `OfferteDraftState` mee als `v2State`, plus een canonieke `data` via
  `buildManualOfferteFromWizard`; legacy-concepten uploaden hun `ManualOfferteData`
  als `data` met `v2State: null`.
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
- **Veldverlies.** Desktop-naar-desktop verliest niets: v2 herstelt uit
  `v2State` (inclusief losse `vrij`-regels). Desktop-naar-mobiel toont op mobiel
  de canonieke `data` (de mobiele UI heeft sowieso geen losse meerwerk-regels,
  dus geen detail dat er was); de DB houdt `v2_state` vast tot iemand op mobiel
  bewerkt en opslaat, waarna `v2_state` op `null` gaat en de canonieke `data`
  leidend blijft. Mobiel-naar-desktop herstelt v2 via
  `mapManualOfferteToWizard(data)`.

## Testplan

- Unit-test `mapManualOfferteToWizard`: round-trip
  `submitState -> mapWizardToManualOfferte -> mapManualOfferteToWizard` behoudt
  alle inhoudelijke velden (klant, diensten, m2, voegzand, kleur, korting incl.
  euro-modus en omschrijving, alle `*_override`-velden, geldigheid, kanaal).
- Unit-test `buildManualOfferteFromWizard`: de helper produceert exact dezelfde
  `ManualOfferteData` als de bestaande inline-logica in `handleVerstuur`
  (incl. `vrij` → `extra_arbeid`-omzetting met het pricing-tarief).
- Unit-test server-actions met gemockte admin/auth (zelfde patroon als
  `offerte-draft-actions.test.ts`): `upsertConcept` schrijft `data` + `v2_state`;
  `listConcepten` sorteert nieuwste eerst; na een upsert worden rijen buiten de
  30 nieuwste verwijderd; `removeConcept` verwijdert op id.
- Integratie/handmatig: concept op desktop met een vrije meerwerk-regel maken, op
  desktop (ander apparaat/incognito) heropenen en controleren dat de vrije regel
  terugkomt; concept op mobiel openen en afmaken; concept verdwijnt uit de lijst
  na versturen; lijst is gelijk op beide apparaten.

## Oplevering en deploy

- Migratie `offerte_concepten` toepassen op `ntew` (dashboard-DB).
- Bouwen en testen lokaal (vitest + build groen).
- Deploy op de live branch `feat/dashboard-rebrand-v2` volgens de vaste route:
  `ssh VPS` -> `git pull origin feat/dashboard-rebrand-v2` -> `rm -rf .next` ->
  `npm run build` -> `pm2 restart frontlix` (één schone build, geen overlappende
  deploys).
- Verifieren op desktop en telefoon dat dezelfde concepten verschijnen.
