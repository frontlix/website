# Offerte goedkeuren en wijzigen vanuit het dashboard

Datum: 2026-06-25
Status: ontwerp, klaar voor implementatieplan
Branch-doel: feat/dashboard-rebrand-v2 (live dashboard)

## Aanleiding

Wanneer een lead alle informatie heeft ingevuld, zet de bot een offerte klaar en
krijgt de eigenaar een e-mail "ter goedkeuring" met twee acties: Goedkeuren en
Wijzigen. In het dashboard ontbreekt dat herkenbare goedkeur-moment. De
onderliggende machinerie bestaat al, maar is verstopt en op twee punten kapot.

Wat er nu feitelijk is:

- Goedkeuren = de kop-knop "Offerte versturen" in het leaddossier. Die roept de
  bot-functie `approveQuote` aan (PDF naar de klant via WhatsApp + e-mail).
- Wijzigen = de bestaande `OfferteEditor` in het tabblad Offertes (regels,
  korting, m2, voegzand, extra arbeid, geldigheid, met live prijsoverzicht).

Twee bevestigde fouten:

1. **Blokkade-fout.** Zodra de bot een offerte op status `wacht_op_goedkeuring`
   zet, telt het dashboard die mee als "al verstuurd". De afleiding
   `alVerstuurd` in `DossierView.tsx` zondert `wacht_op_goedkeuring` niet uit
   (het label doet dat wel). Gevolg: de enige goedkeur-knop staat op "Al
   verstuurd" en is uitgeschakeld, juist op het moment dat goedkeuren zou
   moeten. De backend (`approve-quote` 409't alleen bij `offerte_verstuurd=true`)
   zou de goedkeuring wel accepteren.
2. **Prijs-fout.** De `OfferteEditor` schrijft per-regel prijs-overrides naar
   `leads.offerte_prijs_overrides` (JSON). De bot leest die JSON nooit;
   `calculatePrice` leest losse kolommen (`reinigen_per_m2_override`,
   `onkruid_per_m2_override`, `invegen_arbeid_normaal_per_m2_override`,
   `beschermlaag_per_m2_override`, `reiskosten_per_km_override`,
   `extra_arbeid_prijs_override`). Een aangepaste regelprijs in het dashboard
   wordt bij versturen stil teruggedraaid in de klant-PDF. (m2 en korting gaan
   wel goed mee.)

Daarnaast: op mobiel is goedkeuren/versturen een stub (`handleSendClick` toont
"Versturen via WhatsApp wordt binnenkort gekoppeld").

## Doel

Een herkenbaar "Offerte ter goedkeuring"-moment in het dashboard, op desktop en
mobiel, met Goedkeuren en Aanpassen, dat betrouwbaar exact de zichtbare offerte
naar de klant stuurt. Geen nieuwe offerte-machinerie: we maken de bestaande
zichtbaar, compleet en correct.

## Scope (in een operatie)

1. Goedkeur-blok op de computer (desktop dossier).
2. Goedkeur-blok op de telefoon plus een echte goedkeur-actie.
3. Blokkade-fout fixen (`wacht_op_goedkeuring` is niet "verstuurd").
4. Prijs-fout fixen (regel-overrides bereiken de bot-berekening).

## Niet in scope

- Geen nieuwe bot-endpoints. We hergebruiken `approve-quote` (`approveQuote`) en
  de bestaande `OfferteEditor` / `MobileOfferteEditor`.
- Geen wijziging aan de e-mail-goedkeurflow.
- Geen apart "snel-aanpassen"-popup. Aanpassen gaat naar het volledige
  bestaande bewerkscherm.
- Het bot `modify-quote`-endpoint blijft ongebruikt (het is een strikte subset
  van wat de editor al kan).

## Ontwerp

### Wanneer verschijnt het goedkeur-blok

Conditie: de lead heeft een offerte-rij met `status = 'wacht_op_goedkeuring'` en
`lead.offerte_verstuurd = false`. Dit is precies het signaal dat de bot
(`processQuote` bij `info_compleet`) de offerte klaarzette en op de eigenaar
wacht.

- Conditie waar: toon het goedkeur-blok bovenaan het dossier.
- Na goedkeuren (`offerte_verstuurd = true`, offerte naar `verstuurd`): blok
  verdwijnt; toon de bestaande "Verstuurd"-staat.
- Geen offerte ter goedkeuring (in gesprek, of al verstuurd, of alleen een
  handmatig concept): geen blok; bestaande gedrag blijft.

### Desktop: het blok (gekozen layout A)

- Plek: volle breedte, bovenaan het dossier, onder de kop, boven de split-view
  (tabs links, WhatsApp-gesprek rechts).
- Vorm: groen-omrande kaart. Titel "Offerte wacht op je goedkeuring".
  Subregel met dienst, m2 en totaal incl. btw (uit de `wacht_op_goedkeuring`-
  offerte: `totaal_incl`). Twee knoppen: "Aanpassen" (secundair) en
  "Goedkeuren" (groen, primair).
- Goedkeuren: ongewijzigde flow. Bevestigingsdialoog, dan
  `POST /api/dashboard/lead/[id]/approve-quote`, dan `router.refresh()`.
- Aanpassen: schakelt naar het tabblad Offertes en brengt de `OfferteEditor` in
  beeld. In de editor komt dezelfde groene "Goedkeuren"-knop, zodat je na het
  wijzigen direct kunt goedkeuren zonder terug te scrollen. Die knop doet
  `offerteApiRef.flush()` (laatste concept wegschrijven) en daarna dezelfde
  approve-call, identiek aan de huidige "Offerte versturen"-knop.
- De bestaande kop-knop "Offerte versturen" wordt overbodig zodra het blok de
  primaire plek is. Voorstel: bij `wacht_op_goedkeuring` toont de kop die knop
  niet meer (het blok neemt het over); de overige kop-acties (Notitie, Archief,
  Geen echte lead, Opdrachtbon) blijven.

### Blokkade-fout

- Kern: `alVerstuurd` (`DossierView.tsx`) mag een `wacht_op_goedkeuring`-offerte
  niet als verstuurd tellen.
- Aanpak: de offerte-status meenemen in de dossier-mapper (een afgeleide vlag,
  bijvoorbeeld `wachtOpGoedkeuring`, naast `concept`/`tone`), en die gebruiken
  voor zowel de blok-conditie als de `alVerstuurd`-afleiding. Bron van waarheid
  is de offerte-status, niet alleen de visuele tone.

### Mobiel

- Hetzelfde goedkeur-blok bovenaan het mobiele dossier (gestapeld: titel,
  subregel, twee knoppen).
- Aanpassen opent de bestaande `MobileOfferteEditor`.
- Goedkeuren: vervang de stub `handleSendClick` (alert) door een echte
  `POST /api/dashboard/lead/[id]/approve-quote` plus refresh. Zelfde
  blok-conditie en blokkade-fix als desktop (de mobiele mapper kent het
  `wacht_op_goedkeuring`-label al).

### Prijs-fout

- Probleem: dashboard schrijft overrides als JSON in
  `leads.offerte_prijs_overrides`; de bot leest losse `*_override`-kolommen.
- Voorkeursfix (dashboard-zijde, geen bot-deploy): laat `saveOfferteForm` de
  per-regel overrides ook wegschrijven naar de losse kolommen die
  `calculatePrice` leest. Een vaste mapping van elke override-sleutel naar de
  bijbehorende bot-kolom.
- Te verifiëren in het implementatieplan:
  1. Bestaan al die `*_override`-kolommen op `leads` in de productie-DB (ntew)?
     Zo niet: kleine migratie om de ontbrekende toe te voegen, of die override
     in de editor (tijdelijk) uitschakelen.
  2. Volledige, sluitende mapping van alle `PRIJS_OVERRIDE_KEYS`
     (`offerte-form-mapping.ts`) naar de exacte bot-kolomnamen.
- Alternatief (verworpen): de bot de JSON laten lezen. Vereist een bot-deploy
  (gevoelig, de bot-VPS is eerder gedivergeerd geweest) en verspreidt de fix
  over twee repo's. De dashboard-zijde houdt alles in een repo en raakt de live
  bot niet.

## Betrokken plekken

Geen nieuwe tabel. Mogelijk een kleine migratie voor ontbrekende
override-kolommen (te verifiëren). Bot ongewijzigd (`approveQuote`,
`processQuote`).

Dashboard:

- `components/dashboard/v2/dossier/DossierView.tsx` (blok, blokkade-fix,
  Aanpassen-navigatie, kop-knop)
- `components/dashboard/v2/dossier/dossier-mappers.ts` (status-vlag)
- `components/dashboard/v2/dossier/OfferteEditor.tsx` (Goedkeuren-knop in de
  editor)
- `components/dashboard/v2/dossier/OffertesTab.tsx` (doorgeven van de
  approve-actie)
- `components/dashboard/mobile/dossier/MobileLeadDossier.tsx` en
  `components/dashboard/mobile/dossier/offerte/MobileOfferteEditor.tsx` (blok,
  echte approve, Aanpassen)
- `components/dashboard/mobile/dossier/dossier-mappers.ts` (status-vlag)
- `lib/dashboard/offerte-form-mapping.ts` en
  `lib/dashboard/offerte-form-actions.ts` (override-kolommen wegschrijven)

## Foutafhandeling

- Goedkeuren mislukt (netwerk of 409 "al verstuurd"): toon een melding, geen
  state-mutatie (zoals nu).
- Dubbelklik: knop disabled tijdens versturen; de bot heeft bovendien een
  atomic claim (`offerte_verstuurd` false naar true) die dubbel versturen
  voorkomt.
- Aanpassen plus goedkeuren: eerst `flush()` (de editor saved debounced), dan
  approve, zodat exact de zichtbare offerte wordt verstuurd.

## Testen

- Unit: de mapper-vlag voor `wacht_op_goedkeuring`; de `alVerstuurd`-afleiding
  met en zonder een wachtende offerte.
- Unit: `saveOfferteForm` vult de bot-leesbare override-kolommen op basis van de
  ingevoerde regel-overrides.
- Handmatige test (Chris), end to end op een testlead:
  1. Lead met een offerte ter goedkeuring: het blok is zichtbaar, Goedkeuren is
     klikbaar (niet "Al verstuurd").
  2. Goedkeuren stuurt de offerte echt naar de klant.
  3. Aanpassen opent het bewerkscherm; een regelprijs aanpassen en goedkeuren;
     de klant-PDF toont de aangepaste prijs.
  4. Hetzelfde op de telefoon.

## Open punten en risico's

- Exacte override-kolomnamen en hun bestaan in ntew (verifiëren voor de
  prijs-fix).
- Meerdere offerte-versies: de laatste `wacht_op_goedkeuring`-rij is leidend.
- Handmatige concepten zonder bot-flow: tonen geen goedkeur-blok; hun bestaande
  verstuur-flow blijft ongemoeid.
- Live branch: dit raakt `feat/dashboard-rebrand-v2`. Werk in een aparte branch
  of worktree, deploy pas na expliciete toestemming.
