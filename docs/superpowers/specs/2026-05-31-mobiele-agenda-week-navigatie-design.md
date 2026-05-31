# Mobiele agenda — week-navigatie (vooruit/terug in de tijd)

**Datum:** 2026-05-31
**Status:** Goedgekeurd (ontwerp)
**Scope:** Mobile-only. Desktop-agenda blijft ongewijzigd.

---

## Probleem

De mobiele agenda toont alleen de **huidige week** (ma–zo). Er is geen manier om
vooruit of terug door de tijd te bladeren. De gebruiker wil afspraken kunnen
bekijken die verder weg liggen dan de huidige week.

## Doel

Voeg een **week-navigatie** toe aan de mobiele agenda: vorige week, volgende
week, en terug naar "Vandaag" — onbeperkt vooruit en terug.

---

## Gekozen aanpak

**Week-knoppen** (‹ / › + "Vandaag"), consistent met de desktop-agenda.
Afgewogen tegen swipe, oneindig scrollen en een kalender-datumkiezer; week-knoppen
zijn het meest robuust, hergebruiken de bestaande infrastructuur en vragen de
minste verbouwing.

De backend hiervoor bestaat al: de week zit in de URL-parameter `?week=YYYY-MM-DD`
en wordt server-side opgehaald. De desktop-agenda gebruikt dit patroon al
(`app/dashboard/(app)/agenda/page.tsx`, WeekView regels 107–116). Deze feature
voegt **alleen de mobiele navigatie-UI** toe; er komen geen nieuwe database-queries.

---

## Gedrag (UX)

1. Onder de "Agenda"-titelbalk verschijnt een compacte navigatiebalk:
   **`‹`  ·  "Week 22 · 25–31 mei"  ·  `›`** met een **"Vandaag"**-knop.
2. `‹` / `›` springen één week terug/vooruit. **Onbeperkt** — geen grens.
3. **"Vandaag"** springt naar de huidige week. Uitgeschakeld zolang de getoonde
   week de huidige week is.
4. De bestaande dag-strip (`AgendaDayJumpStrip`, ma–zo met event-stipjes) wordt
   functioneel: **tik een dag → de lijst scrollt naar die dag-groep** binnen de
   getoonde week (smooth scroll).
5. Dag-groepen, afspraak-rijen, de live-"Bezig"-banner en de filter-pills
   (Vandaag / Deze week / Eigen werk) blijven ongewijzigd.

---

## Architectuur & componenten

### Bestaande infrastructuur (hergebruikt, niet gewijzigd)
- `lib/dashboard/agenda-week.ts` — `parseWeekParam(sp)` levert `mondayKey`,
  `weekNumber`, `rangeLabel`, `queryStart`, `queryEnd`. `shiftWeekKey(key, ±1)`
  geeft de maandag-sleutel van de vorige/volgende week.
- `lib/dashboard/agenda-queries.ts` — `getAppointmentsForRange(start, end)`.
- `components/dashboard/mobile/agenda/agenda-mobile-mappers.ts` — mapping +
  Amsterdam-tijdzone (`amsterdamDayKey`, `amsterdamTime`, `buildMobileWeekDays`).

### Wijzigingen

**1. `app/dashboard/(app)/agenda/page.tsx` (server)**
Bereken in het mobiele tak-blok (regels ~60–72) de navigatie-sleutels en geef ze
mee in `MobileAgendaData`:
- `prevWeekKey = shiftWeekKey(mobileWeek.mondayKey, -1)`
- `nextWeekKey = shiftWeekKey(mobileWeek.mondayKey, 1)`
- `isCurrentWeek` — `true` als `mobileWeek.mondayKey === parseWeekParam({}).mondayKey`.
  `parseWeekParam` zonder week-param levert de huidige week; we vergelijken de
  maandag-sleutels. Geen nieuwe helper nodig.

**2. `components/dashboard/mobile/agenda/MobileAgenda.tsx`**
Type `MobileAgendaData` uitbreiden met `prevWeekKey`, `nextWeekKey`,
`isCurrentWeek`. Doorgeven aan `AgendaWeek`.

**3. Nieuw: `AgendaWeekNav.tsx` + `AgendaWeekNav.module.css`**
Klein presentatie-component:
- Props: `prevWeekKey`, `nextWeekKey`, `isCurrentWeek`, `weekLabel`.
- Rendert drie `next/link`-links: `‹` → `/agenda?week={prevWeekKey}`,
  `›` → `/agenda?week={nextWeekKey}`, "Vandaag" → `/agenda`.
- "Vandaag" krijgt een disabled/inactieve stijl wanneer `isCurrentWeek`.
- Toont het `weekLabel` in het midden.
- Styling met bestaande tokens (`tokens.css`), mobile-first, geen `!important`.

**4. `components/dashboard/mobile/agenda/AgendaWeek.tsx`**
- Render `AgendaWeekNav` direct onder de `titleBar` en bóven de filter-pills.
- Dag-strip cablen: geef `onJump` door aan `AgendaDayJumpStrip`. Houd per
  dag-groep een ref bij (ref-map op `date`, of een `id={`agday-${date}`}` op de
  `AgendaDayGroup`-wrapper) en scroll bij `onJump(date)` met
  `scrollIntoView({ behavior: 'smooth', block: 'start' })`.

**5. `AgendaDayGroup.tsx`** (indien nodig voor de scroll-target)
Accepteer een optionele `id` of forward-ref op de buitenste sectie zodat
`AgendaWeek` ernaartoe kan scrollen. Minimale wijziging; geen visuele impact.

---

## Data-flow

```
URL ?week=KEY
   │
   ▼
page.tsx (RSC)
  parseWeekParam → mondayKey/queryStart/queryEnd
  getAppointmentsForRange(start, end)
  shiftWeekKey(±1) → prev/next keys ; isCurrentWeek
  → MobileAgendaData { events, todayDate, nowTime, weekDays, weekLabel,
                       prevWeekKey, nextWeekKey, isCurrentWeek }
   │
   ▼
MobileAgenda → AgendaWeek
  ├─ AgendaWeekNav (‹ label › + Vandaag)  → next/link naar /agenda?week=…
  └─ AgendaDayJumpStrip (onJump → scrollIntoView)
```

Navigatie verloopt via `next/link` (soft RSC-navigatie): de server haalt de
nieuwe week op en geeft verse data terug. De client-component blijft gemount, dus
de lokale filter-state (`useState('week')`) blijft behouden.

---

## Edge cases

- **Lege week** → bestaande tekst "Geen afspraken deze week." blijft staan.
- **"Vandaag" op de huidige week** → knop is inactief (geen navigatie-no-op die
  verwart).
- **Weeknummer/-label** → komen al kant-en-klaar uit `parseWeekParam`
  (`weekLabel` bestaat al in `MobileAgendaData`).
- **Tijdzone** → Amsterdam-dagkey/-tijd al correct in de mappers (DST-veilig via
  `Intl.DateTimeFormat`).
- **`?view=`-parameter (desktop)** → de mobiele links zetten alleen `?week=`.
  Op mobiel is `view` niet relevant; de mobiele tak gebruikt altijd de week-lijst.
- **Filter "Vandaag" buiten de huidige week** → in een andere week bevat de lijst
  geen dag die `=== todayDate` is, dus het "Vandaag"-filter toont dan leeg. Dit is
  bestaand gedrag van de filter-pill; valt buiten deze scope. (Eventueel later:
  filter resetten naar "week" bij week-wissel.)

---

## Mobile-only & veiligheid

- Alle nieuwe UI leeft in de `.mobileTree` (`display:none` op desktop). De
  desktop-views (`WeekView`/`MonthView`/`RouteView`) blijven ongewijzigd.
- De `page.tsx`-wijziging voegt alleen velden toe aan `MobileAgendaData`; de
  desktop-fetch en -rendering blijven intact.
- Geen externe libraries; CSS Modules + tokens; geen `!important`.

---

## Out of scope (bewust, YAGNI)

- Swipe-navigatie tussen weken.
- Oneindig scrollen / "laad meer".
- Kalender-datumkiezer (bottom-sheet) om naar een willekeurige datum te springen.
- Maand-view op mobiel.
- Handmatig afspraken aanmaken.

Deze kunnen later bovenop de week-navigatie worden toegevoegd.

---

## Testplan

1. **Statisch:** `npm run lint` + `npm run build` (TypeScript-check).
2. **Seed-data:** enkele test-afspraken in verschillende weken (huidige week,
   +1 week, −1 week) in de dashboard-DB, zodat navigatie zichtbaar effect heeft.
   (Veilig: de WhatsApp-bot draait op een andere database.)
3. **Real-device (telefoon, poort 3000):**
   - Open de agenda → huidige week met de bestaande test-afspraak (31 mei).
   - `›` → volgende week; controleer dat de juiste afspraken/lege staat tonen.
   - `‹` → terug; "Vandaag" → springt naar de huidige week en wordt inactief.
   - Tik een dag in de strip → lijst scrollt naar die dag.
4. **Regressie:** desktop-agenda ongewijzigd (week/maand/routekaart blijven werken).
