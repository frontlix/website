# Mobile Dashboard — Sprint 3 Implementation Plan

**Goal:** Lead-detail, Offerte-wizard, en Agenda mobile-vriendelijk op 320–480 px.

**Spec:** [`docs/superpowers/specs/2026-05-21-mobile-dashboard-design.md`](../specs/2026-05-21-mobile-dashboard-design.md)

---

## Task A — Lead-detail polish

Veel is al goed (tabs scrollen, OfferteRegelsTable heeft grid-areas op <640, info-tab collapst op 900). Drie gerichte fixes:

**Files:**
- Modify: `components/dashboard/lead-detail/WhatsAppPane.module.css`
- Modify: `components/dashboard/lead-detail/LeadDetailHeader.module.css`
- Modify: `components/dashboard/leads/LeadPhotos.module.css`

### A1 — WhatsAppPane min-height op mobile
`min-height: 480px` is te veel voor kleine schermen. Onderaan toevoegen:
```css
@media (max-width: 800px) {
  .pane {
    min-height: 360px;
  }
}
@media (max-width: 480px) {
  .pane {
    min-height: 280px;
  }
}
```

### A2 — LeadDetailHeader: 700px → 640px voor consistentie
Vind de bestaande `@media (max-width: 700px)` block en verander 'm naar `@media (max-width: 640px)`. Inhoud blijft hetzelfde.

### A3 — LeadPhotos: kleinere grid op mobile
Onderaan toevoegen:
```css
@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: var(--space-2);
  }
}
```

**Commit:** `feat(mobile): Lead-detail mobile polish (WhatsApp-pane, header, foto-grid)`

---

## Task B — Offerte-wizard mobile

De `ManualOfferteModal` is een centered modal die op mobile niet past. Twee gerichte aanpassingen:

1. Op `<768px`: full-screen sheet (modal vult viewport) — geen MobileSheet-conversie omdat de wizard z'n eigen state-machine heeft; we hergebruiken de bestaande shell maar maken 'm 100vh op mobile.
2. Footer sticky houden, body scrolt.
3. Breakpoint 720 → 768 voor consistentie.

**Files:**
- Modify: `components/dashboard/offerte/ManualOfferteModal.module.css`

### B1 — Full-screen op mobile, sticky footer

Onderaan toevoegen (vervang bestaande `@media (max-width: 720px)` block met 768px):

```css
@media (max-width: 768px) {
  .backdrop {
    padding: 0;
    background: var(--bg);
  }
  .shell {
    width: 100%;
    max-width: 100%;
    height: 100vh;
    height: 100dvh;
    max-height: 100vh;
    border-radius: 0;
  }
  .header {
    padding: 14px 16px;
  }
  .body {
    padding: 16px;
  }
  .footer {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 8px;
    position: sticky;
    bottom: 0;
    background: var(--bg);
  }
  /* Bestaande 720px-grid-collapses behouden — verplaats ze hierheen */
  .grid2, .grid21, .gridAddr, .extraGrid, .kanaalGrid, .zandDetail, .topToolsGrid {
    grid-template-columns: 1fr;
  }
  .stepper {
    overflow-x: auto;
  }
  /* Knoppen krijgen tap-min hoogte. */
  .footer button {
    min-height: var(--tap-min);
  }
}
```

Verwijder de oude `@media (max-width: 720px)` block (we hebben de regels eruit overgenomen).

**Commit:** `feat(mobile): Offerte-wizard full-screen + sticky footer op <768px`

---

## Task C — Agenda mobile

Drie gerichte fixes:

**Files:**
- Modify: `components/dashboard/agenda/AgendaWeekGrid.module.css`
- Modify: `components/dashboard/agenda/AgendaCalendar.module.css`
- Modify: `app/dashboard/(app)/agenda/page.module.css`

### C1 — Week-grid horizontaal scrollen op <800px

Vervang/voeg toe in `AgendaWeekGrid.module.css`:

```css
@media (max-width: 800px) {
  /* Op telefoon: laat het grid horizontaal scrollen zodat dagen
     leesbaar blijven; tijd-kolom blijft sticky links zodat de
     gebruiker zonder context geen tijden mist. */
  .scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .grid {
    grid-template-columns: 48px repeat(7, minmax(72px, 1fr));
    min-width: 600px;
  }
}
```

(Selectors aanpassen aan feitelijke namen — controleer of `.scroll` of `.grid` de outer wrapper is. Als 'er een wrapper is, voeg `overflow-x: auto` daar toe. Anders zet 'em op `.grid` zelf.)

### C2 — Maand-cellen op <480px nog kleiner

Vind bestaande `@media (max-width: 768px)` block in `AgendaCalendar.module.css`, voeg toe (apart blok):

```css
@media (max-width: 480px) {
  .grid {
    grid-auto-rows: minmax(64px, auto);
  }
  .weekday {
    padding: 4px 2px;
    font-size: 10px;
  }
}
```

### C3 — Page-layout `.weekGrid` op <800px stack al — geen verdere actie nodig.

(Optioneel: voeg een korte comment toe in `agenda/page.module.css` dat verklaart dat sidebar onder de week-grid stackt.)

**Commit:** `feat(mobile): Agenda week-grid horizontaal scrollen + maand-cellen compacter`

---

## Volgorde

Tasks A, B, C zijn onafhankelijk (verschillende files) — parallel.
Na alle drie: één combined review + final build.
