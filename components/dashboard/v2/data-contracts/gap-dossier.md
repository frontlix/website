# Gap-brief: Lead-dossier / lead-detail (naar pariteit)

Sluit deze gaten in v2 t.o.v. het bestaande dashboard. Hergebruik de bestaande componenten + server-actions (verzin niets nieuws). v2-look (var(--rb-*), v2 ui-primitives, lucide, huisstijl). Behoud demo-fallback. Focus eerst op HOOG, dan MIDDEL.

## [hoog] DEELS: Inline editable lead-gegevens (Info-tab)

De bestaande LeadInfoTab toont een 2-koloms KLANT|WERK-layout met hover→pencil→inline-edit op elk veld (naam, telefoon, email, adres, m², voegzand, etc.). V2's InfoTab toont de gegevens als read-only (contact, dienst, checklist, bijzonderheden). Ontbreken: 1) Inline-edit per veld via EditableField-component; 2) Toelichting-block (Lead-toelichting-veld, aparte editor).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/lead-detail/LeadInfoTab.tsx, EditableField.tsx, LeadToelichtingBlock.tsx`

## [hoog] DEELS: Offerte-formulier (inline edit + preview)

V2's OffertesTab toont offertes als read-only lijst + regels-preview. LeadOfferteForm (bestaand) biedt VOLLEDIGE inline-edit: m², korting, extra arbeid, voegzand, geldigheid-dagen, met live-totaal-berekening, auto-save (debounce), en knoppen (PDF-preview, naar klant sturen, concept/aanpassingen). V2 is slechts een preview. Voorkeur: OffertesTab uitbreiden met inline-edit, of een separate modal/wizard-flow waarin de volledige LeadOfferteForm wordt ingesloten.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/offerte/LeadOfferteForm.tsx`

## [hoog] DEELS: Offerte-wizard / modale offerte-editor

V2 dispatcht 'rb:new-offerte'-event om een offerte-wizard te openen, maar deze wizard-component is niet in v2-dossier geïntegreerd. De bestaande app toont LeadOfferteForm inline in de Offerte-tab. V2 moet hetzelfde kunnen: ofwel inline in OffertesTab, ofwel in een modal/wizard die via dezelfde event geactiveerd wordt.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/offerte/LeadOfferteForm.tsx`

## [hoog] MIST: Bot-actie: Offerte goedkeuren en naar klant sturen (ApproveQuoteButton)

ApproveQuoteButton in de bestaande offerte-sidebar stuurt de huidige offerte naar de klant (PDF + bevestigingsmail). V2 toont geen knop hiervoor in OffertesTab. Uitwerking: Knop toevoegen in OffertesTab (wellicht per offerte-rij) met versie-nummer en bevestigingsdialog.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/bot-actions/ApproveQuoteButton.tsx`

## [hoog] DEELS: Lead-gegevens opslaan (server-actions)

EditableField (bestaand) roept updateLeadField server-action aan voor elk veld. V2's InfoTab is read-only en biedt geen server-save. Voorkeur: EditableField-component hergebruiken in v2's InfoTab.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/lead-detail/EditableField.tsx`

## [middel] MIST: Activiteit-timeline tab

De bestaande versie toont een Activiteit-/Tijdlijn-tab met alle lead-events (berichten in/uit, foto's geupload, offertes verstuurd, notities toegevoegd, status-wijzigingen, afspraken geboekt). Gebruikersource: aggregateActivityTimeline(detail). V2 toont dit helemaal niet. Voorkeur: apart Activiteit-tab-paneel naast Info/Offertes/Foto's/Notities in DossierView.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadActivityTimeline.tsx`

## [middel] MIST: Toelichting-veld (custom notities op lead)

LeadToelichtingBlock laadt/slaat de lead.toelichting veld op. Dit is een apart, gratis-tekstveld waar de eigenaar interne notities over de lead kan plaatsen (anders dan de team-notities in de Notities-tab). V2 ondersteunt dit niet.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/lead-detail/LeadToelichtingBlock.tsx`

## [middel] MIST: Bot-acties: Afspraak plannen/verplaatsen (AppointmentForm)

De bestaande LeadAfspraak-sectie bevat AppointmentForm met twee modes: 'book' (plan afspraak) en 'reschedule' (verplaats bestaande). V2 ondersteunt niet het plannen/verplaatsen van afspraken via dashboard. Uitwerking: Voeg een Afspraken-block toe in InfoTab of een apart 'Afspraken'-tab (spiegelend de LeadAfspraak.tsx structuur).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/bot-actions/AppointmentForm.tsx, LeadAfspraak.tsx`

## [middel] MIST: Bot-actie: Offerte aanpassen en opnieuw sturen (ModifyQuoteForm)

ModifyQuoteForm (bestaand) stelt offerte-parameters aan (m², korting, extra arbeid, voegzand) en genereert een nieuwe versie. V2 ondersteunt dit niet. Uitwerking: In OffertesTab of naast LeadOfferteForm een 'Aanpassen + sturen'-knop (parallel aan inline-edit van LeadOfferteForm).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/bot-actions/ModifyQuoteForm.tsx`

## [middel] MIST: Notitie verwijderen

LeadNotes (bestaand) biedt per-notitie-verwijdering via deleteNote server-action. V2's NotitiesTab toont geen verwijderings-knop. Uitwerking: Knop toevoegen per notitie (gelijk aan bestaande LeadNotes).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadNotes.tsx`

## [middel] MIST: Tags bewerken (LeadTagsEditor)

LeadTagsEditor (bestaand) in de Info-tab biedt tag-chips + add/remove + create new tag. V2 ondersteunt tags niet. Uitwerking: LeadTagsEditor-component toevoegen in DossierView (wellicht onder Info-tab of als eigen sectie).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadTagsEditor.tsx`

## [middel] MIST: Dashboard-status en bot-status badges

LeadStatusBadges (bestaand) toont Bot-status (statusveld), Gesprek-fase en Dashboard-status (dropdown). V2 toont geen daarvan. Uitwerking: LeadStatusBadges-component (of vereenvoudigde versie) toevoegen in InfoTab of als aparte sectie.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadStatusBadges.tsx`

## [middel] MIST: Afspraak weergeven en bewerken

LeadAfspraak toont geplande afspraak (datum/tijd) als read-only blok + AppointmentForm (book/reschedule). V2 ondersteunt geen afspraak-display/edit. Uitwerking: Afspraak-gegevens toevoegen aan dossier-data (afspraak_datum, afspraak_starttijd) en WeergaveBlock + AppointmentForm-integration in InfoTab.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadAfspraak.tsx`

## [middel] DEELS: Foto-strip / fotostrip in chat

V2's ChatPanel en FotosTab tonen foto-placeholders zonder echte afbeeldingen (placeholder-component). V2 bouwt geen foto-URLs; mapper levert alleen placeholder-labels ('Foto 1', 'Foto 2'). Bij integrat met echte fotos moet PhotoPlaceholder vervangen door echte <Image> component.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/dossier/PhotoPlaceholder.tsx`

## [laag] MIST: Web-chat panel (fallback voor web-klanten)

De bestaande versie toont een apart Web-chat-paneel voor klanten zonder WhatsApp (kanaal='web'), met magic-link, token-expiry-status, en acties (mail opnieuw versturen, token regenereren). V2 ondersteunt dit helemaal niet. Uitwerking: ApplicableView moet controleren op kanaal en optioneel WebChatPanel renderen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/lead-detail/WebChatPanel.tsx`

## [laag] DEELS: Lead-detail header met snelkoppelingen

DossierView toont een kop met naam, status-pill, gearchiveerd-label, meta-info en knoppen (Notitie, Archief, Offerte versturen). LeadDetailHeader (bestaand) levert meer metadata: adres, telefoon, email, relatieve tijd. V2's kop is een vereenvoudigde versie. Verbetering: meer contact-info toevoegen in de kop (telefoon, email), of deze informatie van LeadDetailHeader spiegelen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/lead-detail/LeadDetailHeader.tsx`

## [laag] MIST: Bot-actie: AVG-verwijdering (AvgDeleteButton)

AvgDeleteButton in LeadDangerZone verwijdert permanent alle lead-data. V2 heeft geen verwijderings-optie. Uitwerking: Button toevoegen in DossierView (wellicht onder een 'Acties'-menu of in de footer, met type-to-confirm).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/bot-actions/AvgDeleteButton.tsx, LeadDangerZone.tsx`

## [laag] MIST: Bot-actie: Review-verzoek blokkeren (BlokkeerReviewToggle)

BlokkeerReviewToggle slaat klus_geblokkeerd in, wat voorkomt dat Surface een NPS-vraag na de klus stuurt. V2 ondersteunt dit niet. Uitwerking: Toggle toevoegen in DossierView (naast archiveren of in een 'Instellingen'-paneel).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/bot-actions/BlokkeerReviewToggle.tsx`

## [laag] MIST: Bot-actie: Surface-config herladen (BotRefreshButton)

BotRefreshButton forceert een Surface-reload wanneer tenant_settings of pricing_rules veranderd zijn. Dit is een globale actie (niet per lead), maar kan in DossierView nuttig zijn als fallback. V2 ondersteunt dit niet.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/bot-actions/BotRefreshButton.tsx`

## [laag] DEELS: Bot-status strip (LeadBotStatus)

LeadBotStatus toont fase-label (Info verzamelen / Offerte verstuurd / Onderhandelen / Datum kiezen / Afspraak bevestigd), beschrijving ('Vraagt om m² bevestiging...'), Lead-ID en pauzeer-toggle. V2's SurfaceStrip toont fase + actie maar minder context. Verbetering: meer metadata toevoegen (Lead-ID, pauzeer-button directeur aanwezig in DossierView).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/lead-detail/LeadBotStatus.tsx, SurfaceStrip.tsx`

## [laag] MIST: Foto-lightbox / viewer

LeadPhotos (bestaand) biedt een grid + lightbox (PhotoLightbox component) met foto-analyse-badge. V2's FotosTab toont foto-placeholders zonder lightbox/viewer. Uitwerking: PhotoLightbox-component toevoegen in v2's FotosTab.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadPhotos.tsx, PhotoLightbox.tsx`

## [laag] MIST: Danger Zone (Acties-sectie)

LeadDangerZone (bestaand) groepeerd archivering, review-blokkering en AVG-verwijdering. V2 ondersteunt geen 'Acties'-sectie. Uitwerking: Deze acties verspreid toevoegen of in een aparte Acties-modal organiseren.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadDangerZone.tsx`
