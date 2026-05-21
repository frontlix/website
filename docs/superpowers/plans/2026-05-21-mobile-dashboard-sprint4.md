# Mobile Dashboard — Sprint 4 Implementation Plan

**Goal:** Polish-sprint — Reviews, Instellingen, Statistieken, Veldwerk en resterende modals mobile-vriendelijk maken. Daarna is Sprint 1-4 compleet.

**Spec:** [`docs/superpowers/specs/2026-05-21-mobile-dashboard-design.md`](../specs/2026-05-21-mobile-dashboard-design.md)

---

## Task A — Reviews + Statistieken + Veldwerk (CSS-only polish)

**Files:**
- Modify: `app/dashboard/(app)/reviews/page.module.css`
- Modify: `app/dashboard/(app)/statistieken/page.module.css` (touch-ups als nodig)
- Modify: `app/dashboard/(app)/veldwerk/page.module.css` (touch-ups als nodig)

### A1 — Reviews

In `reviews/page.module.css`:

1. Vind de `.reviewsGrid` selector — vervang `repeat(auto-fill, minmax(380px, 1fr))` door:
   ```css
   grid-template-columns: repeat(auto-fill, minmax(min(380px, 100%), 1fr));
   ```
   (Hierdoor klapt 'ie netjes naar 1 kolom op smalle schermen zonder overflow.)

2. Voeg onderaan toe (controleer dat KPI-grid selector bestaat, gebruik feitelijke naam):
   ```css
   @media (max-width: 640px) {
     /* KPI-rij stackt op telefoon */
     .kpiGrid {
       grid-template-columns: 1fr;
     }
   }
   ```

### A2 — Statistieken

Lees `statistieken/page.module.css`. Bestaande media queries zijn al `1024px` en `640px` — controleer alleen of `.kpiGrid`, `.twoCol`, etc. correct collapsen. Geen wijziging als alles in orde is. Voeg evt. een PeriodSelector tap-min toe:

```css
@media (max-width: 640px) {
  .periodSelector button,
  .periodSelector [role="button"] {
    min-height: var(--tap-min);
  }
}
```

(Alleen toevoegen als die selector bestaat.)

### A3 — Veldwerk

Veldwerk is al mobile-first. Geen wijzigingen — alleen verifieer dat alle interactieve targets ≥`var(--tap-min)` zijn. Als de `.card` of `.chevron` te klein is, geef de card `min-height: var(--tap-min)` (waarschijnlijk al ruim 80px).

**Commit:** `feat(mobile): Reviews + Stats + Veldwerk polish (<640px collapses + tap-min)`

---

## Task B — Instellingen (multi-tab settings)

**Files:**
- Modify: `app/dashboard/(app)/instellingen/page.module.css`
- Modify: `components/dashboard/instellingen/SettingsNav.module.css`

### B1 — SettingsNav breakpoint omlaag

In `SettingsNav.module.css`, vind `@media (max-width: 900px)` en verander naar `@media (max-width: 768px)`. Voeg óók tap-min toe aan de items:

```css
@media (max-width: 768px) {
  .nav {
    /* bestaande regels — flex-row, overflow-x: auto, position: static */
  }
  .item {
    min-height: var(--tap-min);
    flex-shrink: 0;
  }
}
```

(Behoud bestaande inhoud van de `@media` block; voeg de `.item` regel toe als die er nog niet is.)

### B2 — Pricing/services/notifications layouts op <640

In `instellingen/page.module.css`, voeg onderaan toe:

```css
@media (max-width: 640px) {
  .layout {
    /* Sidebar collapse — al gespecificeerd, maar zorg dat 'ie ook hier overruled wordt */
    grid-template-columns: 1fr;
  }
  .fieldGrid {
    /* `repeat(auto-fit, minmax(240px, 1fr))` — al responsive, geen wijziging */
  }
  /* Prijzen-lijst en service-rows: stack label boven waarde. */
  .pricingItem,
  .serviceRow {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  /* Notif-tabel: scroll horizontaal (5-kolom 1fr 60 60 60 60 past niet). */
  .notifHead,
  .notifRow {
    /* Indien overall container scrolt, daar overflow-x:auto zetten */
  }
}
```

(Controleer welke selectors echt bestaan; sommige selectors hierboven zijn aanname-namen uit de eerdere audit — gebruik feitelijke namen en rapporteer.)

Voor de notif-tabel: als er een wrapper-class is (bv. `.notifTable`), voeg `overflow-x: auto` toe op <640px. Anders accepteer overflow-scroll van de parent.

### B3 — Toggle-switches tap-area

Vind `.toggle` of vergelijkbare switch-class. Voeg toe:

```css
.toggle {
  /* bestaande regels behouden */
  min-width: var(--tap-min);
  /* min-height 24 → 28 op mobile voor betere tap */
}
@media (max-width: 640px) {
  .toggle {
    min-height: 28px;
  }
}
```

(Toggle blijft visueel ≈18-28px, maar de pseudo-tap-area kan via padding-trick groter; voor nu houden we het simpel met grotere min-height.)

**Commit:** `feat(mobile): Instellingen mobile (nav, prijzen/diensten stack, toggle tap-area)`

---

## Volgorde

Tasks A en B zijn onafhankelijk (verschillende files) — parallel.
Na beide: één combined review + final clean build.

Optioneel: Editor-modals (PrijzenEditor, PricingRuleEditor) → MobileSheet — wordt voorlopig overgeslagen, kan in Sprint 5 polish-pass.

Optioneel: ManualOfferteController is al MobileSheet-compatibel; OnboardingWizard en ExportsModal kregen in Sprint 1 al hun mobile padding. Klaar.
