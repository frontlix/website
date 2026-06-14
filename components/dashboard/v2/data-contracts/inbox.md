# Data-contract: Inbox (Threads-lijst, Gesprek, Lead-context)

**Auth/tenant:** Tenant scoping via Supabase RLS policies op berichten, leads, fotos tafels op basis van auth.user_id. Realtime-subscription vereist access_token via supabase.realtime.setAuth(token) voor RLS. Owner role bepaald via dashboard_user_profiles.is_owner. Alle queries via getDashboardSupabase() (server) of getDashboardSupabaseBrowser() (client realtime)

**Realtime:** Supabase Realtime op berichten-tabel (INSERT events) via InboxRealtime component (debounce 500ms triggert router.refresh). Polling-fallback alle 8s bij verborgen tabs. LeadDetailRealtime abonneert ook op fotos-tabel en leads-table (UPDATE) met unieke topic per effect-run

## Bestaande bestanden (bron)

- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/inbox/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/inbox-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/ConversationsList.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/LeadContextPane.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/WhatsAppComposer.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/InboxBotToggle.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/InboxMarkRead.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/InboxRealtime.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadDetailRealtime.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/bot-actions/use-bot-action.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/bot-pauzeren/route.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/send-message/route.ts`

## Leest (weergave-data)

- **Threads-lijst met preview, ongelezen count, en basisinfo per gesprek (naam, telefoon, fase, actie-badge)**
  - bron: `lib/dashboard/inbox-queries.ts → getActiveConversations(limit=50)`
  - vorm: ConversationPreview[] met leadId, naam, telefoon, gesprekFase, totaalPrijs, offerteVerstuurd, needsAction (heuristiek: onderhandelen OF (inkomend + offerte_verstuurd)), inboxGelezenOp (timestamp of null), en laatsteBericht (richting, tekst, type, timestamp)
  - vervangt in v2: THREADS array + unreadById logic in v2 inbox page — ThreadList component ontvangt threads, activeId, unreadById record
- **Volledige berichtenreeks voor geselecteerd gesprek (chronologisch ASC)**
  - bron: `lib/dashboard/inbox-queries.ts → getMessagesForLead(leadId)`
  - vorm: Bericht[] met velden: bericht (text/null), richting (inkomend/uitgaand), timestamp (ISO), type (tekst/foto/audio/document), kanaal, foto_url, foto_analyse
  - vervangt in v2: CONVERSATIONS[activeId].messages → ChatMessage[] met from (klant/mij), text, tijd, status?
- **Lead-context (rechterkolom): naam, telefoon, adres, diensten, m2, foto-count, totaalPrijs, offerte_verstuurd_op, gesprek_fase, dashboard_status, botGepauzeerd**
  - bron: `lib/dashboard/inbox-queries.ts → getInboxLeadContext(leadId); combineert leads-tabel + foto-count uit fotos-tabel`
  - vorm: InboxLeadContext (Lead-subset + fotosCount: number, botGepauzeerd: boolean)
  - vervangt in v2: LeadContext v2 component ontvangt leadId, naam, initials, context: {plaats, kanaal, dienst, waarde}. In v2: CONVERSATIONS[activeId].context + Thread.initials

## Muteert (acties/knoppen)

- **Markeert gesprek als gelezen door owner (zet inbox_gelezen_op = now)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-actions.ts → markInboxRead(leadId)`
  - Idempotent (overschrijft timestamp). Triggert router.refresh() in InboxMarkRead component (onzichtbare side-effect). Bijwerkt unread-count in filter-tabs. Wordt automatisch opgeroepen wanneer een gesprek geselecteerd wordt via ?lead=...
- **Surface aan/uit voor een gesprek (toggle bot_gepauzeerd per lead)**  (api-route)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/bot-pauzeren/route.ts (proxy naar bot-api). Body: {paused: boolean}`
  - Roept proxyToBotApi(req, lead_id, 'bot-pauzeren'). Client gebruikt useBotAction hook met /api/dashboard/lead/{leadId}/bot-pauzeren. Bij paused=true: owner mag zelf typen, bot skipped inkomende berichten. InboxBotToggle component toont pill (groen=actief, oranje=gepauzeerd). Bij succes: router.refresh()
- **Verstuur WhatsApp-bericht (handmatig, alleen wanneer bot gepauzeerd)**  (api-route)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/send-message/route.ts (proxy naar bot-api). Body: {bericht: string}`
  - Vereist bot_gepauzeerd=true. Checks Meta 24h-window server-side. WhatsAppComposer: POST naar /api/dashboard/lead/{leadId}/send-message. Bij versturing: zet surfaceOff[leadId] = true (pauzeert bot automatisch), clearDraft, router.refresh(). Error-banner toont window-closed melding als van toepassing.
- **Surface-suggestie gebruiken (zet tekst in input)**  (client-supabase)
  - hergebruik: `v2 pagina local state: onUseSuggestion(text) => setDraft(text) in ChatPane`
  - Pure client-state, geen mutation. Demo-data moment: de suggestie komt uit CONVERSATIONS[activeId].suggestie. Bij echte data: suggestie wordt berekend server-side of via bot-api en opgenomen in InboxConversation type

## Gedeelde helpers (hergebruiken)

- `lib/dashboard/inbox-queries.ts (getActiveConversations, getMessagesForLead, getInboxLeadContext)`
- `lib/dashboard/lead-actions.ts (markInboxRead)`
- `components/dashboard/bot-actions/use-bot-action.ts (useBotAction hook)`
- `lib/dashboard/format.ts (formatEuro, formatRelative, gesprekFaseLabel)`

## Valkuilen

- RLS-filtering: realtime-subscription vereist explicit setAuth() met access_token, anders worden events silently gefilterd door RLS — LeadDetailRealtime implementeert dit al
- Lead-context rechts: foto-count wordt apart gequeried (niet in hoofdlijst), gebruik fotosCount uit getInboxLeadContext
- Ungelezen logica: basis is inboxGelezenOp timestamp-vergelijking met laatsteBericht.timestamp (string lex compare = chrono compare voor ISO). Null inboxGelezenOp = nooit geopend = ungelezen als inkomend
- WhatsApp 24h-window: server checks bij send-message (Meta API constraint). Error-banner toont specifieke melding
- Ongelezen-count sync: na markInboxRead moet router.refresh() triggered worden voor filter-tab counts te bijwerken. InboxRealtime debounce 500ms voorkomt burst-spam
- Conversation-preview: laatsteBericht.type kan 'foto'/'audio'/'document' zijn, preview-tekst moet deze type-labels tonen (📷 Foto etc.)
- needsAction heuristiek: onderhandelen fase (owner-review) OF (inkomend bericht NAdat offerte verstuurd). Niet alleen ongelezen!
- Aktief thread in demo-data THREADS[0] krijgt unread=0 en setGelezen[THREADS[0].id]=true op mount
- Surface-suggestie null als geen klaar: condition suggestie && surfaceAan in ChatPane render
- Bot-pauzeren inversie: button toggle surfaceOff !== true in state, toggle als !botPauzeerd in API

## Koppel-stappenplan (v2)

STAP 1 - Threads-lijst: Roep getActiveConversations(50) op in v2 pagina-server (niet client!) vanuit page.tsx (server-component). Map ConversationPreview.leadId => Thread.id, gesprekFase/dashboard_status => Pill-tone/label via faseLabel() en faseTone(). Bouw unreadById record door gelezen[threadId]?true:false logica, toon badge totaalNieuw als >0. ThreadList component: threads, activeId, unreadById, onSelect callback-handler => setActiveId + setGelezen[id]=true. STAP 2 - Geselecteerd gesprek laden: Bij activeId-wissel, fetch getMessagesForLead(activeId) + getInboxLeadContext(activeId) in effect of server-boundary. Map Bericht.richting === 'inkomend' => from='klant', richting==='uitgaand' => from='mij'. Tijd in Bericht.timestamp moet geformateerd naar HH:MM. Status-veld (Gelezen/Verzonden) uit Bericht-veld (nog vervagen in demo). STAP 3 - ChatPane props: naam, initials, sub (kanaal · dienst · waarde format), messages, suggestie (uit InboxLeadContext of bot-api), surfaceAan (inverse van botGepauzeerd), draft (local state), onSurfaceChange => trigger POST /api/dashboard/lead/{activeId}/bot-pauzeren met {paused: !surfaceAan}, onDraftChange => setDraft, onUseSuggestion(text) => setDraft(text), onSend() => POST /api/dashboard/lead/{activeId}/send-message met {bericht: draft.trim()} => clear draft + refresh. STAP 4 - LeadContext rechts: plaats/kanaal/dienst/waarde uit InboxLeadContext. 'Open in Leads' link naar /dashboard/v2/leads/{leadId}. 'Plan in agenda' naar /dashboard/v2/agenda. STAP 5 - Realtime: Mount InboxRealtime component in root (triggers router.refresh op INSERT berichten). LeadDetailRealtime afzonderlijk per gesprek bij actieve chatpane. STAP 6 - Surface-toggle implementatie: InboxBotToggle hook gebruiken useBotAction('/api/dashboard/lead/{leadId}/bot-pauzeren'). Bij success: botGepauzeerd wordt inverse van body.paused. Status-sync via router.refresh(). STAP 7 - Filtering/Search: matchesFilter() logica (ongelezen = laatsteBericht.richting==='inkomend' AND (inboxGelezenOp===null OR timestamp > inboxGelezenOp); action = gesprekFase==='onderhandelen' || (inkomend NA offerte)). Search over naam/telefoon/laatsteBericht.tekst in client (kan naar server bij >50 conversations).