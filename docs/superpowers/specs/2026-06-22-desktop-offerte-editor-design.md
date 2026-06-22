# Desktop offerte-editor (v2 dossier) — design

Datum: 2026-06-22 · Branch: feat/dashboard-rebrand-v2

## Doel
De offerte-bewerk-interface op de **desktop** lead-dossier ("Offertes"-tab) terugbrengen
naar volledige functionaliteit, gelijk aan de mobiele editor, maar met een
desktop-geoptimaliseerde layout en uitklapbare (accordion) secties.

## Uitgangspunt (hergebruik, niet herbouwen)
Het reken-/opslag-brein bestaat al en wordt ongewijzigd hergebruikt
(zie memory `offerte-form-model-reuse`):
`ManualOfferteData`, `computeRules`/`computeTotals`, debounced `saveOfferteForm`,
`saveDraft`, `revertConcept`, per-regel prijs-overrides. De bestaande desktop
`components/dashboard/v2/dossier/OfferteEditor.tsx` (~1100 regels) gebruikt dit al
en wordt **uitgebreid**, niet vervangen.

## Beslissingen (met de owner afgestemd)
1. **Altijd tonen.** De editor staat altijd op de Offertes-tab, ook zonder
   onverstuurd concept. Editen + opslaan maakt/werkt het concept (nieuwe versie) bij.
2. **Layout:** editor in de linkerkolom van de split-view; WhatsApp-chat blijft rechts.
   Binnen secties 2-koloms grids waar dat past. Desktop-look mag licht afwijken van
   mobiel waar dat beter is voor desktop.
3. **Volledige pariteit:** accordions, kortingspresets (10/20/30/50% + vast bedrag),
   geldigheidspresets (7/14/30/60 dgn), "Bekijk PDF"-preview, "Versie-historie".
4. **Nieuwe offerte:** activeren (de v2-wizard `NewOfferteMount` werkt al; knoppen
   dispatchen `rb:new-offerte`). "(binnenkort)" eraf.
5. **Offerte versturen:** knop in de dossier-header. Flush concept-save → bevestigings-
   dialoog ("naar [klant] via WhatsApp?") → `POST /api/dashboard/lead/[id]/approve-quote`
   (bot stuurt via WhatsApp) → refresh. **Alleen eerste verzending**; bij een al
   verstuurde offerte (`offerte_verstuurd=true`) toont de knop "Al verstuurd"
   (uitgeschakeld). Herverzending van revisies = aparte vervolgstap (bot-werk).

## Wijzigingen per bestand
- `components/dashboard/v2/dossier/OffertesTab.tsx` — editor **altijd** renderen
  (niet alleen bij concept). Bestaande offertes als compacte lijst erboven.
- `components/dashboard/v2/dossier/dossier-mappers.ts` (+ `dossier-data.ts`) —
  `offertes` (versie-historie) en `fotosCount` doorvoeren naar de editor.
- `components/dashboard/v2/dossier/OfferteEditor.tsx` — secties in accordions
  (Klant dicht, Werk open, Korting dicht, Geldig dicht); kortings- en geldigheids-
  presets; korstmos/planten als toggles; actiebalk (opslaan-indicator, Bekijk PDF,
  Download PDF, Versie-historie, "Terug naar verstuurde versie").
- Nieuw: `AccordionSection` (desktop), `OffertePdfModal` (v2 Modal + bestaande
  `OffertePdfData`/`OffertePdf`/`deliverPdfBlob`), `OfferteHistorieModal` (v2 Modal).
- `components/dashboard/v2/dossier/DossierView.tsx` — "Offerte versturen"-knop
  activeren (bevestiging → flush → approve-quote → refresh; "Al verstuurd" wanneer
  reeds verstuurd) en "Nieuwe offerte" activeren.
- `components/dashboard/v2/dossier/OffertesTab.tsx` / Shell — "Nieuwe offerte
  (binnenkort)" activeren (`rb:new-offerte`).

## Buiten scope (deze ronde)
- Herverzenden van revisies via de bot.
- WhatsApp-template-verzending voor losse manual-offertes (al uitgezet in de wizard).

## Verificatie
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Puppeteer-screenshot van de desktop Offertes-tab, naast de mobiele referentie leggen.
