# Spec: Frontlix Demo-Tour (onboarding-rondleiding)

**Datum:** 2026-06-04
**Status:** Ontwerp goedgekeurd, wacht op implementatieplan
**Scope:** Desktop-dashboard, mobiel volgt in een latere fase

## 1. Doel en context

Nieuwe gebruikers landen na hun eerste login direct in de instel-wizard (OnboardingWizard) zonder eerst te zien wat Frontlix voor ze gaat doen. De demo-tour lost dat op: een gescripte, interactieve rondleiding die als een film laat zien hoe het product werkt, voordat de gebruiker gaat instellen.

De tour is geen echte video en geen tooltip-tour over het echte (lege) scherm, maar een nagebouwde mini-interface met vaste demodata die zichzelf per stap afspeelt. Daardoor blijft hij scherp, klikbaar, pauzeerbaar en altijd actueel met de huisstijl.

### Genomen beslissingen

| Vraag | Besluit |
|---|---|
| Vorm | Gescripte demo-tour: nagebouwde mini-interface met demodata die per stap een animatie afspeelt |
| Moment | Direct na eerste login, vóór de bestaande instel-wizard; daarna altijd terugkijkbaar |
| Inhoud | Volledige rondleiding, 10 stappen, uitgebreid uitgelegd en gedemonstreerd |
| Afspelen | Per stap klikken: elke stap speelt zijn eigen animatie en wacht dan op de gebruiker; pauzeknop aanwezig |
| Mobiel | Eerst desktop; mobiel toont een nette melding en gaat direct door naar de wizard |

## 2. UX-ontwerp

### Layout (fullscreen overlay)

Een fullscreen overlay boven het dashboard (zelfde patroon als OnboardingWizard, z-index boven alles), met drie zones:

```
┌─────────────────────────────────────────────────────┐
│  Welkom bij Frontlix            Stap 2 van 10   ✕   │
├─────────────┬───────────────────────────────────────┤
│ STAPPEN     │  [podium: nagebouwd dashboard         │
│ ✓ 1 Welkom  │   met demodata, speelt animatie af]   │
│ ▶ 2 Overzicht                                       │
│   3 Leads   │                                       │
│   ...       ├───────────────────────────────────────┤
│  10 Klaar   │  Uitgeschreven uitleg van deze stap,  │
│             │  wat je hier kunt doen.               │
│  ⏸ Pauze    │       [ ← Vorige ]  [ Volgende → ]    │
└─────────────┴───────────────────────────────────────┘
```

- **Links:** stappenmenu met alle 10 stappen, vinkje bij bekeken stappen, vrij klikbaar om te springen.
- **Midden (podium):** nagebouwde mini-versie van het relevante dashboard-onderdeel, gevuld met vaste demodata rond demo-lead "familie Jansen".
- **Onder het podium:** de uitgeschreven uitleg van de stap plus knoppen Vorige en Volgende.
- **Rechtsboven:** kruisje of "Sla over" (zelfde gedrag als afronden, zie flow).

### Gedrag

- Elke stap speelt bij binnenkomst zijn eigen animatie af en blijft daarna in de eindstand staan.
- **Volgende** werkt altijd, ook midden in een animatie: de scène springt dan direct naar zijn eindstand en de volgende stap begint.
- **Vorige** en het stappenmenu springen vrij tussen stappen; een opnieuw bezochte stap speelt zijn animatie opnieuw af.
- **Pauze** bevriest de lopende animatie (timers stoppen); nogmaals klikken hervat.
- `prefers-reduced-motion`: animaties worden overgeslagen, elke scène toont direct zijn eindstand.

## 3. De 10 stappen

| # | Stap | Animatie in het podium | Kern van de uitleg |
|---|---|---|---|
| 1 | Welkom | Rustige intro, logo en korte productpitch | Wat Frontlix is en wat de rondleiding laat zien |
| 2 | Overzicht | KPI's tellen op, in de live activity feed verschijnt een nieuwe aanvraag | Het overzicht is je startpunt: cijfers, funnel en live activiteit |
| 3 | Leads | De aanvraag van familie Jansen schuift bovenaan de leadlijst in, kaart klapt open met alle gegevens | Elke aanvraag wordt automatisch een complete lead |
| 4 | Inbox | WhatsApp-gesprek: klant stuurt bericht, typindicator, de bot antwoordt automatisch | De bot vangt klantvragen af in WhatsApp, jij leest mee en kunt altijd overnemen |
| 5 | Offerte automatisch | Uit de lead rolt automatisch een offerte, preview verschijnt, status springt naar "verzonden" | Frontlix maakt en verstuurt offertes zonder handwerk |
| 6 | Offerte handmatig | Het offertevenster (ManualOfferteController-flow) opent, regels en prijzen verschijnen stap voor stap, offerte wordt verstuurd | Liever zelf bouwen? Zo maak je handmatig een offerte |
| 7 | Agenda | De afspraak van familie Jansen landt in de agenda, routeplanning licht kort op | Afspraken en rijroutes staan automatisch goed |
| 8 | Reviews | Na de klus vraagt Frontlix automatisch om een review, sterren verschijnen | Reviews verzamelen gaat vanzelf |
| 9 | Statistieken | De grafiek tekent zichzelf, conversiecijfers tellen op | Je ziet precies wat je aanvragen en omzet doen |
| 10 | Klaar | Samenvatting van wat de gebruiker zelf kan instellen | Grote knop "Start met instellen" die de tour afrondt en de bestaande wizard opent |

De definitieve uitlegteksten worden tijdens de implementatie geschreven, in het Nederlands en volgens de huisstijl (zie 6).

## 4. Techniek

### Componentstructuur

```
components/dashboard/DemoTour/
  DemoTour.tsx          hoofdcomponent: overlay, stappenmenu, navigatie, pauze-state
  DemoTour.module.css   styling, hergebruikt design tokens uit tokens.css
  steps.ts              stapdefinities: id, titel, uitlegtekst, scène-component
  demo-data.ts          vaste demodata (familie Jansen: lead, berichten, offerte, afspraak)
  scenes/
    WelkomScene.tsx
    OverzichtScene.tsx
    LeadsScene.tsx
    InboxScene.tsx
    OfferteAutoScene.tsx
    OfferteHandmatigScene.tsx
    AgendaScene.tsx
    ReviewsScene.tsx
    StatistiekenScene.tsx
    KlaarScene.tsx
```

- Scènes zijn puur client-side componenten met vaste demodata, geen netwerk- of databasecalls.
- Animaties: CSS keyframes en transitions, aangestuurd door een kleine state-machine per scène (genummerde fases, voortgang via timers). Pauze stopt de timers, hervatten start ze weer. Geen nieuwe animatielibrary; dit past bij de bestaande CSS-modules-aanpak en de al aanwezige keyframes in `styles/globals.css`.
- Elke scène exporteert dezelfde interface: props `playing` (boolean, pauze-stand), `finished` (boolean, true = sla de animatie over en toon direct de eindstand, gebruikt voor "Volgende tijdens animatie" en reduced motion) en `onSceneEnd` (callback). Zo stuurt DemoTour alle scènes uniform aan.
- De mini-interface bootst het echte dashboard na op hoofdlijnen (sidebar-silhouet, kaarten, kleuren via design tokens), maar is een vereenvoudigde weergave, geen hergebruik van de echte feature-componenten. Dat houdt de scènes licht en voorkomt dat echte componenten demodata-props nodig hebben.

### Data en flow

- **Nieuw veld** in `dashboard_user_profiles`: `demo_tour_gezien_op` (timestamptz, null = nog niet gezien). Supabase-migratie plus bijwerken van `database.types.ts` en het `DashboardUserProfile`-interface in `lib/dashboard/auth.ts`.
- **Server action** `completeDemoTourAction` in `lib/dashboard/onboarding-actions.ts` (naast de bestaande `completeOnboardingAction`): zet de timestamp en revalideert.
- **Toonlogica** in `app/dashboard/(app)/layout.tsx`:
  1. `demo_tour_gezien_op` leeg én `onboarding_voltooid_op` leeg → demo-tour tonen (desktop).
  2. Na afronden of overslaan van de tour wordt de timestamp gezet; daarna grijpt de bestaande wizard-logica (`!profile.onboarding_voltooid_op`) en verschijnt de instel-wizard.
  3. Stap 10 ("Start met instellen") rondt de tour af en laat de wizard direct verschijnen, zonder pagina-herlaad-gevoel.
- **Mobiel** (zelfde breakpoint-aanpak als de bestaande mobile chrome): de tour rendert niet; in plaats daarvan een vriendelijke melding "Bekijk de rondleiding ook eens op een groter scherm" en direct door naar de wizard. De melding zet de databasetimestamp niet (zodat de tour op desktop alsnog vanzelf start), maar onthoudt zijn eigen wegklik-status in localStorage, zodat hij per apparaat maar één keer verschijnt.
- **Terugkijken:** menu-item "Rondleiding bekijken" in het gebruikersmenu (`UserMenu.tsx`), opent de tour opnieuw zonder de timestamp aan te passen.
- **Kleine vensters:** onder een minimum-viewportbreedte geldt dezelfde route als mobiel.

### Analytics

PostHog-events via de bestaande posthog-js-integratie:

- `demo_tour_started`
- `demo_tour_step_viewed` met property `step` (1 t/m 10)
- `demo_tour_completed`
- `demo_tour_skipped` met property `step` (waar de gebruiker afhaakte)

## 5. Foutafhandeling en randgevallen

- Scènes hebben geen externe afhankelijkheden; er is functioneel weinig dat kan falen. Mocht een scène-component toch een renderfout gooien, dan vangt een error boundary in DemoTour dit af en biedt de gebruiker "Sla over" aan, zodat niemand vast komt te zitten vóór de wizard.
- Het zetten van `demo_tour_gezien_op` faalt stil-met-melding: bij een fout blijft de tour gewoon afsluitbaar en wordt de wizard getoond; de tour verschijnt dan hooguit nog een keer bij de volgende login.
- `prefers-reduced-motion` en pauze-gedrag zoals beschreven in 2.

## 6. Teksten en huisstijl

- Alle zichtbare teksten in het Nederlands.
- Huisstijlregel: geen streepjes (em-dashes) in zichtbare tekst, gebruik een komma.
- Toon: gelijk aan de bestaande OnboardingWizard, persoonlijk en zonder jargon.

## 7. Verificatie

- Scène-state-machines zijn deterministisch (vaste fases, vaste demodata), dus elke stap is handmatig reproduceerbaar te controleren.
- Handmatige verificatie via `npm run dev`: volledige flow (eerste login → tour → wizard), pauze, Vorige/Volgende tijdens animatie, springen via stappenmenu, overslaan, terugkijken via gebruikersmenu, reduced-motion-modus en klein-venster-gedrag.
- Controle dat de PostHog-events binnenkomen.
- Migratie getest: bestaande gebruikers (met voltooide onboarding) krijgen de tour niet automatisch, alleen via "Rondleiding bekijken".

## 8. Buiten scope (bewust)

- Mobiele versie van de tour zelf (vervolgfase, verticale layout).
- Echte video-export of schermopnames.
- Meertaligheid.
- Aanpassingen aan de bestaande OnboardingWizard, behalve het moment waarop hij verschijnt.
