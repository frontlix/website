# Water Reminder Istanbul — Design

**Datum:** 2026-05-26
**Status:** Concept → in review
**Auteur:** Claude + Christiaan
**Lifecycle:** Tijdelijk — actief 28–31 mei 2026, daarna verwijderen

---

## 1. Doel & Scope

Vakantiegrap: stuur **elke 2 uur** een WhatsApp-bericht via het Frontlix WhatsApp Business-nummer naar **twee ontvangers** die op vakantie zijn in Istanbul. Tekst: water-reminder met een wisselende grap.

**Scope:**
- **Periode:** 28 mei 2026 t/m 31 mei 2026 (4 dagen)
- **Tijden per dag (Istanbul, UTC+3):** 10:00, 12:00, 14:00, 16:00, 18:00, 20:00 → 6 berichten/dag
- **Server-zone (NL, CEST, UTC+2):** 09:00, 11:00, 13:00, 15:00, 17:00, 19:00 → 1 uur eerder dan Istanbul
- **Aantal berichten totaal:** 24 slots × 2 ontvangers = 48 sends
- **Berichten:** 24 unieke grappen, in vaste volgorde. Beide ontvangers krijgen per slot dezelfde grap (alleen naam-variabele verschilt).

**Out of scope:**
- Geen retry-mechanisme bij API-failures
- Geen Slack-alerts bij fouten
- Geen persistentie van "verzonden slots" naar disk (in-memory volstaat)
- Geen UI / dashboard-integratie

---

## 2. Architectuur

**Stack:** Python FastAPI service `lead-automation/` (draait al op de VPS via PM2).

**Bestanden:**

| File | Status | Wijziging |
|---|---|---|
| `lead-automation/services/water_reminder_cron.py` | **Nieuw** | Bevat alle code: cron-loop, schedule, grappenlijst, recipients, helper |
| `lead-automation/main.py` | Wijzigen | **2 regels toevoegen** — 1 import + 1 `asyncio.create_task` in lifespan |
| `lead-automation/services/whatsapp.py` | Onaangeraakt | Hergebruikt bestaande `send_template()` |
| `lead-automation/config.py` | Onaangeraakt | Geen nieuwe env vars |

**Isolatie-principe:** alles wat met dit project te maken heeft staat in `water_reminder_cron.py`. Verwijderen van het project = 1 file weg + 2 regels uit `main.py` strippen.

---

## 3. Scheduling Logica

**Loop:**
```python
async def start():
    while True:
        await asyncio.sleep(60)  # tick elke minuut
        await _check_and_send()
```

**Trigger-conditie (in `_check_and_send`):**
- Haal huidige Istanbul-tijd op: `datetime.now(ZoneInfo("Europe/Istanbul"))`
- Trigger als:
  - `date in {2026-05-28, 2026-05-29, 2026-05-30, 2026-05-31}` **AND**
  - `hour in {10, 12, 14, 16, 18, 20}` **AND**
  - `minute == 0` **AND**
  - slot-index nog niet eerder verzonden in deze proces-run

**Slot-index berekening:**
- Per (datum, uur)-combinatie 1 unieke index 1–24, gemapt op de grappenlijst
- Volgorde: 28/10:00 = 1, 28/12:00 = 2, …, 31/20:00 = 24

**Idempotency:**
- In-memory `set()` `_sent_indices` in module-scope
- Index **direct toevoegen aan de set vóór de send-poging** (niet erna). Dit voorkomt dubbel-sends bij flap binnen dezelfde minuut. Sluit aan op de "geen retry"-keuze.
- Na proces-restart is de set leeg → bij restart precies binnen een trigger-minuut kan een dubbele send gebeuren. Acceptabel risico voor 4 dagen.

**Missed-slot beleid:**
- Service-restart om bv. 14:05 → slot 14:00 is gemist, maar trigger werkt alleen op `minute == 0`. **Slot wordt geskipped, geen catch-up.**
- Acceptabel: een gemiste reminder is geen ramp; bij 4 dagen × 6 slots is de kans op een gemist slot laag.

**Tijdzone-detail:**
- Server draait in NL CEST (UTC+2), Istanbul = UTC+3 (geen DST in Turkije)
- Code gebruikt `ZoneInfo("Europe/Istanbul")` om server-zone irrelevant te maken
- Voor `{{2}}` (tijdstip-variabele): formatteer als `"HH:00"` Istanbul-tijd (bv. `"14:00"`)

---

## 4. Data (in `water_reminder_cron.py`)

**Kill switch:**
```python
ENABLED = True  # flip naar False voor instant uitzetten
```

**Recipients (hardcoded constant):**
```python
RECIPIENTS = [
    {"name": "Schatje", "phone": "+31642341226"},
    {"name": "Shuul",   "phone": "+31619236722"},
]
```
> `normalize_phone()` in `whatsapp.py` strip de `+` en formatteert naar `316...`, dus `+31...` formaat is OK.

**Template-naam (hardcoded constant):**
```python
TEMPLATE_NAME = "water_reminder_istanbul"  # exacte naam zoals goedgekeurd door Meta
```
> Christiaan vult de exacte template-naam in zodra Meta goedkeurt.

**Grappenlijst (volgorde = bericht-index 1..24):**
```python
JOKES = [
    "Ja je foto's zijn cute, je nieren zijn dat niet",
    "Stop met flirten met de waiter en pak een glas water",
    "Die outfit verdient een glas water, doe het voor de fit",
    "Eet nog 1 baklava en je bent technisch gezien stroop",
    "Tussen 47 selfies past 1 glas water",
    "Geen enkele Turkse man hydrateert je voor je, helaas",
    "Stop met onderhandelen over die tapijt en onderhandel met je dorst",
    "Ja je ziet er goed uit, van binnen is het Sahara",
    "Je hebt meer Turkse woorden geleerd dan glazen water op",
    "Je hebt vandaag al 14x 'omg shoppen' gezegd en 0x 'omg water'",
    "Je inventaris: 8 souvenirs, 0 glazen water",
    "Je instagram update sneller dan je water-intake",
    "Stop met je leven plannen via Turkse koffiedik, je nieren plannen al een opstand",
    "Niemand wordt verliefd op een gedehydrateerde marathonshopper",
    "Een komkommer bestaat voor 95% uit water en presteert daarmee beter dan jij",
    "Het brein krimpt bij 2% dehydratie, dat verklaart die impulse-koop",
    "Een kameel kan 14 dagen zonder water, jij niet, sorry",
    "Watermeloen is 92% water, en jij hebt 0% schaamte daarover",
    "Een baby drinkt verhoudingsgewijs 4x meer dan jij vandaag",
    "Je verliest 1.5L per dag puur door te ademen, jouw input matcht dat niet",
    "Cafeïne onttrekt 1.2x het volume water dat je drinkt — die 6 koffies werken tegen je",
    "Bij 1% dehydratie daalt je focus al, dat verklaart de outfit van vandaag",
    "Een kwal is 98% water en 0% stress, balans dus",
    "Honger is vaak dorst in disguise, check eerst even",
]
```

---

## 5. Meta Template Config

**Naam:** `water_reminder_istanbul` (definitief naar keuze Christiaan)
**Categorie:** Marketing
**Taal:** Nederlands (`nl`)

**Body:**
```
Ey {{1}},

Het is {{2}} in Istanbul. {{3}}. Tijd om water te drinken 💧
```

**Variabelen:**
- `{{1}}` = naam ontvanger (bv. `Sanne`)
- `{{2}}` = tijdstip in Istanbul, formaat `HH:00` (bv. `14:00`)
- `{{3}}` = grap-zin (1 van 24)

**Sample-waarden voor Meta-approval:**
- `{{1}}` = `Schatje`
- `{{2}}` = `14:00`
- `{{3}}` = `Een komkommer bestaat voor 95% uit water en presteert daarmee beter dan jij`

**Indienen vóór:** ASAP op 26 mei 2026 (approval duurt tot 24 uur, lancering 28 mei 10:00 Istanbul = 28 mei 09:00 NL).

---

## 6. Send-flow

Per trigger-tick (bij `minute == 0` en valide slot):

1. Bepaal `slot_index` (1..24) o.b.v. datum + uur
2. Check `if slot_index in _sent_indices: return` (skip)
3. **Voeg `slot_index` toe aan `_sent_indices`** (vóór send, om dubbel-sends te voorkomen)
4. Pak `joke = JOKES[slot_index - 1]`
5. Format `tijdstip = f"{istanbul_hour:02d}:00"`
6. Voor elke recipient parallel via `asyncio.gather(*, return_exceptions=True)`:
   - Roep `send_template(phone=recipient["phone"], template_name=TEMPLATE_NAME, parameters=[recipient["name"], tijdstip, joke])`
   - Bij success: log `INFO` met index + naam
   - Bij exception: log `ERROR` (exception trace), **geen** retry, **geen** Slack-alert

**Loop-safety:** de hele `_check_and_send()` wrap in een `try/except Exception` zodat één fout de while-loop niet stopt — bij fout loggen en doorgaan naar volgende tick.

---

## 7. Deploy Flow

**Stappen (na implementatie + Meta-approval):**
1. Code schrijven in feature-branch
2. Lokaal test (zonder echte sends, bv. via dry-run mode tijdens dev — niet vereist voor productie)
3. Commit + push → merge naar `main`
4. SSH naar VPS: `cd /pad/naar/frontlix && git pull`
5. `pm2 restart frontlix-lead-automation`
6. `pm2 logs frontlix-lead-automation --lines 50` — verifieer dat de water_reminder cron is gestart

**Geen DB-migraties, geen Next.js build, geen npm install nodig.**

---

## 8. Verwijder-Checklist (na 31 mei)

1. `git rm lead-automation/services/water_reminder_cron.py`
2. Verwijder de 2 regels uit `lead-automation/main.py`:
   - De import-regel
   - De `asyncio.create_task(start_water_reminder_cron())` regel
3. Commit + push, `git pull` op VPS, `pm2 restart frontlix-lead-automation`

**Automatische safety:** zelfs zonder cleanup doet de loop niets meer na 31 mei (datum-check blokkeert sends).

---

## 9. Open punten — vóór implementatie aanleveren

Recipients zijn bekend (zie sectie 4). Nog open:

1. **Exacte template-naam** zoals goedgekeurd door Meta (placeholder: `water_reminder_istanbul`)
2. **Bevestiging** dat Meta-template is goedgekeurd vóór 28 mei 09:00 NL-tijd

---

## 10. Test-strategie (lokaal, vóór deploy)

- Unit-niveau niet vereist voor dit volume
- **Dry-run vóór live:** tijdelijk extra recipient = Christiaan zelf, datum-check tijdelijk versoepelen naar "vandaag", trigger forceren via minuut-check uitschakelen → 1 echte test-send om te verifiëren dat het template werkt
- Na succesvolle test: code terug naar productie-config, commit, deploy
