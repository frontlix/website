# "Zelf overnemen" — hand-over-lead zichtbaar in het dashboard

Datum: 2026-06-24
Status: ontwerp goedgekeurd, klaar voor implementatieplan
Branch: `feat/zelf-overnemen`

## Probleem

Als een klant buiten het werkgebied van de eigenaar valt (buiten de straal) én
onder de minimale vierkante meter zit, neemt de WhatsApp-bot de lead niet verder
in behandeling: hij maakt nog wel een offerte, valt daarna stil tegen de klant,
en mailt de eigenaar (een owner-approval-mail met een "[BUITEN BEREIK]"-banner).
De bot markeert deze lead in de database met `eigenaar_overgenomen = true` (en na
goedkeuring wordt `status = handoff`).

Het dashboard toont die markering echter **nergens**. De eigenaar ziet dus niet
in het dashboard dat deze lead een overdracht is die hij zelf moet oppakken; hij
is afhankelijk van de e-mail. Doel: deze leads in het dashboard duidelijk
herkenbaar maken zodat de eigenaar ze ziet en het gesprek zelf overneemt.

## Doel

Een lead die de bot heeft overgedragen, krijgt overal in het dashboard een
duidelijke, rode markering **"Zelf overnemen"**. De eigenaar herkent zo direct
dat hij die klant zelf moet benaderen (via de bestaande inbox kan hij de klant
een bericht sturen; de bot blijft stil).

### Scope-beslissingen (goedgekeurd)

- **Alleen tonen, geen nieuwe acties.** Geen afvink-knop en geen apart
  filter-tabblad. De eigenaar handelt de lead af met de bestaande knoppen
  (afhandelen/archiveren) en bericht de klant via de bestaande inbox.
- **Desktop (v2) én mobiel**, want de eigenaar gebruikt beide.
- **Geen database-wijziging.** De markering wordt afgeleid uit bestaande velden;
  geen migratie, geen botwerk (de bot doet zijn deel al).

### Niet in scope

- De bot-logica wijzigen (detecteren/stil vallen/mailen werkt al).
- Het daadwerkelijk overnemen van het gesprek / berichten sturen (bestaat al via
  de inbox + `bot_gepauzeerd`/send-message).
- Een filter/tab of bulk-acties voor hand-over-leads.
- Het opruimen van de bestaande dode demo-fallbacks (apart spoor).

## Ontwerp

### 1. Eén bron van waarheid: `isHandover(lead)`

Een hand-over-lead is af te leiden uit twee bestaande velden op `leads`:

- `eigenaar_overgenomen === true` — gezet door de bot zodra hij de lead overneemt
  (bij het maken van de offerte, status nog `info_compleet`). Dit is het vroege
  signaal.
- `status === 'handoff'` — de terminale status na goedkeuring van de
  edge-case-offerte.

Beide betekenen hetzelfde voor de eigenaar: "ik moet dit zelf regelen". We
introduceren één gedeelde helper (pure functie) in
`lib/dashboard/lead-status-meta.ts` (waar de status-meta al woont), zodat alle
mappers er vanuit één plek bij kunnen:

```ts
export function isHandover(lead: { eigenaar_overgenomen?: boolean | null; status?: string | null }): boolean {
  return lead.eigenaar_overgenomen === true || lead.status === 'handoff'
}
```

Alle weergave-plekken gebruiken deze ene helper, zodat de definitie op één plek
staat. Beide velden bestaan al in de DB (`leads.eigenaar_overgenomen` boolean,
`leads.status` text); waar de app-types ze nog niet kennen, worden ze toegevoegd
aan de narrowing-union in `lib/dashboard/database.types.ts` (geen DB-migratie).

### 2. Het label

- Tekst: **"Zelf overnemen"**, rode tint (`PillTone`/`StatusKind` rood).
- Uitleg-zin waar ruimte is (tooltip / subregel): "buiten werkgebied, bot heeft
  het gesprek gestopt".
- Hergebruik het al-aanwezige `handoff`-meta-item in
  `lib/dashboard/lead-status-meta.ts` (nu label "Handover", tone `red`): hernoem
  het label naar "Zelf overnemen". Dat item is nu effectief dode code, dus dit
  raakt niets bestaands.

### 3. Waar de markering verschijnt

De markering krijgt **voorrang** op de gewone afgeleide stage-/status-weergave
(net zoals "urgent" dat nu al doet): als `isHandover(lead)`, dan toont de
status-badge "Zelf overnemen" (rood) in plaats van de normale fase-badge.

| Plek | Bestand(en) | Wat |
|------|-------------|-----|
| Leadslijst desktop (v2) | `components/dashboard/v2/leads/leads-mappers.ts` (`statusKindForLead`/`statusLabelForLead`) | rode "Zelf overnemen"-badge op de rij/kaart |
| Leadslijst mobiel | `components/dashboard/mobile/leads/lead-mappers.ts` (`mapLeadToCard`, naast `isLeadUrgent`/`leadStage`) | rode badge op de kaart |
| Leaddossier desktop (v2) | `components/dashboard/v2/dossier/dossier-mappers.ts` + `DossierView.tsx` (kop-pill) | rode pill naast de naam |
| Leaddossier mobiel | `components/dashboard/mobile/dossier/dossier-mappers.ts` | rode statusregel |
| Inbox | `components/dashboard/v2/inbox/inbox-mappers.ts` | badge bij het gesprek zodat de eigenaar ziet dat hij aan zet is |
| Overzicht "Eerst dit doen" | `lib/dashboard/eerst-dit-doen.ts` (nieuwe `ActionKind: 'handover'`) | rood actie-item "Zelf overnemen: <klantnaam>, buiten werkgebied" dat naar de lead linkt |

De data-laag die deze mappers voedt (`getLeadsList`, `getLeadDetail`,
inbox-queries, de overzicht-queries) moet `eigenaar_overgenomen` en `status`
meeleveren als die nog niet geselecteerd worden; dit wordt per query
gecontroleerd en zo nodig toegevoegd.

### 4. Wanneer de markering verdwijnt

- De **badge** (lijst/dossier/inbox) blijft staan zolang `isHandover(lead)` waar
  is. Het is informatief: de lead is en blijft een overdracht.
- Het **"Eerst dit doen"-actie-item** verdwijnt zodra de eigenaar de lead
  afhandelt of archiveert. Conditie van de actie:
  `isHandover(lead) && dashboard_status !== 'afgehandeld' && !dashboard_archived`.
  Zo blijft de actielijst niet vollopen met al-afgehandelde overdrachten,
  zonder dat we een aparte afvink-knop nodig hebben (consistent met hoe de
  bestaande `owner_review`/`buiten_radius`-acties verdwijnen).

## Randgevallen en gedrag

- **Geen echte hand-over-leads in de DB nu.** Alle 14 leads zijn testdata met
  `eigenaar_overgenomen = false` / `status != handoff`. Voor verificatie zetten
  we tijdelijk één test-lead op `eigenaar_overgenomen = true` (via SQL) en
  controleren we dat de badge overal verschijnt; daarna terugzetten.
- **Voorrang.** Als een lead zowel "urgent" als hand-over is, toont de badge
  "Zelf overnemen" (hand-over is de specifiekere, actie-vereisende toestand).
  Wordt expliciet vastgelegd in de mapper-volgorde.
- **Bot blijft stil.** De weergave verandert niets aan de bot; `eigenaar_overgenomen`
  zorgt al dat de bot niet meer op de klant reageert. De eigenaar bericht de
  klant via de bestaande inbox.

## Testplan

- Unit-test `isHandover()`: true bij `eigenaar_overgenomen=true`, true bij
  `status='handoff'`, false anders (incl. ontbrekende velden).
- Unit-test de leadslijst-mapper: een lead met `eigenaar_overgenomen=true` levert
  badge-label "Zelf overnemen" + rode tint, en wint van de gewone stage-badge.
- Unit-test `eerst-dit-doen.ts`: een hand-over-lead levert een `handover`-actie;
  diezelfde lead met `dashboard_status='afgehandeld'` of `dashboard_archived=true`
  levert géén actie meer.
- Handmatig/integratie: één test-lead op `eigenaar_overgenomen=true` zetten en op
  desktop + mobiel controleren: leadslijst-badge, dossier-pill, inbox-badge,
  overzicht-actie. Daarna de test-lead terugzetten.

## Oplevering en deploy

- Geen database-migratie.
- Lokaal: `npx vitest run` + `npm run build` groen.
- Deploy op de live branch `feat/dashboard-rebrand-v2` via de vaste route
  (ff-merge vanuit `feat/zelf-overnemen`, dan VPS `git pull` + `rm -rf .next` +
  `npm run build` + `pm2 restart frontlix`), met een ff-check vlak vóór de push
  omdat de live branch actief beweegt, en zonder overlappende build
  (rebuild-race).
- Verifieren op desktop + mobiel met de test-lead, daarna de test-markering
  terugzetten.
