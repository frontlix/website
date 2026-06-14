# Kleur-contract — v2 dashboard "vol en levendig"

Je geeft één v2-scherm meer kleur en leven. Doel: het dashboard is nu te
blauw/grijs/saai; we maken het kleurrijk en levendig, met **kleur als
betekenis** (kleur = persoon / status / type / kanaal / metriek / categorie).

CWD-WAARSCHUWING: werkdir is NIET de app-repo. Absolute paden. Geen worktree.
Draai GEEN `npm run build` (breekt de dev-server), alleen `npx tsc --noEmit`.

## HARDE RANDVOORWAARDEN

- **BEHOUD de layout/opzet exact.** Verplaats/verwijder/herontwerp NIETS.
  Voeg alleen KLEUR en accenten toe (achtergronden, randen, iconen, tekstkleur,
  chart-kleuren). De goedgekeurde opzet, spacing en scroll/hoogte blijven.
- Werk UITSLUITEND met de `var(--rb-*)`-tokens uit `styles/rebrand-tokens.css`
  (het fundament is al uitgebreid, zie hieronder). Geen losse hex.
- Huisstijl: geen liggende streepjes/accenten in zichtbare tekst; lucide-iconen;
  in JSX geen kale apostrof (`&apos;`). Behoud de demo-fallback.

## Het palet (al als tokens beschikbaar)

- **Anker:** `--rb-blue` (#1a56ff), `--rb-cyan` (#00b8e6).
- **Status (8, betekenisvol):** `--rb-status-{hot|new|talking|review|plan|won|lost|sent}-{bg|ink}`.
  hot=wacht-op-jou/urgent (koraal), new=nieuw (groen), talking=in gesprek (blauw),
  review=onderhandelen/in review (amber), plan=bezoek gepland (cyaan-teal),
  won=goedgekeurd/afgerond (vol groen), lost=afgewezen (rood-zacht), sent=verstuurd (grijs).
- **Avatar-tinten (8):** `--rb-avatar-{1..8}-{bg|ink}` — al toegepast via de
  Avatar-component (hash op naam). Gebruik de Avatar-primitive met een
  CONSISTENTE seed (de NAAM van de lead) zodat dezelfde persoon overal dezelfde
  kleur heeft. Zet GEEN `variant="soft"` meer op persoon-avatars (default =
  gekleurde tint); `variant="gradient"` alleen voor het Frontlix-merk-logo-blok.
- **Metriek-kleuren (KPI/sparkline/ring):** `--rb-metric-{leads|omzet|conversie|reactie|offertes}`.
- **Agenda-types:** `--rb-agenda-{klus|bezoek|deadline}-{bg|ink}`.
- **Data-viz palet (grafiek-series/kanalen/diensten):** `--rb-data-1..8`.
- **Reviews:** `--rb-star` (goud), `--rb-rating-1..5` (rood→groen per sterklasse).

## Wat per gebied (de opdracht zegt welk gebied)

- **Leads:** elke pipeline-kolom een eigen kleur-accent (kolom-header + zachte
  kolomtint); leadkaart-avatars gekleurd (op naam); status-pills via de rijke
  StatusKind. Pas de mapper (`leads-mappers.ts` `statusKindForLead`) aan zodat
  hij de nieuwe kinds gebruikt (nieuw→new, in gesprek→talking, onderhandelen→
  review, bezoek→plan, afgerond/akkoord→won, afgewezen→lost, wacht-op-jou→hot).
- **Overzicht:** KPI-tegels een gekleurde top-accent + gekleurde sparkline per
  metriek (leads=cyaan, omzet=groen, conversie=paars, reactietijd=amber,
  offertes=blauw); omzet-ring in `--rb-metric-omzet`; actielijst-rijen/iconen
  met accent per type; AgendaCard type-balkjes via de agenda-type-kleuren.
- **Agenda:** afspraken als GEKLEURDE kaartjes (zachte type-achtergrond + ink)
  i.p.v. wit met dun streepje; legenda-swatches in de type-kleuren; vandaag-kolom
  een subtiel accent.
- **Inbox:** thread-avatars gekleurd (op naam); kanaal-accent (WhatsApp groen,
  Telefoon cyaan/grijs); lead-context status/fase-pills via de rijke kinds.
- **Dossier:** kop-avatar gekleurd (op naam, NIET soft); status-pill rijk;
  tab-badges/offerte-tags kleur (concept=blauw, verstuurd=groen, archief=grijs);
  subtiele accenten op de Info-secties. Pas STAGE_KIND in `dossier-mappers.ts`
  aan naar de rijke kinds. Zet ook de `variant="soft"` avatars (DossierView +
  ChatPanel) om naar de gekleurde tint met de lead-naam als seed.
- **Reviews:** sterren in `--rb-star` (goud); verdelingsbalken per sterklasse
  `--rb-rating-5..1` (groen→rood); per-kanaal een eigen kleur; levendiger score-kaart.
- **Analyses:** grafieken multi-kleur via `--rb-data-1..8` (kleur per serie /
  kanaal / dienst i.p.v. alles blauw); funnel-stappen gekleurd; KPI-tegels accent.
- **Instellingen:** sectie-iconen in de nav gekleurd (per sectie een tint, bv.
  Bedrijfsprofiel=blauw, Diensten=groen, Prijzen=amber, Tags=paars, Agenda=cyaan);
  actieve sectie duidelijker; kanaal-status-dots gekleurd; tag-chips in tag-kleur.

## Oplevering

Geef terug: gewijzigde bestanden, welke kleuren waar zijn toegepast, en
bevestig dat de layout ongewijzigd is + `npx tsc --noEmit` schoon voor jouw deel.
