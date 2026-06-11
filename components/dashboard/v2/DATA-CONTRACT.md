# Data-koppel-contract — Frontlix Dashboard v2

Je koppelt één v2-pagina van demo-data los en hangt 'm aan de **echte
Supabase-data en de bestaande server-actions**. v2 wordt het nieuwe live
dashboard, dus we **hergebruiken** de bestaande queries/acties van het
`(app)`-dashboard; we verzinnen geen nieuwe DB-logica.

CWD-WAARSCHUWING: je werkdirectory is NIET de app-repo. Gebruik altijd
absolute paden. Geen worktree. Draai GEEN volledige build (de hoofd-agent
verifieert globaal).

## Lees eerst (absolute paden)

1. Dit contract.
2. Jouw gedetailleerde data-contract: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/data-contracts/<jouw-key>.md` (queries, datavormen, mutaties/server-actions, valkuilen, stappenplan).
3. De bestaande `(app)`-pagina + componenten die dat contract noemt (zo zie je de exacte queries en welke server-actions de knoppen aanroepen).
4. De huidige v2-pagina + componenten + de demo-data die je vervangt.

## Het patroon (verplicht)

**Server-fetch → mapper → bestaande v2-componenten.** De v2-look is al
goedgekeurd; je verandert ALLEEN de databron en wired de knoppen. Raak de
visuele opzet, spacing en de scroll/hoogte-structuur niet aan.

1. **Pagina-root wordt een server-component** (haal `"use client"` van de
   `page.tsx` af). Haal data op met de sessie-helper:
   ```ts
   import { v2Session } from "@/lib/dashboard/v2/session";
   const s = await v2Session();
   ```
   - `s !== null` → echte, tenant-gescopete client `s.supabase` (RLS actief). Doe dezelfde query als de bestaande `(app)`-pagina, map de uitkomst naar de props die de v2-componenten al verwachten.
   - `s === null` → val terug op de bestaande demo-data (dev-preview zonder login). Houd deze demo-tak expliciet en kort; hij verdwijnt bij de definitieve omzet.
2. **Mappers** in een eigen bestand `components/dashboard/v2/<area>/<area>-mappers.ts`: DB-rij → v2-component-props. Verander de prop-vormen van de v2-componenten NIET; map de echte data erin. Hergebruik bestaande mapper-helpers uit `lib/dashboard/` waar die bestaan.
3. **Interactieve delen blijven `"use client"`** maar krijgen hun data via props van de server-component (gebruik desnoods een dunne client-wrapper-component die de state houdt). 
4. **Mutaties (knoppen) hergebruiken de bestaande server-actions / API-routes** uit jouw data-contract. Roep ze client-side aan via `startTransition` of een `<form action={...}>`. Schrijf GEEN nieuwe insert/update-logica; importeer de bestaande actie. Na succes: revalidate/refresh of router-navigatie zoals de bestaande pagina doet.

## Regels

- **Hergebruik, niet herbouwen.** Elke query en elke mutatie bestaat al in
  `(app)`/`lib/dashboard`. Importeer of repliceer exact; wijk niet af van de
  filters/condities (bv. de leads-badge-conditie met NULL-status).
- **Tenant-scoping via RLS**: `s.supabase` is al gescoped; geen extra
  tenant-filter nodig tenzij de bestaande code dat doet.
- **Supabase-typing**: zonder gegenereerde types geeft Supabase `never`; cast
  resultaten net zoals de bestaande code (`as { ... } | null`).
- **Geen secrets in de client.** Server-only werk (mail/PDF/admin) blijft in
  server-actions. Importeer `lib/dashboard/supabase-admin` NOOIT in een
  client-component.
- **Visueel niets veranderen** behalve waar de echte data andere velden
  oplevert dan de demo (dan map je naar de bestaande UI). Huisstijl blijft:
  geen liggende streepjes/accenten in zichtbare tekst, lucide-iconen,
  `var(--rb-*)`-tokens.
- **Lege/laad-staten**: vang lege resultaten netjes op (geen crash bij 0
  rijen). Loading mag simpel (de pagina is server-rendered).
- **Realtime**: als de bestaande pagina realtime gebruikt en het is klein om
  mee te nemen (hergebruik de bestaande realtime-component), doe dat; anders
  noteer het als follow-up, blokkeer er niet op.

## Bestanden die JIJ aanraakt (disjunct per pagina)

- `app/dashboard/v2/<route>/page.tsx` (→ server-component) + evt. een client-wrapper in je eigen map.
- `components/dashboard/v2/<area>/*` (data via props + mutatie-aanroepen) + `<area>-mappers.ts` + evt. een client-action-wrapper.

**Raak NIET aan** (gedeeld / al gekoppeld door de hoofd-agent):
`app/dashboard/v2/layout.tsx`, `components/dashboard/v2/ui/*`,
`components/dashboard/v2/shell-data.ts`, `lib/dashboard/v2/session.ts`,
`components/dashboard/v2/demo-data.ts`, en de `lib/dashboard/`-helpers en
bestaande server-actions (die importeer je alleen).

## "+ Nieuwe offerte" / offerte versturen

De Shell-knop en de dossier-knop dispatchen al `window.dispatchEvent(new
CustomEvent("rb:new-offerte"))`; `NewOfferteMount` vangt dat. Alleen de
**offerte-agent** koppelt de wizard-submit aan de bestaande server-action
`createManualLeadEnOfferte()` (map de v2-wizard-state → `ManualOfferteData`
uit `lib/dashboard/manual-offerte-types.ts`). Andere pagina's hoeven alleen
het event te dispatchen.

## Oplevering

Geef terug: gewijzigde/aangemaakte bestanden, welke echte queries en
server-actions je hebt gekoppeld, eventuele follow-ups (realtime, ontbrekende
API-route), en bewuste afwijkingen.
