# Dashboard Makeover — Implementation Plan

> Volledige restyle van het Frontlix-dashboard naar het Claude-Design bundle.
> Foundation + Overzicht zijn gedaan (Fase 1 + 2, commits `6e41cf7` + `9e81db9`).
> Dit plan dekt Fase 3 t/m Fase 10.

**Filosofie:** sloop visuele laag per fase, bouw opnieuw met design-system. Backend (`lib/dashboard/`, server actions, API routes, RLS, types) blijft intact.

**Design-bron:** `/tmp/dashboard-design-Ow2MaUSxYBGiY1aoo/dashboard/project/` — `src/screens/*.jsx` per scherm, `src/styles.css` voor CSS, `src/components.jsx` voor atoms.

---

## Globale conventies (alle fasen)

- Globale dashboard CSS classes worden alleen geïmporteerd in `app/dashboard/(app)/layout.tsx` (`@import '@/styles/dashboard.css'`). Class-namen krijgen `dash-` prefix (geen botsing met marketing).
- Server-components by default; alleen `'use client'` waar interactiviteit vereist is (forms, dropdowns, tabs, charts met ResizeObserver).
- UI atoms in `components/dashboard/ui/` zijn herbruikbaar over alle schermen heen.
- Page-specifieke components in `components/dashboard/<screen>/`.
- Volledige sloop per fase: oude file → `git rm` → nieuw bestand. Geen naast-elkaar-bouwen.
- Per fase: `npm run build` + `npm test` (waar van toepassing) groen vóór commit.

---

## Fase 3 — Leads (lijst-pagina)

**Doel:** `/leads` overzicht met pipeline-view (5-fase kanban) als primaire view. Geen table-view voor V1 (kan later).

**Sloop:**
- `app/dashboard/(app)/leads/page.tsx`
- `app/dashboard/(app)/leads/page.module.css`
- `components/dashboard/leads/*` — alleen de FE-display-components die over enkele dagen vervangen worden (LeadsTable, LeadFilters, LeadStatusBadge, LeadTagsList, etc.). **NIET slopen:** `LeadStatusBadges/`, `LeadNotes/`, `LeadTagsEditor/`, `LeadDangerZone/` — die zijn server-action-gedreven en blijven in Fase 4 nuttig.

**Bouwen:**
- `app/dashboard/(app)/leads/page.tsx` — server component, gebruikt `getLeadsList` query
- `components/dashboard/leads/LeadsPipeline.tsx` — 5-kolom grid met cards per gesprek-fase
- `components/dashboard/leads/LeadCard.tsx` — compact card (naam, postcode, status-pill, last-message-time)
- `components/dashboard/leads/LeadsFilters.tsx` — client component (status, tag, search)
- Pipeline-fasen mappen op `gesprek_fase` DB-enum: `info_verzamelen` → "Info verzamelen", etc.
- Empty-state per kolom

**Deliverable:** `/leads` rendert met pipeline-look, klikbare cards leiden naar lead-detail.

---

## Fase 4 — LeadDetail

**Doel:** `/leads/[lead_id]` split-view met design-look: links tab-content (Info/Offerte/Foto's/Notities/Timeline), rechts live WhatsApp-transcript.

**Sloop:**
- `app/dashboard/(app)/leads/[lead_id]/page.tsx`
- `app/dashboard/(app)/leads/[lead_id]/page.module.css`
- Alle `components/dashboard/leads/LeadDetail*` display-components

**Behoud (refactor inhoud, herstyling):**
- Server actions in `components/dashboard/leads/LeadStatusBadges/`, `LeadNotes/`, `LeadTagsEditor/`, `LeadDangerZone/` — logica werkt, styling vervangen
- `lib/dashboard/lead-queries.ts` `getLeadDetail()` + `aggregateActivityTimeline()`

**Bouwen:**
- `app/dashboard/(app)/leads/[lead_id]/page.tsx` — fetch detail, render split-view
- `components/dashboard/lead-detail/LeadDetailHeader.tsx` — naam, lead_id, status, archive-button
- `components/dashboard/lead-detail/LeadInfoTab.tsx` — adres, m², dienst, prijs-regels (uit bestaande data)
- `components/dashboard/lead-detail/LeadOfferteTab.tsx` — prijs-builder (server action)
- `components/dashboard/lead-detail/LeadFotosTab.tsx` — grid met klant-foto's
- `components/dashboard/lead-detail/LeadNotesTab.tsx` — wrap bestaande Notes-component
- `components/dashboard/lead-detail/WhatsAppPane.tsx` — transcript rechts, scroll, message-styling (ECE5DD bg, in/out bubbles)

**Deliverable:** klikken op een card uit pipeline opent strak detail-scherm.

---

## Fase 5 — Agenda

**Doel:** `/agenda` met week-grid (zoals design) + bestaande route-map als overlay-toggle.

**Sloop:**
- `app/dashboard/(app)/agenda/page.tsx`
- `app/dashboard/(app)/agenda/page.module.css`
- `components/dashboard/agenda/*` (alle 5)

**Bouwen:**
- `app/dashboard/(app)/agenda/page.tsx` — server component, week-of-month routing via `?week=` query
- `components/dashboard/agenda/WeekGrid.tsx` — 7-kolommen × uur-slots (7:00-17:00)
- `components/dashboard/agenda/AgendaAppointment.tsx` — gekleurde block per afspraak
- `components/dashboard/agenda/WeekNav.tsx` — vorige/volgende week + "vandaag" knop
- Behoud: `lib/dashboard/agenda-queries.ts` `getAppointmentsForMonth()`

**Deliverable:** `/agenda` toont strakke week-view; klik op afspraak → lead-detail.

---

## Fase 6 — Instellingen

**Doel:** `/instellingen` strakke read-only weergave van tenant_settings + pricing_rules + service_offerings.

**Sloop:**
- `app/dashboard/(app)/instellingen/page.tsx` (huidige is een platte `<dl>`)

**Bouwen:**
- `app/dashboard/(app)/instellingen/page.tsx` — server component, leest 3 tabellen
- Drie cards: Bedrijfsinfo, Prijzen, Diensten
- Helder "uitgegrijsd / komt binnenkort"-state op edit-knoppen (sub-project B = bot-config-migratie deploy is een voorvereiste)

**Deliverable:** `/instellingen` toont eigen data professioneel; edit komt later (zie `postponed.md` sub-project B).

---

## Fase 7 — Inbox (NIEUW)

**Doel:** `/inbox` Intercom-stijl unified WhatsApp-view. Toont actieve gesprekken met de bot, klik → conversatie-detail.

**Voorwaarde:** schoon-straatje Supabase heeft een `berichten`-tabel (per WhatsApp-bericht een rij). De dashboard-Supabase is hetzelfde project (ntewbcbveqqrojhrkrno), dus dezelfde queries werken.

**Sloop:** niets (nieuwe route).

**Bouwen:**
- `app/dashboard/(app)/inbox/page.tsx` — server-component, 3-kolom layout
- `components/dashboard/inbox/ConversationsList.tsx` — linkerkolom met gesprekken
- `components/dashboard/inbox/MessageThread.tsx` — middenkolom met messages
- `components/dashboard/inbox/LeadContextPane.tsx` — rechterkolom met lead-info
- Nieuwe queries in `lib/dashboard/inbox-queries.ts` — `getActiveConversations()`, `getMessages(leadId)`
- Sidebar: Inbox nav-item toevoegen

**Deliverable:** `/inbox` werkt als unified WhatsApp-view over alle leads.

---

## Fase 8 — Reviews (NIEUW, scoped)

**Doel:** `/reviews` NPS-dashboard. **Beperking:** schoon-straatje heeft (waarschijnlijk) nog geen NPS-tabel. Voor V1 leveren we een mooi gestructureerde page die "Geen review-data nog" toont met uitleg over wat er komt.

**Sloop:** niets (nieuwe route).

**Bouwen:**
- `app/dashboard/(app)/reviews/page.tsx` — placeholder met design-look (NPS-stat-grid, review-cards, send-request-knop)
- Sidebar: Reviews nav-item toevoegen
- DB-werk (klant_feedback tabel-uitbreiding voor NPS-score) gepland voor opvolg-fase

**Deliverable:** `/reviews` rendert met design-styling; data-vulling volgt zodra reviews-schema staat.

---

## Fase 9 — Login + Signup restyle

**Doel:** `/dashboard/login` en `/dashboard/signup` matchen design (split-layout, brand-story rechts, form links).

**Sloop:**
- Huidige `app/dashboard/login/page.tsx` + `page.module.css`
- Huidige `app/dashboard/signup/page.tsx` + `page.module.css`

**Bouwen:**
- Split-layout met `--gradient` op rechter helft (brand-story sectie met taglines)
- Form-styling consistent met `dash-card` + `dash-btn-primary`
- Logo zichtbaar (huidige login mist logo)

**Deliverable:** auth-flow matcht visueel met dashboard-app.

---

## Fase 10 — Cleanup + Polish

**Doel:** loose ends, accessibility, edge-cases.

**Werk:**
- `MobileNav` component voor < 768px (Sidebar verbergt zich nu zonder alternatief)
- Skeleton-loaders op heavy queries (LeadDetail, Overzicht trend)
- Dark-mode toggle in Topbar (toggle `.dark` class op `.shell`)
- Density-toggle in een settings-popup
- 404-pagina binnen de dashboard-shell
- Verwijder oude `dashboard/postponed.md` items die nu gedaan zijn

---

## Buiten scope (postponed)

- **Onboarding wizard** (`/onboarding`) — 7-stap signup-flow. Aparte flow, niet de hoofd-dashboard-look.
- **Mobile/Veldwerk** (iOS-frame preview) — niche demo-view, geen echte feature.
- **Edit-flows** voor instellingen — wacht op bot-config-migratie deploy (sub-project B).
- **Live activity-feed met realtime updates** — Supabase Realtime subscription, opvolg-fase.
- **Owner-acties + funnel-widgets** op Overzicht — extra queries, opvolg-fase.

---

## Volgorde + grove tijdsschatting

| Fase | Inhoud | Sessie-grootte |
|---|---|---|
| 3 | Leads pipeline | groot (~3-4h) |
| 4 | LeadDetail split-view | groot (~3-4h) |
| 5 | Agenda week-grid | medium (~2h) |
| 6 | Instellingen read-only | klein (~1h) |
| 7 | Inbox (nieuw, queries + UI) | groot (~3h) |
| 8 | Reviews (placeholder) | klein (~1h) |
| 9 | Auth restyle | medium (~1.5h) |
| 10 | Cleanup + polish | medium (~2h) |

**Totaal:** ~16-20 uur werk over meerdere sessies. Per fase committen met `feat(dashboard): fase N — <scope>` zodat we ROLLBACK-able blijven.
