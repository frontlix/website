# Mobile Leads & Inbox — Design Spec

**Datum:** 2026-05-28
**Scope:** Twee nieuwe mobiele dashboard-schermen — **Leads** (pipeline-lijst met swipe-cards + inline expand + filter-sheet) en **Inbox** (WhatsApp-stijl gesprekkenlijst + fullscreen chat-detail + zoeken). Beide volledig functioneel op echte data + bestaande API's.
**Doel:** Pixel-perfect implementatie van de handoff in `supabase/migrations-frontlix/design_handoff_mobile_leads_inbox/`, geport naar het bestaande dashboard-patroon (CSS Modules + tokens + server-data-blob) — gespiegeld aan de bestaande mobiele Overzicht.
**Niet-scope:** Agenda/Reviews/Lead-detail mobiel; nieuwe DB-kolommen; backend voor snooze; volledige message-body-zoekindex. Desktop Leads/Inbox blijven 100% ongewijzigd.

Bouwt voort op spec `2026-05-26-mobile-overzicht-shell-makeover-design.md` (de mobiele app-shell + Overzicht). Dit is de daar genoemde "volgende sprint".

---

## 1. Architectuur

Identiek aan het bewezen Overzicht-patroon: de **server-page** fetcht echte data, bouwt één typed data-blob, en geeft die door aan een `'use client'` mobiele composer. Een CSS-mediaquery toont `.mobileTree` (≤ 640px) of `.desktopTree` (≥ 641px). Beide trees staan in de DOM; geen hydration-flits.

```
app/dashboard/(app)/leads/page.tsx        app/dashboard/(app)/inbox/page.tsx
├── <div .desktopTree>  (ongewijzigd)     ├── <div .desktopTree>  (ongewijzigd)
│     LeadsPipeline / Table / Kaarten     │     3-koloms inbox-grid
└── <div .mobileTree>                      └── <div .mobileTree>
      <MobileLeads data={…}/>                    <MobileInboxList …/>  of
                                                 <MobileChatDetail …/> (bij ?lead=)
```

**Desktop ongewijzigd:** de bestaande JSX wordt in een `.desktopTree`-wrapper gezet (zoals `app/dashboard/(app)/page.tsx` al doet voor Overzicht). Geen logica-wijziging aan desktop-componenten.

**Navigatie — URL-gedreven (codebase-conform), niet de handoff-`InboxFlow`-state-machine:**
- Leads: tap-kaart → **inline** `LeadExpandedPanel` (geen navigatie). "Open volledig dossier" → `/leads/[lead_id]`. "+" → `/leads?nieuwe-offerte=1`.
- Inbox: `/inbox` = lijst · `/inbox?lead=ID` = fullscreen chat · `/inbox?q=…` = zoeken. Hergebruikt bestaande `InboxRealtime` + `InboxMarkRead`; echte terug-knop + deeplinks gratis.

---

## 2. Breakpoint

**640px**, project-conform (`lib/dashboard/use-is-mobile.ts` bestaat, tristate). Shell-zichtbaarheid is CSS-driven; `useIsMobile` alleen waar JS-mount-gedrag verschilt (bv. swipe pointer-handlers niet binden op desktop-tree).

---

## 3. Bestandsstructuur

```
components/dashboard/mobile/
├── useSwipeReveal.ts                 ← GEDEELDE swipe-hook (reveal 144px, drempel 40px, --ease-ios)
├── leads/
│   ├── MobileLeads.tsx / .module.css         ← scherm + state (filter/search/expandedId/sheet/advFilter)
│   ├── LeadsSegmentedChips.tsx / .css        ← sticky stage-chips met counts
│   ├── LeadCard.tsx / .css                   ← LACard (avatar+source-dot, naam+meta, rechter-metric, stage-pill, binnen)
│   ├── SwipeableLeadCard.tsx / .css          ← useSwipeReveal-wrapper + tap-to-expand
│   ├── LeadExpandedPanel.tsx / .css          ← inline drilldown (stats, dienst, Surface-context, acties, open dossier)
│   └── LeadsFilterSheet.tsx / .css           ← bottom-sheet (fase multi-select, bron, urgent, sorteer)
└── inbox/
    ├── MobileInboxList.tsx / .css            ← header + timeline-secties + swipe-rows
    ├── InboxRow.tsx / .css                   ← rij-content (avatar, naam, preview, unread-badge)
    ├── SwipeableInboxRow.tsx                 ← useSwipeReveal-wrapper (tap → /inbox?lead=ID)
    ├── MobileChatDetail.tsx / .css           ← fullscreen WA-view (header + surface-banner + chat + composer)
    ├── MessageBubble.tsx / .css              ← klant/Surface-bubbel (+ DaySeparator, SystemBanner)
    ├── MobileChatComposer.tsx / .css         ← input + verzenden (send-message API)
    └── MobileLeadInfoSheet.tsx / .css        ← bottom-sheet lead-info (tik op header)

styles/tokens.css                     ← + WA-chat tokenset (light) + .dark-overrides
```

Server-mapping-helpers (pure functies) komen onderaan de respectievelijke `page.tsx`, exact zoals de Overzicht-mapping in `app/dashboard/(app)/page.tsx`.

---

## 4. Leads-scherm

**Layout** (handoff §1): sticky header (titel 28/800, sub `<LiveDot/> X van Y zichtbaar`, acties zoek/filter/+), sticky segmented-chips (`Alles · Gesprek · Review · Offerte · Gepland · Klaar` met counts), conditionele actief-filter-strip, lead-lijst (gap 8).

**State** (client, in `MobileLeads`): `filter` · `searchOpen` · `search` · `expandedId` · `sheetOpen` · `advFilter {stages:Set, bronnen:Set, urgentOnly, sort}`.

**Stage-mapping** — hergebruik de bestaande `FilterKey`-logica uit `leads/page.tsx`:
| Chip | gesprek_fase / dashboard_status | metric-nadruk |
|---|---|---|
| Gesprek | `info_verzamelen` | "nog geen prijs" |
| Review | `onderhandelen` | prijs |
| Offerte | `offerte_besproken` | prijs |
| Gepland | `datum_kiezen` / `afspraak_bevestigd` | datum |
| Klaar | `dashboard_status='afgehandeld'` | datum |

**SwipeableLeadCard** (handoff §SwipeableCard): drag-reveal lades + tap-to-expand. Lades verborgen wanneer expanded. Tap zonder beweging → toggle expand.
- Links (swipe →): **Bel** (`tel:`) · **WhatsApp** (`wa.me`).
- Rechts (swipe ←): **Archief** (bestaande server-action `archiveLead(leadId)` in `lib/dashboard/lead-actions.ts`). *Snooze vervalt (reductie #2).*

**LeadExpandedPanel** (handoff §ExpandedPanel): kleurstrip + stats-grid + dienst + Surface-context (`botStatusForFase()`) + actieknoppen (primair varieert per stage) + "Open volledig dossier" → `/leads/[lead_id]`.

**Zoeken**: client-side filter van de geladen set (max 100 uit `getLeadsList`), matcht naam/plaats/telefoon — snappy, geen round-trip.

---

## 5. Inbox-scherm

### 5a. Lijst (`MobileInboxList`, route `/inbox`)
Header (titel "Inbox", sub `<ALiveDot/> X live · Y ongelezen`, zoekknop → `/inbox?q=`). Timeline-secties, lege secties verborgen:
| Sectie | Conditie (echte data) |
|---|---|
| Nu actief | laatste bericht < 30 min |
| Vandaag | laatste bericht vandaag (> 30 min) |
| Gisteren | laatste bericht gisteren |
| Eerder | ouder |

*Pinned-sectie vervalt (reductie #3, geen DB-veld).* Ongelezen-badge uit `inbox_gelezen_op` (bestaande `matchesFilter('unread')`-logica). Rij-tap → `/inbox?lead=ID`. Swipe: Bel/WA links, Archief rechts.

### 5b. Chat (`MobileChatDetail`, route `/inbox?lead=ID`)
Fullscreen, **BottomNav verborgen**. Header (WA-groen) met terug → `/inbox`, identiteit (tik → `MobileLeadInfoSheet`), bel/menu. Surface-toggle-banner (ON/OFF) bedient `bot-pauzeren`. Chat-area met bubbels uit `getMessagesForLead`. Composer (`MobileChatComposer`) → `send-message` (zelfde guard: alleen actief wanneer bot gepauzeerd, net als desktop `WhatsAppComposer`).

**Bubbel-mapping**: `richting='inkomend'` → klant (links, wit/donker). `richting='uitgaand'` → **Surface (blauw, rechts) als default** (reductie #1). DaySeparator/SystemBanner uit timestamps. Online-dot/typing/voice: weglaten tenzij `type` voice aangeeft (reductie #3).

### 5c. Zoeken (route `/inbox?q=`)
Hergebruik desktop-serverzoek over previews (naam/telefoon/laatste bericht). Volledige message-body-index = reductie #4 (follow-up).

---

## 6. Databron-mapping (samengevat)

**Leads** ← `getLeadsList()` → `LeadListItem[]`:
`naam·plaats·m2` direct · `dienst`=`hoofdcategorie`+`sub_diensten` · `prijs`=`totaal_prijs` · `datum`=`afspraak_datum`+`afspraak_starttijd` · `bron`=`bron`/`kanaal` · `binnen`=relatief uit `aangemaakt`/`bijgewerkt` (`shortTimeAgo`) · `urgent`=afgeleid uit `pending_eigenaar_review`/`klus_geblokkeerd` (`deriveActions`) · Surface-context=`botStatusForFase()`.

**Inbox** ← `getActiveConversations()` (lijst) · `getMessagesForLead()` (thread) · `getInboxLeadContext()` (lead-sheet, incl. `fotosCount` + `botGepauzeerd`).

---

## 7. Acties & API-hergebruik

| Actie | Bestaande backend |
|---|---|
| Bericht versturen | `app/api/dashboard/lead/[lead_id]/send-message/route.ts` |
| Surface pauzeren/hervatten | `app/api/dashboard/lead/[lead_id]/bot-pauzeren/route.ts` (logica uit `InboxBotToggle`) |
| Archiveren | `archiveLead()` / `unarchiveLead()` in `lib/dashboard/lead-actions.ts` |
| Bellen / WhatsApp | `tel:` / `wa.me`-links |
| Gesprek gelezen | `InboxMarkRead` (bestaand, side-effect op mount) |
| Nieuwe offerte | `/leads?nieuwe-offerte=1` |

---

## 8. Bewuste fidelity-reducties (geen backend)

1. **Chatbubbel owner-vs-Surface**: niet te onderscheiden zonder nieuwe kolom → uitgaand = Surface-blauw default. *Follow-up: `berichten.verzonden_door ('bot'|'owner')`.*
2. **Snooze-swipe**: weggelaten; rechts alleen Archief.
3. **Pinned / online-dot / typing-indicator**: weggelaten (geen DB-veld).
4. **Inbox-zoeken**: previews-only (geen volledige message-body-index).
5. **Foto-count in Leads-expand**: stat weggelaten (niet in lijst-query); oppervlak/offerte/binnen blijven.
6. **"Surface"-naam**: uit `tenant.chatbot_naam` (default "Surface").

---

## 9. Tokens & dark mode

Hergebruik bestaande dashboard-tokens (`--accent`/`--primary`, `--surface`, `--fg`/`--fg-muted`/`--fg-soft`, `--danger`/`--success`, `--radius-*`, `--space-*`, `--ease-ios`, `--mobile-*`). Dark werkt automatisch via `.dark`-wrapper.

**WA-chat is de uitzondering** (kleuren zitten niet in tokens): voeg een scoped WA-tokenset toe aan `styles/tokens.css` met `.dark`-overrides — headerGreen `#075E54`, chatBg `#ECE5DD`/`#0B141A`, bubbel-kleuren (klant/owner/surface, zie handoff §MessageBubble), tickBlue `#53BDEB`, meta-grijs.

---

## 10. Bouwvolgorde (parallel via sub-agents)

1. **Substraat eerst** (klein, blokkeert de rest): `useSwipeReveal.ts` + WA-tokens in `tokens.css`.
2. **Parallel** (twee onafhankelijke clusters, elk eigen sub-agent):
   - **Leads-cluster**: `MobileLeads` + chips + `LeadCard` + `SwipeableLeadCard` + `LeadExpandedPanel` + `LeadsFilterSheet` + `leads/page.tsx`-wiring.
   - **Inbox-cluster**: `MobileInboxList` + rows + `MobileChatDetail` + bubbels + composer + lead-sheet + `inbox/page.tsx`-wiring.
3. **Integratie**: BottomNav-zichtbaarheid op `/inbox?lead=` (verbergen), counts-badges (leads/inbox) voeden.

---

## 11. Verificatie

- `npm run build` per cluster (TypeScript + lint groen).
- `node screenshot.mjs http://localhost:3000/leads` en `/inbox` op 402px viewport — **light én dark** (`.dark`-toggle).
- Golden paths handmatig: chips filteren, swipe links/rechts, tap-expand, filter-sheet; inbox-rij → chat → terug, Surface-toggle, bericht versturen, lead-sheet.
- Regressie-check desktop Leads/Inbox (mag niet wijzigen).

---

## 12. Open follow-ups (buiten deze scope)

- `berichten.verzonden_door` kolom → echte owner-groen vs Surface-blauw.
- Volledige message-body-zoekindex voor inbox-search.
- Snooze-backend (+ swipe-actie terug).
- Foto-count in leads-lijst-query (of lazy on-expand endpoint).
