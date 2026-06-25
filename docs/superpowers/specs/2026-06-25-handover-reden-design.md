# Hand-over-reden tonen in het leaddossier ("te ver" / "te klein")

Datum: 2026-06-25
Status: ontwerp goedgekeurd, klaar voor implementatieplan
Branch: `feat/handover-reden`

## Probleem

Sinds kort krijgen leads die de bot overdraagt een rode "Zelf overnemen"-badge in
het dashboard (zie `isHandover` in `lib/dashboard/lead-status-meta.ts`). Die
badge zegt *dat* het een overdracht is, maar niet *waarom*. Als de eigenaar
vanuit het overzicht doorklikt naar de lead, wil hij meteen zien waarom: de klant
woont te ver weg (buiten de werkstraal) en/of het klusje is te klein (onder de
minimale m²).

De reden staat nergens opgeslagen: de bot onthoudt alleen het feit
(`leads.eigenaar_overgenomen` / `status='handoff'`), niet de oorzaak. De reden
moet dus in het dashboard worden **afgeleid** uit `afstand_km` + `m2` tegen de
ingestelde werkgebied-grenzen.

## Doel

In het leaddossier (desktop v2 + mobiel) een korte, rode uitleg tonen waarom een
lead "zelf overnemen" is:
- onder de **Adres**-rij (waar de afstand staat): "Te ver, buiten je werkstraal (X km)";
- onder de **Oppervlakte**-rij: "Te klein, onder X m²".

Alleen bij een echte hand-over, en alleen wanneer de afstand/m² de overdracht ook
echt verklaren. Anders een neutrale regel, geen verzonnen reden.

### Scope-beslissingen (goedgekeurd)

- **Rode/waarschuwing-stijl** (passend bij de "Zelf overnemen"-badge), niet het
  rustige grijze onderschrift.
- **Desktop (v2) én mobiel.**
- **Afgeleide reden** uit `afstand_km`/`m2` vs de tenant-grenzen `radius_max_km`
  (werkstraal) en `radius_min_m2_buiten_straal` (min m²). Geen botwerk, geen
  DB-migratie.
- **Neutrale fallback**: verklaren afstand/m² de overdracht niet (handmatig
  gemarkeerd, dienst uitgezet, of ontbrekende data), dan onder Adres één neutrale
  rode regel "Bot heeft dit gesprek overgedragen", zonder valse "te ver"/"te
  klein"-claim.
- Bij een hand-over heeft de overdracht-uitleg **voorrang** op het bestaande
  rustige "Binnen gratis radius"-regeltje op de Adres-rij.

### Niet in scope

- De bot de reden laten opslaan (we leiden af; YAGNI).
- De bestaande inconsistentie van het hardcoded "Binnen gratis radius (25 km)"-
  onderschrift oplossen (los spoor; we raken alleen het hand-over-geval aan).
- Filters/sortering op hand-over-reden.

## Ontwerp

### 1. Gedeelde reden-helper (pure functie)

Eén pure helper bepaalt de teksten, zodat desktop en mobiel identiek zijn. Plek:
`lib/dashboard/handover-reason.ts` (nieuw).

```ts
export interface HandoverGrenzen { radiusMaxKm: number; minM2BuitenStraal: number }

export interface HandoverReason {
  /** Rode regel onder de Adres-rij (afstand), of null. */
  adresSub: string | null
  /** Rode regel onder de Oppervlakte-rij, of null. */
  oppervlakteSub: string | null
}

/**
 * Leidt de hand-over-reden af uit afstand + m2 tegen de werkgebied-grenzen.
 * Geeft lege regels terug als de lead geen hand-over is.
 */
export function handoverReason(
  lead: { eigenaar_overgenomen?: boolean | null; status?: string | null; afstand_km?: number | null; m2?: number | null },
  grenzen: HandoverGrenzen,
): HandoverReason {
  if (!isHandover(lead)) return { adresSub: null, oppervlakteSub: null }
  const teVer = lead.afstand_km != null && lead.afstand_km > grenzen.radiusMaxKm
  const teKlein = lead.m2 != null && lead.m2 < grenzen.minM2BuitenStraal
  const oppervlakteSub = teKlein ? `Te klein, onder ${grenzen.minM2BuitenStraal} m²` : null
  let adresSub: string | null
  if (teVer) adresSub = `Te ver, buiten je werkstraal (${grenzen.radiusMaxKm} km)`
  else if (teKlein) adresSub = null // reden staat al op de Oppervlakte-rij
  else adresSub = 'Bot heeft dit gesprek overgedragen' // neutrale fallback
  return { adresSub, oppervlakteSub }
}
```

`isHandover` blijft de enige bron voor "is dit een overdracht". De helper voegt
alleen de *reden-tekst* toe.

### 2. Grenzen ophalen in de dossier-pagina

`getLeadDetail` blijft ongemoeid. In de dossier-server-pagina's wordt één extra
query op `tenant_settings` toegevoegd (parallel in de bestaande `Promise.all`):

- Desktop: `app/dashboard/v2/leads/[lead_id]/page.tsx`.
- Mobiel: de mobiele leaddossier-pagina (`app/dashboard/(app)/leads/[lead_id]/page.tsx`).

De twee waarden worden afgeleid met de bestaande helpers uit
`components/dashboard/v2/instellingen/instellingen-mappers.ts`:
`toWorkRadius(t)` (→ `radius_max_km`, default `WORK_RADIUS_DEFAULT`) en
`toMinM2BuitenStraal(t)` (→ `radius_min_m2_buiten_straal`, default 200). Ze worden
als extra argument `grenzen: HandoverGrenzen` aan de dossier-mapper meegegeven.

### 3. Weergave

**Desktop (v2)** — hergebruikt het bestaande `InfoRow.sub`-mechanisme
(`components/dashboard/v2/dossier/dossier-data.ts`, gerenderd in
`InfoTab.tsx`). Toevoegingen:
- `InfoRow` krijgt een optioneel `tone?: 'warn'` veld; `InfoTab.tsx` rendert de
  `sub` met een rode CSS-variant (`.rowSubWarn` in `InfoTab.module.css`) wanneer
  `tone === 'warn'`.
- In `dossier-mappers.ts`: `buildKlant` zet op de Adres-rij `sub = reason.adresSub`
  + `tone: 'warn'` wanneer `reason.adresSub` gezet is (anders de bestaande
  "Binnen gratis radius"-logica). `buildWerk` zet op de Oppervlakte-rij
  `sub = reason.oppervlakteSub` + `tone: 'warn'` wanneer gezet.

**Mobiel** — `DossInfo.tsx` heeft nog geen onderschrift bij Adres/m². Toevoeging:
een rode waarschuwingsregel renderen onder de Adres-rij (afstand) en bij de m²
wanneer de mapper `adresSub`/`oppervlakteSub` meegeeft. De mobiele
dossier-mapper (`mapLeadDetailToDossier`) krijgt de grenzen mee en zet de twee
sub-teksten op de dossier-data; `DossInfo`/`DossRow` rendert ze als rode regel
(zelfde rode token als de "Zelf overnemen"-badge, `var(--rb-status-hot-ink)` met
fallback `#FF3B30`).

## Randgevallen

- **Geen hand-over** → helper geeft lege regels, niets verandert (incl. de
  bestaande "Binnen gratis radius").
- **Hand-over, afstand én m² verklaren niets** (handmatig / dienst-uit /
  `afstand_km` + `m2` beide null) → alleen de neutrale "Bot heeft dit gesprek
  overgedragen" onder Adres.
- **Hand-over, alleen te klein** → "Te klein..." onder Oppervlakte, Adres krijgt
  geen valse "te ver".
- **Hand-over, alleen te ver** → "Te ver..." onder Adres, Oppervlakte geen sub.
- **Grenzen ontbreken in tenant_settings** → de helpers vallen terug op de
  defaults (werkstraal-default, min 200).
- **`afstand_km` is enkele reis** (bevestigd: `manual-offerte-rules.ts`); de
  werkstraal `radius_max_km` is ook in enkele-reis-km gedefinieerd, dus de
  vergelijking klopt.

## Testplan

- Unit-test `handoverReason` (de pure helper) met alle combinaties:
  - niet-hand-over → beide null
  - te ver + te klein → beide gevuld
  - alleen te ver → adresSub gevuld, oppervlakteSub null
  - alleen te klein → oppervlakteSub gevuld, adresSub null
  - hand-over zonder overschrijding → adresSub = neutrale tekst, oppervlakteSub null
  - ontbrekende afstand/m² → neutrale tekst
- Unit-test de v2-mapper: een hand-over-lead met afstand > straal + m² < min
  levert op de Adres- en Oppervlakte-rij de juiste `sub` + `tone: 'warn'`.
- Handmatig/integratie: een test-lead met `eigenaar_overgenomen=true` + een
  afstand boven de straal + m² onder het minimum, en controleren dat de rode
  regels op desktop + telefoon verschijnen; daarna terugzetten.

## Oplevering / deploy

- Geen database-migratie.
- Lokaal `npx vitest run` + `npm run build` groen.
- Deploy op de live branch `feat/dashboard-rebrand-v2` via de vaste route
  (ff-merge vanuit `feat/handover-reden`, dan VPS pull + `rm -rf .next` + build +
  `pm2 restart frontlix`), met ff-check vlak vóór de push (live branch beweegt) en
  geen overlappende build.
