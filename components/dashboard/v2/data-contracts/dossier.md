# Data-contract: Lead-dossier (Lead-detail page + tabs + WhatsApp/Chat + Offertes + Notities)

**Auth/tenant:** Alle actions vereisen ingelogde user (auth.uid()) EN tenant_status='approved'. Auth-check via requireApprovedUser() server-side; RLS-policies per tabel (lead_notes: INSERT/DELETE alleen als auteur=auth.uid(); lead_tags: INSERT alleen als aangemaakt_door=auth.uid(); leads/offertes/prijsregels: alleen SELECT voor dashboard-users, writes gaan via service-role admin-client). Tenant-scoping gebeurt impliciet via auth.uid() filter in RLS-rules.

**Realtime:** geen

## Bestaande bestanden (bron)

- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/[lead_id]/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/v2/leads/[lead_id]/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/note-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tag-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte-draft-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/bot-api-proxy.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/bot-pauzeren/route.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/send-message/route.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/lead-detail/WhatsAppPane.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadNotes.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadTagsEditor.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadDangerZone.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadDetailRealtime.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/inbox/WhatsAppComposer.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/dossier/dossier-mappers.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/pricing-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/demo-data.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/dossier/DossierView.tsx`

## Leest (weergave-data)

- **Lead basis-info: naam, contact, adres, diensten, m2, fotos-teller, offerte-waarde, status**
  - bron: `leads tabel + getLeadDetail => Lead type`
  - vorm: Lead: lead_id, naam, bedrijfsnaam, telefoon, email, straat, huisnummer, postcode, plaats, hoofdcategorie, sub_diensten, m2, totaal_prijs, afstand_km, status, gesprek_fase, dashboard_status, bot_gepauzeerd, m2_bevestigd, offerte_verstuurd, offerte_verstuurd_op, akkoord_op, dashboard_archived, klus_geblokkeerd
  - vervangt in v2: Lead (v2/demo-data): naam, plaats, dienst (hoofdcategorie), waarde (totaal_prijs), status, statusKind
- **WhatsApp-berichten: transcript (inkomend/uitgaand) met timestamps**
  - bron: `berichten tabel + getLeadDetail`
  - vorm: Bericht[]: id, lead_id, bericht, richting ('inkomend'|'uitgaand'), type ('tekst'|'media'|etc), timestamp, bron
  - vervangt in v2: DossierBericht[]: van ('bot'|'mij'|'klant?), tekst, tijd
- **Foto's: lijst met URLs en upload-datum**
  - bron: `fotos tabel + getLeadDetail`
  - vorm: Foto[]: id, lead_id, public_url, aangemaakt, bron ('formulier'|'whatsapp')
  - vervangt in v2: DossPhotoItem[]: url, tag ('Foto N')
- **Offertes: versies, totalen, status (draft/verzonden/concept)**
  - bron: `offertes tabel + getLeadDetail`
  - vorm: Offerte[]: id, lead_id, versie, totaal_incl, korting_pct, aangemaakt_op, is_concept, status ('wacht_op_goedkeuring'|'verzonden'), regels_snapshot (jsonb)
  - vervangt in v2: offerte.versies: versie, totaalIncl, datum, verstuurd; offerte.status, offerte.regels (uit prijsregels)
- **Prijsregels: regel-items per lead (voor editor seed + display)**
  - bron: `prijsregels tabel + getLeadDetail`
  - vorm: Prijsregel[]: id, lead_id, omschrijving, aantal, eenheid, stukprijs (excl BTW), totaal, volgorde, bron ('auto_lead'|'manual')
  - vervangt in v2: offerte.regels => DossRegel[], offerte.seedRegels => SeedRegel[]; m2, korstmos, kortingPct uit lead
- **Notities: interne notities met auteur en timestamp**
  - bron: `lead_notes tabel + getLeadDetail`
  - vorm: LeadNote[]: id, lead_id, tekst, auteur (user_id), aangemaakt_op
  - vervangt in v2: Notitie[]: wie (auteur/medewerker), tijd (relative), tekst
- **Tags: tags gekoppeld aan deze lead**
  - bron: `lead_tags + tags tabel; getTagsForLead => Tag[]`
  - vorm: Tag[]: id, naam, kleur?
  - vervangt in v2: Tags UI: chips van allTags gefilterd op leadTags
- **Status-history: log van status-wijzigingen**
  - bron: `lead_status_history tabel + getLeadDetail`
  - vorm: LeadStatusHistory[]: id, lead_id, oude_status, nieuwe_status, gewijzigd_op
  - vervangt in v2: Activity timeline: status_gewijzigd events
- **Activity-timeline: aggregatie van alle events (berichten, fotos, notities, status, offertes, akkoord)**
  - bron: `lib/dashboard/lead-queries => aggregateActivityTimeline(detail)`
  - vorm: ActivityEvent[]: id, type ('lead_aangemaakt'|'bericht_in'|'bericht_uit'|'foto_geupload'|'offerte_verstuurd'|'notitie_toegevoegd'|'status_gewijzigd'|'akkoord'|'afspraak_geboekt'), timestamp, label, details
  - vervangt in v2: DossActity[]: icon, tone, t (tekst/label), time (HH:MM | 'nu')
- **Manual offerte pricing-rules: m2-based + reiskosten + arbeid + voegzand + beschermlaag configs**
  - bron: `pricing_rules tabel + getManualOffertePricing => ManualOffertePricing`
  - vorm: Pricing dict: reiniging_per_m2, arbeid_invegen_*_per_m2, voegzand_*_per_zak, voegzand_m2_per_zak, preventieve_onkruid_per_m2, beschermlaag_per_m2, plan_*_per_m2, reiskosten_per_km, reiskosten_drempel_km, extra_arbeid_per_min, plantenafscherming_per_rol
  - vervangt in v2: Gebruikt in offerte-editor seed-berekening (mobile dossier)

## Muteert (acties/knoppen)

- **Pauseer / hervatten Surface bot**  (api-route)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/bot-pauzeren/route.ts => proxyToBotApi`
  - POST { paused: boolean } => set leads.bot_gepauzeerd; UI-component WhatsAppPane.tsx useBotAction hook
- **Stuur WhatsApp-bericht (handmatig door owner)**  (api-route)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/send-message/route.ts => proxyToBotApi`
  - POST { bericht: string } => Surface stuurt via Meta WhatsApp API; vereist bot_gepauzeerd=true; 24u-window-check server-side
- **Update lead-info (naam, telefoon, email, adres, m2, sub_diensten, etc)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-actions.ts => updateLeadFields`
  - Server-action; whitelist-gevalideerd; triggert offerte-regels herberekening als prijsrelevante velden (m2, sub_diensten, etc) wijzigen => regenerateAutoRegels()
- **Wijzig lead dashboard-status**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-actions.ts => setDashboardStatus`
  - Status NULL-allowed; DB-trigger (025) logt naar lead_status_history automatisch
- **Archiveer lead / haal uit archief**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-actions.ts => archiveLead / unarchiveLead`
  - Zet dashboard_archived true/false; lead verdwijnt uit getLeadsList
- **Voeg notitie toe**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/note-actions.ts => addNote`
  - POST lead_notes; auteur = auth.uid() automatisch; revalidatePath(`/leads/${leadId}`)
- **Verwijder notitie**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/note-actions.ts => deleteNote`
  - Alleen auteur mag verwijderen (RLS-policy); revalidatePath(`/leads/${leadId}`)
- **Voeg tag toe aan lead**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tag-actions.ts => addTagToLead`
  - POST lead_tags; aangemaakt_door = auth.uid() automatisch
- **Verwijder tag van lead**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tag-actions.ts => removeTagFromLead`
  - DELETE lead_tags match lead_id + tag_id
- **Maak nieuwe tag aan**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tag-actions.ts => createTag`
  - Naam moet uniek zijn (DB-constraint); returnt tagId voor direkt koppelen
- **Auto-save offerte-draft (regels + korting)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte-draft-actions.ts => saveDraft`
  - Debounced vanuit UI; creert concept-rij als niet bestaand; REPLACE alle prijsregels; berekent totaal_incl; optioneel wipe-guard tegen lege payloads
- **Verstuur / goedkeuren offerte**  (api-route)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/approve-quote/route.ts => proxyToBotApi`
  - POST naar bot; snapshot prijsregels in regels_snapshot; markeer als verzonden; zet offerte_verstuurd / offerte_verstuurd_op op lead
- **Wijzig verzonden offerte (creert concept v+1)**  (api-route)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/app/api/dashboard/lead/[lead_id]/modify-quote/route.ts => proxyToBotApi`
  - Bot creert automatisch concept-rij met versie = max+1; pricing snap in is_concept=true row

## Gedeelde helpers (hergebruiken)

- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-queries.ts: getLeadDetail, aggregateActivityTimeline`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-actions.ts: updateLeadFields, setDashboardStatus, archiveLead, unarchiveLead, markInboxRead`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/note-actions.ts: addNote, deleteNote`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tag-actions.ts: createTag, addTagToLead, removeTagFromLead`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tag-queries.ts: getAllTags, getTagsForLead`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte-draft-actions.ts: saveDraft, revertConcept`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/offerte-actions.ts: createManualOfferte`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/pricing-queries.ts: getManualOffertePricing`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/bot-api-proxy.ts: proxyToBotApi, proxyToBotApiGlobal`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/require-approved-user.ts: requireApprovedUser`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/format.ts: formatRelative`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/relative-time.ts: shortTimeAgo`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/dossier/dossier-mappers.ts: mapLeadDetailToDossier (model-mapper van LeadDetail naar v2 dossier-shape)`

## Valkuilen

- Concept-rij per lead: Maximaal EEN offerte-rij met is_concept=true per lead. Bij edit van verzonden offerte wordt auto-conceptrij gemaakt met versie=max+1. Lege payload-check: weigeren lege draft te schrijven als er al prijsregels bestaan (wipe-guard in saveDraft).
- Prijsregels LEAD-level: Prijsregels hangen aan LEAD, niet aan offerte (geen offerte_id-kolom). Bij nieuwe draft worden ALLE prijsregels vervangen (DELETE + INSERT). Snapshot bewaard in offertes.regels_snapshot (jsonb) voor versie-historie.
- BTW hardcoded 21%: Geen configureerbare BTW-rate. Berekening: subtotaal * 1.21 MINUS reiskosten (die krijgen BTW maar zijn niet kortbaar). Wijziging vereist code-change.
- Realtime subscriber-cleanup: LeadDetailRealtime moet channel verwijderen in cleanup; StrictMode-re-run kan dubbele subs creeren zonder unieke topic-suffix (Date.now() + Math.random() gebruikt).
- 24u WhatsApp-window: send-message API-route controleert server-side of het bericht binnen 24u na laatste klant-bericht valt. Gesloten venster retourneert fout.
- Polling fallback: router.refresh() elke 8s ALLEEN als tab zichtbaar (document.visibilityState='visible'). Realtime primair; polling is verzekering.
- Tag-uniqueness: Tag-naam moet uniek zijn (DB unique constraint). createTag rejects bij duplicate.
- Status-history audit: lead_status_history wordt auto-gepopuleerd via BEFORE/AFTER UPDATE trigger (migratie 025). Geen handmatige INSERT nodig.
- Nullable fields: bedrijfsnaam, straat, plaats, bron, etc zijn nullable. Mapper buildAdres/buildBijzonderheden voeren filter(Boolean) uit; null-waarden tonen als hyphen in UI.
- offerte_verstuurd vs offerte_verstuurd_op: offerte_verstuurd is boolean; offerte_verstuurd_op is timestamp. Beide moeten samengaan (approve-quote API zet beide).
- User-initials: v2 Lead type heeft initials (bijv. FB voor Familie Bakker). Compute = naam.split() map eerste letter, join, uppercase, slice 0-2.
- Klus geblokkerd: Lead kan klus_geblokkeerd=true hebben (review-flag). UI-toggle via BlokkeerReviewToggle (bot-action). Blokkeert bepaalde auto-acties in de bot.

## Koppel-stappenplan (v2)

Stap-voor-stap v2 koppeling voor Lead-dossier:\n\n1. FETCH OP SERVER (app/dashboard/v2/leads/[lead_id]/page.tsx):\nVervang LEADS-array lookup door echte data:\nconst { lead_id } = await params;\nconst detail = await getLeadDetail(lead_id);\nconst allTags = await getAllTags();\nconst leadTags = await getTagsForLead(lead_id);\nconst pricing = await getManualOffertePricing();\nconst dossierData = mapLeadDetailToDossier(detail); // mapper gebruiken!\nreturn <DossierView dossierData={dossierData} lead={detail.lead} />;\n\n2. INFO-TAB (InfoTab.tsx):\nContact-blok: map detail.lead naar { telefoon, email, adres, afstand_km } via buildAdres();\nDiensten: { hoofd: lead.hoofdcategorie, sub: lead.sub_diensten };\nBijzonderheden: mapper buildBijzonderheden() uit dossier-mappers.ts;\nEditable fields: telefoon, email, adres via updateLeadFields server-action (whitelist);\nM2, sub_diensten edits triggeren regenerateAutoRegels() auto-berekening.\n\n3. CHAT-PANEL (ChatPanel.tsx):\nBerichten: detail.berichten gesorteerd op timestamp asc;\nBot-status: lead.bot_gepauzeerd bool toon \"gepauzeerd . jij antwoordt\" of \"online . via Surface\";\nPause-toggle: POST /api/dashboard/lead/[id]/bot-pauzeren { paused: !lead.bot_gepauzeerd };\nSend-message: POST /api/dashboard/lead/[id]/send-message { bericht } (alleen als bot_gepauzeerd=true);\nRealtime: wrap of subscribe berichten INSERT via LeadDetailRealtime (router.refresh() on new).\n\n4. OFFERTES-TAB (OffertesTab.tsx):\nVersies: detail.offertes array, sorted versie desc;\nRegels: detail.prijsregels (volgorde asc);\nTotalen: uit latest (non-concept) offerte;\nDraft-save: debounced saveDraft(leadId, { regels: [], kortingPct, kortingOmschrijving });\nAuto-berekening: computeTotaalIncl() via saveDraft; UI volgt via revalidatePath;\nPrijzen-seed: detail.prijsregels als SeedRegel[] voor editor (mapLeadDetailToDossier doet dit).\n\n5. FOTO'S-TAB (FotosTab.tsx):\nURLs: detail.fotos.map(f => ({ url: f.public_url, tag: Foto ${i+1} }));\nUpload-bron: f.bron (formulier | whatsapp);\nRealtime update: subscribe fotos INSERT.\n\n6. NOTITIES-TAB (NotitiesTab.tsx):\nLijst: detail.notes, sorted aangemaakt_op desc;\nVoeg toe: addNote(leadId, tekst) server-action INSERT lead_notes;\nVerwijder: deleteNote(noteId, leadId) server-action DELETE (alleen auteur);\nAuteur-badge: n.auteur === userId toon Verwijder-button; else Medewerker;\nRelative time: formatRelative(n.aangemaakt_op).\n\n7. TAGS (top-level chips):\nHuidge tags: leadTags = await getTagsForLead(lead_id);\nToevoegen: allTags gefilterd op leadTagIds, dropdown selecteren addTagToLead(leadId, tagId);\nNieuwe maken: createTag(naam) returnt tagId addTagToLead(leadId, tagId) direct;\nVerwijderen: removeTagFromLead(leadId, tagId) per chip.\n\n8. STATUS + ARCHIVEREN (header + acties):\nStatus-display: lead.dashboard_status (badge-kleur via lead-status-meta.ts);\nStatus-wijzigen: dropdown setDashboardStatus(leadId, status);\nArchive-toggle: archived ? unarchiveLead(leadId) : archiveLead(leadId);\nArchived-pill: toon als lead.dashboard_archived=true.\n\n9. ACTIVITY-TIMELINE (bottom):\nEvents: aggregateActivityTimeline(detail) ActivityEvent[];\nMap: reuse buildActivity() uit dossier-mappers.ts exact (al done); sorteer chronologisch;\nIcon/tone: ACT_ICON dict per event-type.\n\n10. REALTIME-SUBSCRIPTION:\nWrap DossierView in LeadDetailRealtime of subscribe berichten/fotos INSERT direct;\nOn new: router.refresh() server fetcht opnieuw getLeadDetail; component re-render;\n8s polling-fallback built-in (visibility-aware).\n\n11. REVALIDATIE:\nAlle server-actions roepen revalidatePath(`/leads/${leadId}`) + revalidatePath(/leads) aan;\nNext cache invalidated; client fresh bij router.refresh().\n\n12. AUTH + TENANT:\nrequireApprovedUser() check boven elke action; rejected user mag niet muteren;\nRLS-policies via auth.uid(); geen explicit tenant-ID (implicit via user);\nService-role writes (admin-client) in offerte/pricing: BUITEN RLS (approved-check boven).