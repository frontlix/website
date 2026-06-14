# Fix-brief: Lead-dossier (data-koppeling)

Los onderstaande parity-issues op. Houd de v2-look + scroll/hoogte ongewijzigd; verander alleen wat nodig is. Gebruik de bestaande (app)-implementatie als referentie (hergebruik geocode/validatie/acties, verzin niets nieuws). Behoud de demo-fallback (geen sessie -> demo).

## 1. [MEDIUM] `components/dashboard/v2/dossier/DossierView.tsx`

**Probleem:** stuurBericht() POST't in live-modus direct naar /send-message zonder Surface eerst te pauzeren. De send-message-route (en bot) vereist bot_gepauzeerd=true (route-comment + data-contract r.81). Stuurt de owner een bericht terwijl Surface aan staat (botAan=true), dan faalt de POST server-side: res niet ok / body.ok===false, er volgt GEEN router.refresh en GEEN foutmelding, het bericht verdwijnt stil. De bestaande WhatsAppComposer voorkomt dit door de input te disablen tenzij botPaused. De ChatPanel-placeholder belooft auto-pause, maar in live-modus pauzeert het niet (alleen in de demo-tak via setBotAanDemo(false)).

**Fix:** Of in live-modus eerst pauzeren als botAan (POST /bot-pauzeren { paused:true }) en daarna /send-message, of de input/sendBtn disablen wanneer botAan===true (zoals WhatsAppComposer met disabled={!botPaused}). En bij res.ok===false/body.ok===false de server-foutmelding (24u-window) tonen i.p.v. stil falen.
