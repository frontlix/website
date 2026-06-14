# Data-contract: Agenda (Week/Maand/Route, Afsprak afronden, Afspraak verzetten)

**Auth/tenant:** Server-side RLS via getDashboardSupabase() (cookies-based session). getCurrentUser() haalt Supabase Auth user op; leads-tabel heeft RLS-policies zodat users alleen hun eigen tenant-leads zien. getTenantBase() leest tenant_settings (single-tenant, geen tenant_id filtering nodig). Google-Agenda koppeling via calendar_connections tabel (enige rij per tenant)."

**Realtime:** geen

## Bestaande bestanden (bron)

- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/agenda/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/agenda/AgendaWeekGrid.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/agenda/AgendaUpcomingList.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/agenda/AgendaCalendar.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/agenda/AgendaRouteMap.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/agenda-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/agenda-week.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/agenda-route.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/agenda-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/agenda-event.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/calendar.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tenant-base.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/book-appointment/route.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/calendar-connection-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/auth.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/supabase-server.ts`

## Leest (weergave-data)

- **Afspraken voor de week (7 dagen)**
  - bron: `Supabase leads-tabel, lib/dashboard/agenda-queries.ts → getAppointmentsForRange()`
  - vorm: Appointment[] met lead_id, naam, afspraak_geboekt_op (ISO), afspraak_datum (YYYY-MM-DD), afspraak_starttijd (HH:MM), status, dashboard_status, plaats, postcode, m2, afstand_km, lat, lng, telefoon, straat, huisnummer, hoofdcategorie
- **Afspraken voor maand-overzicht**
  - bron: `Supabase leads-tabel, lib/dashboard/agenda-queries.ts → getAppointmentsForMonth()`
  - vorm: Appointment[] gegroepeerd per dag (Map<dayKey, Appointment[]>) via calendar.ts → buildAppointmentsByDay()
- **Week-parameters (Monday key, week number, range labels)**
  - bron: `lib/dashboard/agenda-week.ts → parseWeekParam(searchParams)`
  - vorm: WeekRef { mondayKey: string (YYYY-MM-DD), weekNumber: number, rangeLabel: string, queryStart: ISO-UTC, queryEnd: ISO-UTC }
- **Maand-parameters (grid, month label, prev/next)**
  - bron: `lib/dashboard/calendar.ts → parseMonthParam(searchParams)`
  - vorm: MonthGrid { cells: GridCell[], monthLabel: string, prevMonth, nextMonth, monthStart, monthEnd }
- **Routekaart-dagen en stops (GPS-pinnen, km-schatting)**
  - bron: `lib/dashboard/agenda-route.ts → buildRouteDays(appointments)`
  - vorm: RouteDay[] { dayKey, label, shortLabel, color, totalKm, stops: RouteStop[] }
- **Thuisbasis voor routekaart**
  - bron: `lib/dashboard/tenant-base.ts → getTenantBase() (leest tenant_settings tabel)`
  - vorm: TenantBase { lat, lng, label } of null (fallback DEFAULT_TENANT_BASE)
- **Google-Agenda-connectie-status**
  - bron: `lib/dashboard/calendar-connection-queries.ts → getConnectionStatus()`
  - vorm: ConnectionStatus { connected: boolean, googleEmail: string|null, calendarId: string|null, connectedAt: string|null }
- **Huidige ingelogde user**
  - bron: `lib/dashboard/auth.ts → getCurrentUser()`
  - vorm: Supabase Auth User object of null
- **Follow-up leads (wachten op eigenaar-review, stale offertes)**
  - bron: `lib/dashboard/agenda-followups.ts → getOwnerFollowups() + getStaleOfferteFollowups()`
  - vorm: FollowupLead[] { lead_id, naam, reden }

## Muteert (acties/knoppen)

- **Afspraak afronden (klus voltooid)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/agenda-actions.ts → completeAppointment(leadId)`
  - Zet dashboard_status='afgehandeld' in leads-tabel, revalidateert /agenda
- **Afspraak verzetten naar ander moment**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/agenda-actions.ts → rescheduleAppointment(leadId, newIso)`
  - Via bot-API (callBotLeadApi): verwijdert oud Google-event, maakt nieuw event, stuurt klant-bevestiging (WhatsApp/mail), update leads.afspraak_datum + afspraak_starttijd
- **Boek afspraak (Google Agenda koppeling)**  (api-route)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/book-appointment/route.ts`
  - Proxy naar bot-API voor automatische Google-Agenda sync (surface plant afspraken in via WhatsApp/web, dit sync terug naar dashboard)

## Gedeelde helpers (hergebruiken)

- `lib/dashboard/agenda-queries.ts (getAppointmentsForRange, getAppointmentsForMonth)`
- `lib/dashboard/agenda-week.ts (parseWeekParam, shiftWeekKey, currentMondayKey, buildWeekDays)`
- `lib/dashboard/calendar.ts (parseMonthParam, getMonthGrid, toAmsterdamDayKey, buildAppointmentsByDay)`
- `lib/dashboard/agenda-route.ts (buildRouteDays)`
- `lib/dashboard/agenda-event.ts (formatHHmm, amsterdamHourMinutes, estimateDurationMinutes, appointmentTone, formatM2)`
- `lib/dashboard/agenda-actions.ts (completeAppointment, rescheduleAppointment)`
- `lib/dashboard/tenant-base.ts (getTenantBase, DEFAULT_TENANT_BASE)`
- `lib/dashboard/calendar-connection-queries.ts (getConnectionStatus)`
- `lib/dashboard/auth.ts (getCurrentUser, getCurrentUserProfile)`

## Valkuilen

- TIMEZONE: alle queries werken op lokale YYYY-MM-DD dag-keys (Amsterdam), conversie ISO ↔ daykey via toAmsterdamDayKey() + parseKey() (niet Date.getDate())
- DURATION: geen aparte eindtijd, minuten tot 17:00 (WORKDAY_END_HOUR), fallback 60 min als geen starttijd
- DASHBOARD_STATUS enum: 'afgehandeld' (groen), 'no_show' (rood), null/anders (blauw)
- NULL HANDLING: afspraak_geboekt_op kan null zijn (draft-lead zonder geboekte afspraak), deze worden gefilterd door agenda-queries (not null check)
- GOOGLE-EVENT: read-only op dashboard, sync via bot-API alleen (geen direct writes naar Google Calendar)
- TENANT: single-tenant model, geen tenant_id filtering nodig (RLS handles it), tenant_settings + calendar_connections zijn 1:1 per tenant

## Koppel-stappenplan (v2)

1. FETCH LAYER (page.tsx → Server Components):
   - parseWeekParam(searchParams) → WeekRef
   - getAppointmentsForRange(queryStart, queryEnd) → Appointment[]
   - Parallel: getTenantBase(), getOwnerFollowups(), getStaleOfferteFollowups()
   - Pass appointments + weekRef naar AgendaWeekGrid + AgendaUpcomingList components

2. COMPONENT LAYER (WeekView, MonthView, RouteView):
   - AgendaWeekGrid: maps appointments → grid-layout (halfuur-rijen), click → /leads/[id] Link
   - AgendaUpcomingList: lists appointments (7 days), shows duration + plaats/m2
   - AgendaCalendar: monthgrid + appointment-count per dag, click → dag-detail
   - AgendaRouteMap: buildRouteDays() → SVG-map of Google Maps, shows pins + km per dag
   - AgendaFollowupList: shows pending owner-reviews + stale offertes

3. V2 WIRING PLAN:
   - Page: app/dashboard/v2/agenda/page.tsx moet SERVER-COMPONENT worden (huidige v2 is 'use client')
   - Fetch: importeer agenda-queries, agenda-week, tenant-base, auth helpers
   - Data-mapper: converteer Appointment[] → AgendaDag[] (zie agenda-data.ts structuur)
     * Per dag: filter appointments op toAmsterdamDayKey()
     * Map Appointment → AgendaItem: titel=naam, sub=plaats/hoofdcategorie, type=toon-kleur (bezoek/klus/deadline), plaats=places, klaar=(dashboard_status='afgehandeld')
   - State: (client-side nur voor modals) selectie + route + nieuw-afspraak
   - Buttons/Actions:
     * "Afronden" → action completeAppointment(selectie.item.lead_id)
     * "Verzetten" → toon time-picker, call rescheduleAppointment(lead_id, newISO)
     * "Route & Contact" → RouteContactModal (betrekt plaats, telefoon, adres uit Appointment-velden)
     * "Nieuwe afspraak" → NewAppointmentModal, POST /api/dashboard/lead/.../book-appointment

4. ATTENTION POINTS:
   - Amsterdam timezone: alle day-keys via toAmsterdamDayKey(iso), alle times via amsterdamHourMinutes()
   - Appointment-duration wordt INFERRED van starttijd → WORKDAY_END_HOUR (17:00), geen aparte duration-field
   - Google-event-sync: voorbehouden aan bot-API, dashboard werkt read-only op afspraak_geboekt_op (bevat bot-gemaakte ISO-timestamp)
   - RLS: getDashboardSupabase() enforces tenant-isolation via session user
