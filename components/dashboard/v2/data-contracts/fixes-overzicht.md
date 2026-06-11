# Fix-brief: Overzicht (data-koppeling)

Los onderstaande parity-issues op. Houd de v2-look + scroll/hoogte ongewijzigd; verander alleen wat nodig is. Gebruik de bestaande (app)-implementatie als referentie (hergebruik geocode/validatie/acties, verzin niets nieuws). Behoud de demo-fallback (geen sessie -> demo).

## 1. [MEDIUM] `components/dashboard/v2/overzicht/overzicht-mappers.ts`

**Probleem:** OmzetCard-delta wijkt af van de (app)-parity bij prev=0. mapOmzetData() berekent diff = omzetMaand - omzetMaandPrev en toont altijd een delta. De bestaande pagina toont de week-delta op omzet alleen als omzetMaandPrev > 0 (zie (app)/page.tsx omzetDelta-guard en computeDelta() in kpi-types.tsx, dat '—' teruggeeft zodra prevValue === 0). Bij een nieuwe tenant / lege vorige-periode (omzetMaandPrev = 0) toont v2 nu een misleidende '+€Xk vs vorige week' (de volledige maandomzet als 'groei') i.p.v. '—'. Dit is een echte read/afgeleide-cijfer-divergentie.

**Fix:** Guard toevoegen in mapOmzetData: als omzetMaandPrev <= 0 → delta = '—' (en eventueel deltaSub leeg/onveranderd laten), exact zoals computeDelta()/de (app)-omzetDelta-guard. Bijv. const heeftPrev = input.omzetMaandPrev > 0; delta: !heeftPrev || diff === 0 ? '—' : `${sign}${formatEuroShort(Math.abs(diff))}`.
