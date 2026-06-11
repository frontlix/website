# Gap-brief: Inbox (naar pariteit)

Sluit deze gaten in v2 t.o.v. het bestaande dashboard. Hergebruik de bestaande componenten + server-actions (verzin niets nieuws). v2-look (var(--rb-*), v2 ui-primitives, lucide, huisstijl). Behoud demo-fallback. Focus eerst op HOOG, dan MIDDEL.

## [hoog] MIST: Filter-tabs (Alles / Ongelezen / Actie)

De bestaande inbox heeft InboxFilterTabs met 3 filter-opties (all/unread/action) en dynamische counts. V2 accepteert geen ?filter=... parameter en rendert geen filter-UI. Hergebruiken: InboxFilterTabs component uit /components/dashboard/inbox/InboxFilterTabs.tsx en matchesFilter() logica uit page.tsx. De v2 page.tsx moet searchParams ook accepteren en filteren vóór UI-render.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/InboxFilterTabs.tsx`

## [hoog] MIST: Zoekfunctionaliteit (?q=...)

De bestaande inbox heeft InboxSearch met live-debounce en URL-sync via ?q=. V2 geeft geen zoekbar en filters geen conversations op naam/telefoon/bericht-preview. Hergebruiken: InboxSearch component en de server-side filter-logica uit page.tsx (lines 75-81). Toevoegen aan v2 ThreadList-header.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/InboxSearch.tsx`

## [hoog] MIST: Bot-status strip (Surface: 'wat doet ie nu')

De bestaande inbox toont een groene strip 'Surface: [status]' onder de thread-header (botStatusForFase()). V2 ChatPane toont niets van de bot-status of fase-gebaseerde suggestiontekst. Hergebruiken: botStatusForFase() helper en add een strip in ChatPane.tsx onder de head. Het suggestiontekst is al via suggestieVoorContext() in inbox-mappers.ts.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/fase-labels.ts (botStatusForFase)`

## [hoog] DEELS: Lead-context paneel (rechtse kolom): volledige velden

V2 LeadContext toont alleen: Dienst + Waarde. Bestaande LeadContextPane toont veel meer: Avatar + naam + lead_id, Status-pills (status + fase), Werk-sectie (adres, oppervlakte, diensten, fotocounts), Offerte-box (bedrag + verstuurd-datum), Snelle acties (4 buttons: notitie/edit/offerte/archiveren), Tags-sectie. Hergebruiken: LeadContextPane component uit /components/dashboard/inbox/LeadContextPane.tsx, aanpassen voor v2 InboxConversation['context'] prop-shape.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/LeadContextPane.tsx`

## [hoog] MIST: Lead-context: Status-pills (status + fase)

V2 toont geen status. LeadContextPane heeft hele Section voor Status met twee pills: status-label (Afgerond/Afgewezen/etc.) en fase-label (Fase: [fase]). Toevoegen: statusTone() + statusLabel() + faseLabel() helpers en twee Pill-rijen in LeadContext-rechter kolom.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/LeadContextPane.tsx lines 63-73`

## [hoog] MIST: ConversationsList: Status-pills + Actie-badge + prijs-pill

V2 ThreadList toont alleen naam + preview + unread-badge. Bestaande ConversationsList toont per rij: Avatar, naam, preview, EN drie pills (fase-status, optionele Actie-badge bij needsAction, optionele prijs-pill). ThreadList moet deze velden van toThreads() krijgen; inbox-mappers moet gesprekFase + needsAction + totaalPrijs mappen naar ThreadList.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/ConversationsList.tsx lines 69-82`

## [hoog] MIST: Page layout: Breakpoint-responsive grid

Bestaande inbox.page.tsx heeft complexe responsive grid (3 kolommen > 1200px, 2 kolommen > 800px, mobile tree ≤ 640px). V2 page.module.css heeft alleen 330px 1fr 330px grid zonder media queries. Toevoegen: @media rules voor <1200px (verberg context) en <800px (toggle list/detail).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/inbox/page.module.css lines 34-74`

## [hoog] MIST: Page layout: Mobile-tree (MobileChatDetail + MobileInboxList)

Bestaande pagina heeft twee render-trees: desktopTree (grid) + mobileTree (MobileChatDetail / MobileInboxList switcher). V2 heeft alleen InboxClient met 3 kaarten. Toevoegen: mobileTree en de mobile-componenten voor ≤ 640px.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/inbox/page.tsx lines 210-227`

## [hoog] MIST: URL-preservation: ?lead=... + filter + search in nav

InboxClient selectThread() doet router.push() zonder filter/search params. Bestaande preservedQuery handhaaft ?filter= en ?q= tussen page-renders. Toevoegen: router.push() moet de huidige URL-params lezen en meenemen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/inbox/page.tsx lines 87-90`

## [middel] MIST: Search-parameter persistentie in thread-selectie

De bestaande inbox handhaaft ?filter=... en ?q=... wanneer je een gesprek aanklikt (preservedQuery). V2 vervangt de URL gewoon met ?lead=... en verliest context. Opvangen: in InboxClient selectThread(), de huidige URL-params lezen en meenemen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/inbox/page.tsx lines 87-90`

## [middel] MIST: Lead-context: Adres + plaats-combinatie

V2 toont alleen plaats. LeadContextPane toont ook volledige adres (straat + huisnummer + postcode + plaats) in een compacte Werk-sectie. Toevoegen aan inbox-mappers.ts: adres-formatie van InboxLeadContext-velden.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/LeadContextPane.tsx lines 33-38`

## [middel] MIST: Lead-context: Werk-sectie (m2, foto-count, diensten)

V2 toont geen foto's of oppervlakte. LeadContextPane.tsx runt CompactRow() voor adres, m2, diensten, fotocounts. Toevoegen: deze velden aan inbox-mappers context-prop en de CompactRow UI aan LeadContext.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/LeadContextPane.tsx lines 76-82`

## [middel] MIST: Lead-context: Offerte-box (bedrag + verstuurd-datum)

V2 LeadContext toont 'Waarde' als 2x2-grid-tile. Bestaande LeadContextPane heeft aparte Section 'Offerte' met grote gradient bedrag-display en verstuurd-datum. Hergebruiken: offerteBox styling en logica (alleen tonen als prijs > 0).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/LeadContextPane.tsx lines 85-97`

## [middel] MIST: Lead-context: Snelle acties (4 buttons)

V2 LeadContext is puur read-only. LeadContextPane heeft 4 quick-action links: notitie toevoegen, lead-gegevens aanpassen, offerte opnieuw versturen, archiveren. Hergebruiken: actionsList + actionRow styling en links uit LeadContextPane.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/LeadContextPane.tsx lines 99-131`

## [middel] MIST: Mobile: MobileContextButton (Info-knop in thread-header)

Op <1200px (maar ≥ 800px) opent info-knop een MobileSheet met LeadContextPane. V2 heeft geen mobile-sheet implementatie. Toevoegen: MobileContextButton wrapper die op media-break zichtbaar wordt.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/MobileContextButton.tsx`

## [middel] MIST: Mobile: data-pane attribute (list vs detail toggle)

Bestaande grid heeft `data-pane={selectedLeadId ? 'detail' : 'list'}` die CSS media-regels triggert. V2 heeft geen data-attribute. Toevoegen aan v2 page.tsx layout.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/inbox/page.module.css lines 61-73`

## [middel] DEELS: Lead-context: V2_BASE URL routing

V2 LeadContext.tsx linkt naar `/dashboard/v2/leads/[id]` (lines 47). Bestaande LeadContextPane linkt naar `/leads/[id]` (no prefix). Als v2 een aparte leads-pagina heeft, is dit OK; anders moet het naar bestaande /leads/[id] linken.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/inbox/LeadContext.tsx lines 47-48`

## [laag] DEELS: Conversations-lijst koppelingen naar lead-detail

De bestaande ConversationsList linkt naar /inbox?lead=... (intra-inbox). V2 ThreadList-rijen zijn buttons die de URL via router.push() aanpassen. Beide werken, maar v2 biedt geen directe links naar /leads/[id]. Toevoegen: optionele context-menu of rechts-klik op ThreadList-rijen voor `/leads/[id]` link.

Bron: `N/A - UI-toevoeging`

## [laag] MIST: Lead-context: Tags-sectie

V2 toont geen tags. LeadContextPane heeft Section 'Tags' met tag-chip-lijst en '+ Tag' button. Momenteel placeholder ('Geen tags'), maar moet aangesloten op toekomstige tags-feature. Hergebruiken: UI-structuur, voor nu als placeholder.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/LeadContextPane.tsx lines 133-141`

## [laag] MIST: ThreadList: Jij: -prefix in preview voor uitgaande berichten

Bestaande ConversationsList toont 'Jij: ' prefix wanneer laatsteBericht.richting === 'uitgaand'. V2 threadList preview toon dit niet. Toevoegen aan previewVoor() in inbox-mappers.ts.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/ConversationsList.tsx lines 64-66`

## [laag] DEELS: ChatPane: Status-label op berichten ('Verzonden', 'Gelezen')

V2 ChatMessage heeft optionele 'status' veld (zie InboxDemo berichten met 'Verzonden'). ChatPane rendert dit in .meta (lines 73-76). Bestaande LeadConversation doet hetzelfde. Logica moet in toChatMessages() van inbox-mappers.ts: Bericht.status → ChatMessage.status mapping.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/inbox/ChatPane.tsx lines 73-76`

## [laag] MIST: Desktop: Disabled Filter + Refresh buttons (headers)

Bestaande inbox toont twee disabled icon-buttons in colHead (Filter, Refresh). V2 ThreadList.tsx heeft geen header-buttons. Toevoegen als placeholders (later implementatie).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/inbox/page.tsx lines 109-127`

## [laag] DEELS: InboxBotToggle: alternatief UI-design

Bestaande inbox gebruikt InboxBotToggle (pill-form: groen/oranje + Pause/Play icon + label). V2 ChatPane heeft Toggle UI in header in 'blue soft' surface. Beide werken, maar design verschilt. Huidge V2-design is schoner; geen wijziging nodig.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/inbox/ChatPane.tsx lines 55-60`

## [laag] DEELS: WhatsAppComposer: error-banner voor 24u-window

Bestaande WhatsAppComposer toont AlertCircle error-banner wanneer versturen faalt (bv. 24u-venster gesloten). V2 InboxClient.tsx handelt errors af in sendError state (line 175-179), maar toont dezelfde AlertCircle-banner. Status: OK, maar locatie anders (fixed bottom-center i.p.v. onder composer).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/v2/inbox/page.module.css lines 42-56`

## [laag] DEELS: Chatpane/composer: Placeholder-text conditie

V2 ChatPane input placeholder is altijd 'Typ een bericht…'. Bestaande WhatsAppComposer toont ander placeholder wanneer bot NIET gepauzeerd. V2 verstuurt alleen wanneer botGepauzeerd=true, dus placeholder is OK, maar kan verbeterd door dynamic placeholder per surface-state.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/inbox/ChatPane.tsx line 121`
