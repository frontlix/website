# Lead definitief verwijderen (twee-traps-prullenbak)

**Datum:** 2026-06-28
**Branch:** `feat/lead-definitief-verwijderen`
**Status:** goedgekeurd door Chris, in uitvoering

## Probleem / wens

De "Verwijderen"-knop in de actieve leadslijst archiveert een lead en haalt 'm uit
de statistieken (de hernoemde voormalige "Geen echte lead"-knop). Maar een lead is
nooit écht weg uit de database. Chris wil een tweede, definitieve stap: vanuit het
archief een lead **voorgoed** kunnen verwijderen, inclusief alle gekoppelde data en
de bijbehorende afspraak in Google Agenda.

## Model: twee trappen (prullenbak)

1. **Actieve leadslijst → "Verwijderen"** = naar archief + uit statistieken.
   *Bestaat al* (`markeerGeenEchteLead`). Omkeerbaar via "Herstel". Geen wijziging.
2. **Archief → "Definitief verwijderen"** = echt voorgoed weg. Nieuw. Bewust andere
   tekst dan stap 1 zodat de twee niet te verwarren zijn.

Definitief verwijderen kan **alleen vanuit het archief** (dubbele drempel): de
server-actie weigert een lead die niet `dashboard_archived = true` is.

## Wat er weggaat

Database-onderzoek (ntew) bevestigt dat **alle** tabellen die naar `leads` verwijzen
`ON DELETE CASCADE` hebben (uitgezonderd `error_logs` = `SET NULL`). Eén
`DELETE FROM leads WHERE lead_id = ?` is dus atomair en ruimt automatisch op:

- `berichten` (WhatsApp-gesprek), `fotos`, `lead_notes`, `lead_status_history`,
  `lead_tags`, `notifications`, `offertes` (incl. `regels_snapshot`-kolom),
  `pending_delivery_checks`, `prijsregels`.
- `error_logs` blijft staan maar wordt ontkoppeld (`lead_id` → NULL).
- `offerte_concepten` heeft geen `lead_id` (bewust losgekoppeld) → niets te doen.

**Geen migratie nodig.**

### Google Agenda

Heeft de lead nog een afspraak (`afspraak_datum` gezet), dan haalt de actie eerst het
Google-event weg via de bestaande bot-route `cancel-appointment`, met
`notifyWhatsapp: false` + `notifyEmail: false` (de klant krijgt geen bericht). Pas
daarna de DB-delete. Faalt de bot-call, dan **breekt de actie af** met een nette
melding, zodat er geen spookafspraak in Google achterblijft.

## Server-actie

`deleteLeadPermanently(leadId)` in `lib/dashboard/lead-actions.ts`:

1. `requireApprovedUser()` — zelfde poort als de agenda-/AVG-acties.
2. Lead lezen via de **service-role admin-client** (`getDashboardAdmin`). Reden: op
   `leads` staat RLS aan met enkel SELECT- en UPDATE-policies, **geen DELETE-policy**;
   de RLS-client zou stil 0 rijen verwijderen. `leads` heeft geen `tenant_id`
   (single-tenant), dus de `requireApprovedUser`-poort volstaat als scoping.
3. Gate: bestaat de lead? Is `dashboard_archived = true`? Zo niet → nette fout.
4. Heeft de lead een afspraak → `callBotLeadApi('cancel-appointment', notify=false)`;
   bij fout afbreken.
5. `admin.from('leads').delete().eq('lead_id', id).eq('dashboard_archived', true)`.
6. `revalidatePath('/leads' | '/agenda' | '/inbox')`.

Retour: bestaande `ActionResult` (`{ ok }` / `{ ok:false, error }`).

## Bevestiging (tegen per ongeluk)

Eén gedeeld component `ConfirmDeleteLeadDialog` (in `components/dashboard/`),
gebruikt op alle plekken. Zelfstandig: krijgt `open`, `leadId`, `leadNaam`,
`onClose`, `onDeleted`; roept zelf `deleteLeadPermanently` aan.

- Waarschuwingstekst met de naam en "kan niet ongedaan worden gemaakt".
- Tekstveld: je moet het woord **verwijder** typen (case-insensitive) voordat de
  rode knop "Definitief verwijderen" actief wordt.
- Toont busy-status + foutmelding inline; backdrop/Esc/Annuleren sluiten (niet
  tijdens busy). Styling via de bestaande `--rb-*`-tokens, dus licht + donker kloppen.

## Plaatsing van de knop (4 plekken)

- **Desktop archief-lijst** — `ArchivedLeadsList.tsx`: rood prullenbak-knopje naast
  "Herstel" in de actie-kolom. De rij-overlay-link mag niet meeklikken (knop heeft
  hogere z-index / `stopPropagation`).
- **Desktop dossier** — `DossierView.tsx`: in de `archived`-tak naast "Herstel".
- **Mobiel archief** — `LeadExpandedPanel.tsx` (uitklap-paneel, archief-tak): knop
  onder "Herstel naar pipeline". Uitklappen eerst = minder kans op per ongeluk.
- **Mobiel dossier** — `DossBeheer.tsx` (archief-tak, naast "Herstel uit archief"),
  bedraad vanuit `MobileLeadDossier.tsx`.

Na succes: `router.refresh()` zodat de lead overal uit beeld verdwijnt.

## Beveiliging

- Alleen ingelogde, goedgekeurde gebruiker (`requireApprovedUser`).
- Alleen vanuit het archief (gecontroleerd in de actie én in de UI: knop verschijnt
  enkel in archief-context).
- Typ-bevestiging tegen misklikken.

## Buiten scope

- Geen "prullenbak met terughalen" voor de definitieve stap (dat is juist stap 1).
- Geen audit-log van verwijderingen (kan later, los besluit).
- Geen bulk-verwijderen.
