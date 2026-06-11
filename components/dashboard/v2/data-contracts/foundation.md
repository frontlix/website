# Data-contract: Fundament-laag: auth, tenant, supabase, shell, offerte-verzend-infra

**Auth/tenant:** **Middleware (middleware.ts)**: Host-routing (app.frontlix.com = dashboard, frontlix.com = marketing). Session-check via Supabase auth.getUser(). V2-preview (/v2) in dev = public (no auth) via NODE_ENV check; prod = auth-gated. Rewrite /dashboard-paths naar intern /dashboard/v2. **Layout-level (app/dashboard/(app)/layout.tsx)**: requireApprovedUser() at top → redirects non-approved to /wachtkamer. Fetches getDashboardSupabase() (cached per request). Queries tenant_settings.bedrijfsnaam, leads (open count), afspraken (upcoming), notifications. **V2-layout (app/dashboard/v2/layout.tsx)**: Currently bypass-mode in dev (no auth, demo-data). Must add requireApprovedUser() + getDashboardSupabase() to move to production. Tenant-info + nav-badges live-fetched.

**Realtime:** geen

## Bestaande bestanden (bron)

- `/Users/christiaantromp/Desktop/Frontlix website/middleware.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/layout.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/v2/layout.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/require-approved-user.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/supabase-server.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/supabase-admin.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/auth.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/notification-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/calendar.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/manual-offerte-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte-form-mapping.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/manual-offerte-types.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte/mail-sender.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte/pdf-renderer.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte/pdf-template.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/offerte/ManualOfferteController.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/offerte/StepVersturen.tsx`

## Leest (weergave-data)

- **Gebruiker-identiteit (sessie-check, approval-status, bedrijfsnaam)**
  - bron: `Supabase Auth (middleware + lib/dashboard/auth.ts)`
  - vorm: User (id, email), DashboardUserProfile (user_id, tenant_status='pending'|'approved'|'rejected', bedrijfsnaam, is_owner, onboarding_voltooid_op)
  - vervangt in v2: Shell-header: TENANT.user, TENANT.userFull, TENANT.initials (hardcoded in demo-data, moet van auth.getCurrentUser() + auth.getCurrentUserProfile() komen)
- **Tenant-settings (bedrijfsnaam, adres, postcode, plaats, eigenaar_email, offerte_geldigheid_dagen)**
  - bron: `Supabase 'tenant_settings' tabel (RLS, user-approved scope)`
  - vorm: { bedrijfsnaam: string | null, adres: string | null, postcode: string | null, plaats: string | null, eigenaar_email: string | null, offerte_geldigheid_dagen: number }
  - vervangt in v2: Shell-header: TENANT.tenant (bedrijfsnaam), StepVersturen mail-builder (reply-to email), OfferteWizard PDF-header (bedrijf-info)
- **Open leads-badge (aantal actieve, niet-afgehandelde leads)**
  - bron: `lib/dashboard/lead-queries.ts via Supabase 'leads' tabel, conde: eq('dashboard_archived', false).or('dashboard_status.is.null,dashboard_status.neq.afgehandeld')`
  - vorm: count: number (exact)
  - vervangt in v2: Shell nav-pill badge: NAV[2].badge = openLeadsCount
- **Komende afspraken-badge (aantal afspraken >= vandaag op afspraak_datum)**
  - bron: `lib/dashboard/calendar.ts helper toAmsterdamDayKey() + Supabase 'leads' tabel query (gte('afspraak_datum', today))`
  - vorm: count: number (exact)
  - vervangt in v2: Shell nav-pill badge: NAV[3].badge = upcomingAppointmentsCount
- **Ongelezen notificaties + recent notifications feed**
  - bron: `lib/dashboard/notification-queries.ts: getRecentNotifications(limit), getUnreadNotificationCount()`
  - vorm: NotifItem[] = { id, kind, title, sub, href, ts, unread }, count: number
  - vervangt in v2: Desktop: TopbarServer bell-button badge + NotificationPanel. Mobile: DashboardChrome header notifications. V2: geen UI-plek in preview; later toevoegen
- **Mobiele user-display (naam, initials van email-prefix)**
  - bron: `lib/dashboard/auth.ts getCurrentUser() email-prefix parsing`
  - vorm: emailPrefix (split @), userName (capitalize), userInitials (uppercase first 2)
  - vervangt in v2: DashboardChrome.userName, DashboardChrome.userInitials (hardcoded CT in demo)

## Muteert (acties/knoppen)

- **Handmatige offerte aanmaken (klant + offerte + prijsregels in één stap)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/manual-offerte-actions.ts: createManualLeadEnOfferte()`
  - requireApprovedUser() auth-gate. INSERT lead (via getDashboardAdmin, bypasses RLS). Validatie van naam/telefoon/postcode/m2/sub-diensten. Bereken rules via computeRules() + computeTotals(). INSERT offerte (versie=max+1). INSERT prijsregels + lead_notes. Geocoding fire-and-forget. Mail-verzending via sendOfferteMail() als kanaal='mail'. revalidatePath('/leads', '/'). Result: { ok, leadId, offerteId, total, mailError? }
- **Mail-verzending van offerte (PDF-bijlage, HTML-body, nodemailer)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte/mail-sender.ts: sendOfferteMail()`
  - Bouwt HTML via buildMailHtml(). Rendert PDF via renderOffertePDFBuffer() (puppeteer). Nodemailer via MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASS env-vars. From: bedrijfsnaam <MAIL_USER>, ReplyTo: eigenaar_email (uit tenant_settings). Attachment: offerte-{nummer}.pdf. Geen hard-fail: mailError teruggeven, offerte_verstuurd=false zodat user via dashboard kan herprobeert.
- **PDF-rendering en laadbestand (logo, badge, template-data)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte/pdf-renderer.ts: renderOffertePDFBuffer(), loadLogoBase64(), loadBadgeBase64()`
  - Puppeteer-gebaseerde HTML to PDF. Laadt logo/badge van filesystem (async, base64). Callersites: createManualLeadEnOfferte() en het nieuwe offerte-formulier. Cache-friendly (singletons)
- **Offerte-wizardmodaal openen/sluiten (client-side state via custom-event)**  (client-supabase)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/offerte/NewOfferteMount.tsx, /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/offerte/ManualOfferteController.tsx`
  - V2: custom-event rb:new-offerte, NewOfferteMount luistert, controleert OfferteWizard-modal. (app): URL-based ?nieuwe-offerte=1 in ManualOfferteModal. Centraal gemount in layout, knoppen dispatchen event i.p.v. state-lifting.

## Gedeelde helpers (hergebruiken)

- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/require-approved-user.ts (cache-wrapped): checks session + profile.tenant_status='approved', redirects otherwise`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/supabase-server.ts (cache-wrapped): server-side Supabase client met session-cookies, respects RLS`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/supabase-admin.ts: service-role Supabase client, bypasses RLS (ONLY server-side)`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/auth.ts: getCurrentUser() (null-safe), getCurrentUserProfile() (null-safe, returns DashboardUserProfile)`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/manual-offerte-types.ts: ManualOfferteData shape, RegelComputed, TotalsComputed, DEFAULTS, KANAAL_OPTIES, DIENST_LABELS`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte-form-mapping.ts: mapLeadToFormData(), buildLeadFieldsFromForm() (shared client+server mapping)`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/calendar.ts: toAmsterdamDayKey() (ISO-date formatter voor Supabase date-queries)`

## Koppel-stappenplan (v2)

**1. Auth + Tenant-setup (v2-layout → production):**
- Current v2/layout.tsx exports no auth. Must wrap in requireApprovedUser() + getDashboardSupabase().
- Extract bedrijfsnaam, adres, eigenaar_email from tenant_settings.select('bedrijfsnaam, adres, postcode, plaats, eigenaar_email, offerte_geldigheid_dagen').limit(1).
- Pass { bedrijfsnaam, user, profile } to Shell as props (instead of hardcoded TENANT demo-data).
- Shell reads NAV items + tenant info, passes to NewOfferteMount.

**2. Nav-badge data-flow (Overzicht → Leads, Agenda badges):**
- In v2-layout: parallel-fetch openLeadsCount via leads.select(count='exact', head=true).eq('dashboard_archived', false).or('dashboard_status.is.null,dashboard_status.neq.afgehandeld').
- Fetch upcomingApptsCount via leads.select(count='exact', head=true).not('afspraak_datum', 'is', null).gte('afspraak_datum', toAmsterdamDayKey(new Date())).
- Map to NAV array: find('Leads').badge = count, find('Agenda').badge = count.
- Pass PRIMARY_NAV to Shell.

**3. Offerte-wizard + createManualLeadEnOfferte() integration:**
- NewOfferteMount: listens to rb:new-offerte custom-event (already wired).
- OfferteWizard: reuse StepStart, StepKlant, StepWerk, StepOfferte, StepVersturen from (app)-components.
- StepVersturen: onChange handlers set ManualOfferteData state. Submit-button calls createManualLeadEnOfferte(data) via client-action wrapper (startTransition).
- Result: { ok, leadId, offerteId, mailError? }. On success, naarLeads() → router.push(/v2/leads/{leadId}). On error, show error-toast.

**4. PDF + Mail-render pipeline:**
- createManualLeadEnOfferte() calls buildOffertePDFData(data, rules, totals, ..., bedrijf) → renderOffertePDFBuffer() → sendOfferteMail().
- Bedrijf-data (logo-path, badge-path, bedrijfsnaam, adres, offerte_geldigheid_dagen) sourced from tenant_settings (already fetched in action).
- Mail-env-vars (MAIL_HOST, MAIL_USER, MAIL_PASS, MAIL_PORT) server-only, no browser leak.

**5. Onboarding-state check:**
- profile.onboarding_voltooid_op: if null, show OnboardingWizard modal (same pattern as (app) layout).
- V2-layout: add {!profile.onboarding_voltooid_op && <OnboardingWizard />}.

**6. Demo-bypass in dev:**
- middleware: if process.env.NODE_ENV === 'development' && pathname.startsWith('/v2'), skip auth-gate.
- V2-layout: wrap Supabase-fetches in NODE_ENV check: if prod, require auth + fetch real data; if dev, fallback to demo-data.
- Components (Shell, OfferteWizard, dossier-view) remain data-agnostic; accept props.

**7. Button wiring for offerte-flow:**
- Shell "+ Nieuwe offerte": onClick → dispatchEvent("rb:new-offerte").
- NewOfferteMount: listens → setOpen(true), renders OfferteWizard.
- OfferteWizard final step "Versturen": onClick → startTransition(() => createManualLeadEnOfferte(data)).
- On success: naarLeads() → router.push(/v2/leads/{leadId}).
- On error: show error-toast via client-state.

**8. Existing-client lookup (StepKlant "Zoek bestaande klant"):**
- Needs search-API or direct Supabase query (TBD: add /app/api/dashboard/leads/search route).
- Query leads.select('lead_id, naam, email, telefoon').filter(naam.ilike('%{query}%')).limit(10).
- User picks one → set(existing_lead_id, lead.lead_id).
- At submit: isReuse-flag checks existing_lead_id → UPDATE vs INSERT.

**9. Error-handling + UX:**
- Server-actions return { ok, error? } or { ok, ...data, mailError? }.
- Client: catch exceptions + action-result → show toast (integrate with existing toast-library).
- Mail-errors non-blocking: offerte created, mailError shown as warning, user can retry-send via dashboard later.