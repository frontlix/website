# Agent-contract — Frontlix Dashboard rebrand v2

Je bouwt één pagina van het nieuwe Frontlix-dashboard ("Concept 5 + aurora")
in de bestaande Next.js-codebase. Dit document is leidend. Wijk er niet van af.

## Missie

Bouw de toegewezen pagina **pixel-getrouw** na volgens het design-prototype,
maar met de codebase-conventies (Next.js App Router, React 19, TypeScript, CSS
Modules + tokens, `lucide-react`). De pagina draait op **demo-data** (geen
Supabase). Echte data-koppeling is een latere fase, bouw die NIET.

Scope = **desktop** (canvas 1440 breed). Geen mobiele varianten.

## Bron van het design (lezen vóór je begint)

Het klikbare prototype staat hier (inline-styled JSX, React-CDN):

```
/Users/christiaantromp/.claude/jobs/989c7f93/tmp/dash7/design_handoff_dashboard_rebrand/
  README.md                      ← volledige design-spec per scherm
  src/rebrand/concept/C*.jsx     ← statische referentie-schermen
  src/rebrand/proto/P*.jsx       ← interactieve schermen (leidend voor gedrag)
```

De inline-style-waarden in die JSX zijn **leidend** voor exacte spacing,
radii, kleuren en gedrag. Lees jouw toegewezen bestanden (zie je opdracht) +
de bijbehorende README-sectie.

## Routing

- Pagina's leven onder `app/dashboard/v2/<route>/page.tsx`.
- Op de dashboard-host serveert de middleware ze als `/v2/<route>` (de basis
  voor links is `/v2`, geïmporteerd als `V2_BASE` uit `ui/Shell`).
- De shell (header + pill-nav + aurora) zit al in `app/dashboard/v2/layout.tsx`
  via `<Shell>`. **Bouw alleen de pagina-inhoud**, niet de shell.

## Bestanden die JIJ aanmaakt (geen andere agent raakt ze aan)

- `app/dashboard/v2/<route>/page.tsx` + `page.module.css`
- Sub-componenten in `components/dashboard/v2/<gebied>/...` (elk eigen `.module.css`)
- Pagina-specifieke demo-data in een EIGEN bestand:
  `components/dashboard/v2/<gebied>/<gebied>-data.ts`

**Raak NIET aan** (gedeeld, single-writer): `demo-data.ts`, `ui/*`,
`styles/rebrand-tokens.css`, `app/dashboard/v2/layout.tsx`. Mist een primitive
iets? Maak een nieuwe lokale component in je eigen map, bewerk `ui/` niet.

## Styling-regels

- **CSS Modules + tokens.** Gebruik uitsluitend `var(--rb-*)` voor kleuren,
  radii en schaduwen. Zie `styles/rebrand-tokens.css` voor alle tokens
  (`--rb-bg`, `--rb-card`, `--rb-ink`, `--rb-muted`, `--rb-blue`,
  `--rb-blue-soft`, `--rb-cyan`, `--rb-mint`, `--rb-mint-ink`, `--rb-success`,
  `--rb-note`, `--rb-line`, `--rb-field`, `--rb-field-2`, `--rb-wa-bg`,
  `--rb-wa-in`, `--rb-wa-out`, radii `--rb-r-card|card-sm|field|chip|pill`,
  schaduwen `--rb-shadow-card|btn|btn-strong|modal|dropdown|nav`).
- **Geen hardcoded hex** in CSS/JSX (m.u.v. puur-witte `#fff` en de
  WhatsApp-bubbelkleuren als token). Geen Tailwind.
- **Inline style alleen** voor waarden die uit props/state komen (chart-
  geometrie, dynamische posities, drag-offsets), net als `ui/Ring`/`ui/Sparkline`.
  Statische styling hoort in `.module.css`.
- **Iconen = `lucide-react`**, geen emoji. Vervang prototype-emoji door het
  best passende Lucide-icoon met dezelfde betekenis (bv. 📝→`StickyNote`,
  🗄→`Archive`, 📷→`Camera`, 📤→`Send`, 📄→`FileText`, ✓→`Check`, ✕→`X`,
  ‹→`ChevronLeft`, ⏸→`Pause`, ✨→`Sparkles`, ⠿→`GripVertical`).
- **Font** = Inter, al globaal geladen. Headings 800, letter-spacing -0.02em.
  Typo-schaal: paginatitel 24-30/800, kaarttitel 13.5-16/800, body 12.5-14,
  meta 10.5-12 muted, sectielabel 11/700 UPPERCASE (gebruik class
  `rb-section-label`, al gedefinieerd).

## HUISSTIJL (belangrijk)

Frontlix-huisstijl: **geen liggende streepjes (em-dash / en-dash) in zichtbare
tekst**. Gebruik een komma. Ook geen klemtoonaccenten (schrijf "een", niet
"één") in UI-copy. Punt-separators (`·`) mogen wel. De demo-data is al
streep-vrij; houd het zo in jouw copy.

## Gedeelde primitives (`@/components/dashboard/v2/ui`)

Importeer als: `import { Card, Button, ... } from "@/components/dashboard/v2/ui"`.

| Component | Props |
|---|---|
| `Card` | `radius?: "lg"\|"md"` (24/16), `pad?: "lg"\|"md"\|"none"`, + div-props, `children` |
| `Button` | `variant?: "primary"\|"secondary"\|"ghost"`, `size?: "md"\|"sm"`, + button-props |
| `Toggle` | `value: boolean`, `onChange: (b)=>void`, `aria-label?` |
| `Stepper` | `value: number`, `onChange`, `step?`, `min?`, `max?`, `suffix?`, `formatNL?` |
| `SegmentedControl<T>` | `options: {value:T,label}[]`, `value:T`, `onChange`, `tone?: "light"\|"ink"` |
| `StatusPill` | `kind?: "hot"\|"new"\|"plan"\|"sent"`, `children` |
| `Avatar` | `initials?`/`name?`, `size?` (px), `radius?: number\|"round"`, `variant?: "soft"\|"gradient"` |
| `Sparkline` | `data?`, `width?`, `height?`, `stroke?`, `strokeWidth?`, `opacity?` |
| `Ring` | `pct?`, `size?`, `stroke?`, `color?`, `track?`, `label?`, `sub?`, `labelColor?` |
| `Modal` | `open`, `onClose`, `width?` (px), `label?`, `children` (Esc + klik-buiten sluit) |
| `Drawer` | `open`, `onClose`, `width?`, `label?`, `children` |

Steppers/toggles/segmented/modal zijn client-componenten. Een pagina met
interactie moet `"use client"` bovenaan hebben.

## Gedeelde demo-data (`@/components/dashboard/v2/demo-data`)

Exports: `NAV`, `PRIMARY_NAV`, `TENANT`, `STATUS_LINE`, `BRIEF`,
`OWNER_ACTIONS`, `OMZET`, `KPIS`, `SPARK`, `LEAD_FILTERS`, `LEADS`,
`PIPELINE_COLUMNS`, `THREADS`, `CHAT`, `findLead(id)`, plus types
(`Lead`, `Thread`, `StatusKind`, `Kpi`, ...). Heb je MEER data nodig
(afspraken, reviews, analytics, dossier-details, offerteprijzen): zet die in je
EIGEN `<gebied>-data.ts`, importeer gedeelde stukken hieruit. Bewerk
`demo-data.ts` niet.

## "+ Nieuwe offerte"-event

De shell-knop en de dossier-knop dispatchen `window.dispatchEvent(new
CustomEvent("rb:new-offerte"))`. De offerte-wizard-agent bouwt een component dat
hierop luistert. Andere pagina's hoeven hier niets mee te doen behalve, waar het
prototype dat toont, zelf ook dit event dispatchen om de wizard te openen.

## Kwaliteitslat

- Pixel-getrouw aan het prototype (spacing, radii, kleuren, copy).
- TypeScript moet typechecken (`npx tsc --noEmit` schoon voor jouw bestanden).
- Nette, leesbare componenten; splits grote schermen op in sub-componenten
  (één duidelijke taak per bestand).
- Hover-states subtiel toevoegen (bv. 4% ink-overlay op klikbare rijen/kaarten).
- Lever aan het eind een korte lijst van de bestanden die je hebt aangemaakt.
