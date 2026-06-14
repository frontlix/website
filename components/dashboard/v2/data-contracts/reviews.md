# Data-contract: Reviews pagina — NPS-score, review-verdeling per kanaal, wachtende reviews, review beantwoorden

**Auth/tenant:** "\n/lib/dashboard/require-approved-user.ts controleert: user ingelogd + profile.tenant_status === 'approved'\n\nTenant-scoping:\n- getDashboardSupabase() geeft Supabase client met RLS-cookies\n- Queries op leads/reviews erven RLS-beleid (auth.uid() match)\n- tenant_settings.bedrijfsnaam haalt bedrijfsnaam op voor deze tenant (via RLS scope)\n\nMemo voor toekomstige reviews-tabel:\n- Voeg RLS-policy toe: SELECT/UPDATE/DELETE waar lead.tenant_id = current_tenant_id\n- Zorg dat review antwoorden per-tenant voorkomen (geen cross-tenant data-lekkage)\n"

**Realtime:** geen

## Bestaande bestanden (bron)

- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/reviews/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/ReviewCard.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/PendingReviewRow.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/ReviewsFilterTabs.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/NPSDistributionBar.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/reviews/MobileReviews.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/reviews/reviews-mock.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/reviews/reviews-data.ts`

## Leest (weergave-data)

- **NPS-score + gemiddelde score**
  - bron: `demo-data (geen tabel), berekend per page-load`
  - vorm: reviews[] gefilterd op nps-type (promoter/passive/detractor), totaal count, avg score, NPS formule: ((promoters-detractors)/total)*100
- **Review-verdeling per sterklasse (5★, 4★, 3★, 2★, 1★)**
  - bron: `REVIEW_STATS in /components/dashboard/v2/reviews/reviews-data.ts of berekend uit reviews[]`
  - vorm: [sterNummer, aantal][] hoog→laag, verdelingMax (grootste klasse voor schaal)
- **Gemiddelde score per bron/kanaal (Google, Klusvergelijk, Werkspot)**
  - bron: `BRON_SCORES in /components/dashboard/v2/reviews/reviews-data.ts`
  - vorm: {bron: string, score: string (NL-notatie komma), aantal: number}[]
- **Wachtende reviews (nog niet beantwoord)**
  - bron: `REVIEWS_WACHTEND in /components/dashboard/v2/reviews/reviews-data.ts of pending[] in v1 page.tsx`
  - vorm: {naam, initials, score, bron, tijd, tekst, concept (voorgevuld antwoord)}[] (v2) of {id, leadId, naam, plaats, klusDatum, daysSince, sent}[] (v1)
- **Beantwoorde reviews**
  - bron: `REVIEWS_RECENT in /components/dashboard/v2/reviews/reviews-data.ts`
  - vorm: {naam, initials, score, bron, tijd, tekst, beantwoord: true}[]
- **Bedrijfsnaam voor context**
  - bron: `tenant_settings.bedrijfsnaam via requireApprovedUser() + getDashboardSupabase().from('tenant_settings').select('bedrijfsnaam')`
  - vorm: bedrijfsnaam: string | null (fallback naar profile.bedrijfsnaam of 'je bedrijf')
- **Response rate + totaal reviews dit jaar**
  - bron: `hardcoded demo (68%, reviews.length+42) — geen DB-bron`
  - vorm: number (percentage) en number (totaal) via KPI-kaarten

## Muteert (acties/knoppen)

- **Beantwoord een wachtende review**  (client-supabase)
  - hergebruik: `Toekomstig: server-action of API-route (nog niet geïmplementeerd). V2 gebruikt momenteel lokale state (setBeantwoord); ReplyComposer modal opent, tekst voorgevuld (concept van Surface), gebruiker edit+verstuur → markeert review als beantwoord in session-state`
  - In v2 volstaat client-side state via useState + setBeantwoord. Toekomstig: moet naar reviews-tabel of lead.pending_eigenaar_review bijgewerkt, revalidate via 'Antwoord versturen'-knop in ReplyComposer
- **Stuur review-verzoek (Vraag review / Opnieuw vragen)**  (server-action)
  - hergebruik: `Toekomstig: /app/api/dashboard/lead/[lead_id]/send-review-request/route.ts (patroon naar send-message/route.ts). Momenteel: knop disabled in v1`
  - Vereist: WhatsApp-integratie + review_request_verzonden_op in leads-tabel
- **Filtert reviews (alle → pending → detractor)**  (client-supabase)
  - hergebruik: `/components/dashboard/reviews/ReviewsFilterTabs.tsx (v1) of useState(filter) in /components/dashboard/v2/reviews/page.tsx (v2)`
  - V1: search-param gebaseerd (?filter=pending), v2: client-state gebaseerd, geen server-roundtrip
- **Filter tonen op onbeantwoorde reviews**  (client-supabase)
  - hergebruik: `/components/dashboard/v2/reviews/ReviewList.tsx, filter state in pagina, gebaseerd op beantwoord-vlag`
  - V2-speficiek: button 'Onbeantwoord (N)' waar N = wachtendCount

## Gedeelde helpers (hergebruiken)

- `Geen bestaande lib/dashboard/*-helpers voor reviews. De pagina berekent zelf: NPS = ((promoters-detractors)/total)*100, gemiddelde = sum(scores)/total. Verdeling handen geteld in demo-data. Toekomstig: Reviews-queries helper (lib/dashboard/reviews-queries.ts) moet: (1) Tabel 'reviews' of 'lead_reviews' queeren (bron/score/tekst/pending/beantwoord), (2) Aggregatie per bron + NPS-verdeling, (3) Filter op wachtend/beantwoord-status, (4) Per-lead pending_eigenaar_review bijhouden`

## Valkuilen

- GEEN REVIEWS-TABEL OP DATABASE: De pagina's (v1 en v2) gebruiken momenteel 100% demo-data (hardcoded arrays). Er bestaat gén 'reviews'-tabel in Supabase; Surface stuurt nog geen review-vragen na klussen. Comments in beide page.tsx zeggen expliciet: 'Er is nog geen NPS-tabel; zodra de bot review-vragen stuurt, vervangen we deze static data.' → Dit moet eerst gebouwd voordat v2 echt werkt.
- REVIEW-ANTWOORD STATE: V2 page.tsx gebruikt client-side useState(beantwoord, setBeantwoord) om review-antwoorden lokaal te onthouden. Moet naar server-side worden verplaatst (DB-update + revalidate).
- NPS-BEREKENING: Hard-coded hoe NPS-categorieën werken (promoter/passive/detractor mapping per score). Score ≥ 4.5 = promoter, 3–<4.5 = passive, <3 = detractor. Zorg dat toekomstige DB-schema dit ook gebruikt.
- TENANT_SETTINGS BEDRIJFSNAAM QUERY: Page roept fallback-logica aan (tenant_settings → profile → hardcoded fallback 'je bedrijf'). Zorg dat RLS-policy op tenant_settings bestaat zodat elke tenant alleen z'n eigen bedrijfsnaam ziet.
- LEAD-LINKING: ReviewCard en PendingReviewRow linken naar /leads/{leadId}. Zorg dat review record een lead_id foreign-key heeft die geldig is.
- BRON/KANAAL-MAPPING: V2 demo-data hard-coded kanalen: Google, Klusvergelijk, Werkspot. Reviews moeten een 'bron' veld hebben dat deze enum-waarden respects (of extensible blijft).
- WACHTTIJD BEREKENING: PendingReviewRow toont 'daysSince' — berekend uit (NOW() - review_request_verzonden_op). Zorg dat review_request_verzonden_op in leads of reviews-tabel populated is.
- CONCEPT-ANTWOORD: WaitingReview.concept moet voorgevuld zijn door Surface (bot-gegenereerd). Zorg dat dit in reviews-tabel land als 'concept_antwoord' of 'draft_reply' veld.

## Koppel-stappenplan (v2)

"\n### Stap 1: Demo-data vervangen door echte queries\n\n1. Wachtende & beantwoorde reviews:\n   - Query: await supabase.from('reviews')\n     .select('id, lead_id, naam, score, bron, tekst, beantwoord, concept_antwoord, tijd')\n     .eq('beantwoord', false) // Wachtende\n   - Map naar WaitingReview[] type (/components/dashboard/v2/reviews/reviews-data.ts)\n   - Beantwoorde: .eq('beantwoord', true).limit(6)\n\n2. Review-verdeling & kanaalscores:\n   - aggregate(): COUNT(*) grouped by score → verdeling array\n   - aggregate(): AVG(score) grouped by bron → BRON_SCORES[]\n   - Pass naar <ScoreColumn stats={} bronScores={} />\n\n3. NPS-berekening:\n   - Cluster scores naar NPS: score >= 4.5 = promoter, 3-3.9 = passive, <3 = detractor\n   - Formule: NPS = ((promoters - detractors) / total) * 100\n   - Toon in KPI-cards + NPSDistributionBar (v1) of ScoreColumn (v2)\n\n### Stap 2: Review-antwoord-actie koppelen\n\n1. Knop in ReviewRow/.tsx \"Beantwoord\" → opens ReplyComposer modal\n2. Modal laadt WaitingReview + concept (voorgevuld)\n3. Verstuur-knop → Server Action roept:\n   - /lib/dashboard/reviews-actions.ts:sendReviewReply(reviewId, tekst)\n   - Updates: reviews.beantwoord = true, reviews.antwoord_tekst = tekst, reviews.antwoord_op = NOW()\n   - Revalidate: revalidatePath('/dashboard/v2/reviews')\n4. Sessie-state (setBeantwoord) vervangen door echte DB-state via refetch/revalidate\n\n### Stap 3: Filter-tabs wiring\n\n1. V2 ReviewList pill-buttons:\n   - \"Alle\" → toon REVIEWS_WACHTEND + REVIEWS_RECENT (max 6)\n   - \"Onbeantwoord (N)\" → toon alleen REVIEWS_WACHTEND, badge N = wachtend.length\n2. Beide state-driven (geen search-params)\n\n### Stap 4: Tenant-scoping verifiëren\n\n1. Page.tsx roept requireApprovedUser() → user+profile ingeladen\n2. getDashboardSupabase() houdt RLS-cookies intact\n3. Alle reviews-queries erven RLS-scope (lead.tenant_id match)\n4. Geen extra auth-check nodig in reviews-actie-helpers\n\n### Toekomstige API-routes (nog niet nodig voor v2-mapping):\n\n- POST /api/dashboard/reviews/send-request → WhatsApp-integratie\n- POST /api/dashboard/reviews/[id]/reply → Alternative voor Server Action\n- GET /api/dashboard/reviews/stats → Batch-aggregate (v2 ScoreColumn)\n"