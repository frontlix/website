# Mobile Overzicht — Implementatie-handoff

Korte technische uitleg van hoe de mobiele Overzicht-pagina is opgebouwd, zodat een developer (of Claude Code) 'm in een echte codebase kan nabouwen.

---

## 1. Wat is de mobiele versie?

Op viewports < 720px (of als de `mobilePreview`-tweak aanstaat in de design-prototype) vervangt de hele app-shell zich met een mobiel-eigen layout:

- **Geen sidebar, geen topbar** — daarvoor in de plaats een sticky bottom-tab-bar
- **5 tabs**: Overzicht · Leads · Inbox · Agenda · **Meer**
- **Meer** opent geen route maar een bottom-sheet met Reviews / Analyses / Veldwerk / Instellingen / Profiel / Uitloggen
- Op **Overzicht** zit in de header een **+ Nieuwe offerte**-knop (gradient-rond, tussen zoek en bel)
- Op Overzicht kun je doortikken naar 3 drilldowns: **Wat nu**, **Vandaag**, **Activiteit** — die schuiven als sub-schermen over de hoofdpagina (interne state, geen route-change)

---

## 2. Bestandsstructuur

```
src/
├── optie-a/
│   ├── AShared.jsx          ← icons, theme tokens, bottom-nav, mocks
│   ├── AOverzicht.jsx       ← hoofdscherm Overzicht (header, AI brief,
│   │                          hero KPI met goal-ring, 2×2 mini-KPIs,
│   │                          Wat nu, Vandaag, Recent feed)
│   └── ADrilldowns.jsx      ← AWatNu, AVandaag, AActiviteit
├── screens/
│   └── MobileFlow.jsx       ← MobileShell (app-vervangende shell),
│                              MobileOverzichtPage (drilldown-state-manager),
│                              MeerSheet (bottom-sheet),
│                              MobileBezel (phone-frame voor preview),
│                              useIsMobile hook
└── app.jsx                  ← switch desktop ↔ mobile shell
```

In productie zou je deze files reorganiseren naar:

```
features/dashboard/mobile/
├── MobileShell.tsx
├── MobileOverzicht.tsx
├── drilldowns/
│   ├── WatNu.tsx
│   ├── Vandaag.tsx
│   └── Activiteit.tsx
├── components/
│   ├── BottomNav.tsx
│   ├── MeerSheet.tsx
│   ├── HeaderActions.tsx       (zoek / + offerte / bel)
│   ├── AIBrief.tsx
│   ├── HeroKpi.tsx
│   ├── MiniKpiGrid.tsx
│   ├── UrgentRow.tsx
│   └── FeedRow.tsx
├── theme/
│   └── tokens.ts                (makeATheme equivalent)
└── hooks/
    ├── useIsMobile.ts
    └── useTheme.ts
```

---

## 3. Hoe het in app.jsx wordt geactiveerd

Direct na het auth-check, vóór de gewone shell:

```jsx
const isMobile = useIsMobile(tweaks.mobilePreview);

if (isMobile) {
  const mobileContent = (
    <MobileShell
      page={page}
      param={param}
      navigate={navigate}
      tweaks={tweaks}
      setTweak={setTweak}
      empty={tweaks.empty}
    />
  );
  return (
    <>
      {tweaks.mobilePreview
        ? <MobileBezel onExit={() => setTweak('mobilePreview', false)}>{mobileContent}</MobileBezel>
        : <div style={{ position: 'fixed', inset: 0 }}>{mobileContent}</div>}

      {tweaksOpen && <TweaksWindow tweaks={tweaks} setTweak={setTweak} onClose={…} />}
      {manualQuote && <MobileManualQuoteModal onClose={…} />}
      {showOnboarding && <Onboarding onComplete={…} />}
      {exportOpen && <ExportsModal onClose={…} />}
    </>
  );
}

// Otherwise fall through to the desktop shell
```

In productie: `useIsMobile()` kijkt naar `window.innerWidth < 720` met resize-listener. De `mobilePreview`-tweak is alleen voor design-iteratie en kan in productie weg.

---

## 4. MobileShell-contract

`MobileShell` is de top-level mobiele app-shell. Hij rendert:

| Element | Wat het doet |
|---|---|
| Per-page content (op basis van `page` prop) | `MobileOverzichtPage`, `MobileFallback` (placeholders voor screens die nog geen mobiel ontwerp hebben) |
| `<ABottomNav>` onderaan | Vaste 5 tabs · `onTab` callback routeert via `navigate(route)` of opent de Meer-sheet |
| `<MeerSheet>` | Slide-up sheet met Reviews / Analyses / Veldwerk / Instellingen / Profiel / Uitloggen |

**Belangrijke regel**: alleen MobileShell rendert de bottom-nav. A* schermen (`AOverzicht`, `AWatNu`, `AVandaag`, `AActiviteit`) accepteren een `showBottomNav` prop (default `true` voor standalone gebruik in design-canvas; `false` als ze binnen MobileShell zitten).

**PAGE_TO_TAB mapping** zorgt dat als de gebruiker via een diepere route binnenkomt (bv. `#reviews`), de **Meer-tab** gehighlight is:

```js
const PAGE_TO_TAB = {
  overzicht:    'home',
  leads:        'leads',
  inbox:        'inbox',
  agenda:       'cal',
  reviews:      'meer',
  analyses:     'meer',
  veldwerk:     'meer',
  instellingen: 'meer',
};
```

---

## 5. Drilldown-pattern (Wat nu / Vandaag / Activiteit)

`MobileOverzichtPage` houdt een eigen `sub` state (`null | 'watnu' | 'vandaag' | 'feed'`). Twee absolute lagen over elkaar:

1. **Base layer** — `<AOverzicht>` (de hoofdpagina). Krijgt `transform: translateX(-20%) scale(0.96)` en `opacity: 0` als er een drilldown open is, voor een iOS-stijl "weg-schuiven" effect.
2. **Drilldown layer** — `<AWatNu>` / `<AVandaag>` / `<AActiviteit>`. Schuift van rechts in (`translateX(100% → 0)`).

Drilldowns gebruiken **geen** route. Dit voorkomt dat bottom-nav-state of analytics-events vervuilen. Ze hebben hun eigen `<ANavBar>` met "← Terug"-knop die `setSub(null)` aanroept.

---

## 6. Design-tokens (`makeATheme`)

Eén functie die een theme-object teruggeeft op basis van `{ dark, accent, accent2 }`:

```js
{
  dark, bg, surface, surface2, elev,
  fg, fgMuted, fgSoft,
  border, borderSoft, chipBg,
  accent, accent2,         // default #1A56FF → #00CFFF gradient
  success, warning, danger, wa,
}
```

In een echte codebase doe je dit met CSS-vars op `:root` + `body.dark` (zoals in `styles.css`). Voor dit prototype is het in JS gehouden zodat de A*-componenten in isolation te demoën zijn (`Mobiel Overzicht - Optie A.html`).

---

## 7. Meer-sheet — anatomie

```
┌─ drag-handle ──────────────┐
│ MEER                Sluit  │
├────────────────────────────┤
│ ⭐ Reviews          ⓶ ›    │
│    2 nieuwe deze week      │
│ 📊 Analyses           ›    │
│    Conversie, omzet, …     │
│ 🚚 Veldwerk      [PWA] ›  │
│    Voor onderweg · …       │
├────────────────────────────┤
│  ☀️ Schakel naar donker    │
├────────────────────────────┤
│ [CT] Christiaan Tromp      │
│      Owner · Schoon Straatje  │
│                [Instellingen]│
│                            │
│              Uitloggen     │
└────────────────────────────┘
```

- Backdrop achter de sheet (`rgba(0,0,0,.36)`) is tap-to-dismiss
- Sheet zelf schuift via `transform: translateY(110% → 0)` met `cubic-bezier(.32,.72,0,1)` (iOS-stijl easing)
- Tappen op een rij = `onNav(route)` → `navigate(route)` + sheet sluiten
- Thema-toggle is inline (geen aparte settings-page nodig voor zo'n simpele state)
- Profile-strip bevat het ENIGE pad naar Instellingen op mobile

---

## 8. Header op Overzicht — "+ Nieuwe offerte"

De gradient + knop tussen zoek en bel is de primaire creatie-actie op mobile. Hij roept `window.__openManualQuote?.()` aan — dezelfde callback als de "Nieuwe offerte"-knop in de desktop-topbar. Op mobile mode opent dit altijd de `MobileManualQuoteModal` (zie `MOBILE_OFFERTE_HANDOFF.md`).

```jsx
<button
  onClick={() => window.__openManualQuote?.()}
  aria-label="Nieuwe offerte"
  style={{
    width: 40, height: 40, borderRadius: 20,
    background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
    color: 'white',
    boxShadow: `0 4px 14px ${t.accent}40`,
    display: 'grid', placeItems: 'center',
  }}>
  <AIcon name="plus" size={20} stroke={2.6} color="white"/>
</button>
```

Eerder zat dit als een floating-action-button rechtsonder. Verplaatst naar header omdat (a) de Meer-tab visueel concurreerde, (b) een FAB iOS-vreemd voelt, (c) de header-positie discoverable + makkelijk-bereikbaar is met de duim op iPhone Pro/Max formaten.

---

## 9. Schermen met hit-targets

Alle tap-doelen ≥ 40 px. Specifieke specs:

| Element | Hoogte |
|---|---|
| Bottom-nav tab | 56 (incl. label + safe-area padding) |
| Header iconen (zoek/+/bel) | 40 |
| AI-brief primaire CTA | 36 |
| Hero KPI tap (om naar analyses te gaan) | full card |
| Mini-KPI tile | 86 |
| Urgent / Feed rij | 56 |
| Meer-sheet rij | 60 |
| Drilldown filter chips | 32 |

---

## 10. Wat ontbreekt nog (volgende sprint)

- **Leads** op mobiel — nu een placeholder via `MobileFallback`. Patroon: large-title + filter chips + lijst met tappable rijen.
- **Inbox** op mobiel — patroon: lijst van WhatsApp-conversaties → tap opent chat-view.
- **Agenda** op mobiel — patroon: dag/week-toggle + lijst van afspraken (hergebruik `AVandaag` als basis).
- **Lead-detail** op mobiel — patroon: large-title + sticky tab-strip (Overzicht / Offerte / Foto's / Notities).
- **Pull-to-refresh** — visueel pattern voor lange feeds.
- **Push-notificaties** — outside scope van deze design-handoff.

---

## Bijgesloten files

```
mobile-overzicht-handoff/
├── README.md           (dit document)
├── AShared.jsx         (icons, theme, bottom-nav, mocks)
├── AOverzicht.jsx      (hoofdscherm)
├── ADrilldowns.jsx     (Wat nu, Vandaag, Activiteit)
└── MobileFlow.jsx      (shell + sheet + bezel + hook)
```

De files zijn JSX met inline styles, gemaakt voor in-browser Babel. Voor productie: rewrite naar TSX, splits in modules, en hang het thema op CSS-vars in plaats van JS-objecten.
