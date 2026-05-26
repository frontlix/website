# Water Reminder Istanbul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw een tijdelijke async cron-task die tussen 28–31 mei 2026 elke 2 uur (Istanbul-tijd, 10:00–20:00) een WhatsApp-template-bericht stuurt naar twee ontvangers (Schatje, Shuul), met een wisselende grap uit een lijst van 24.

**Architecture:** Eén nieuw Python-bestand (`services/water_reminder_cron.py`) met alle logica: pure helper-functies (slot-index, trigger-check, tijdformat), in-memory idempotency set, async loop, send-helper. Geïntegreerd in de bestaande FastAPI `lead-automation/main.py` via 2 regels (1 import + 1 task-start in `@app.on_event("startup")`). Hergebruikt bestaande `send_template()` uit `services/whatsapp.py`. Geen wijzigingen aan `config.py`, `whatsapp.py`, of andere services.

**Tech Stack:** Python 3.11+, FastAPI, asyncio, `zoneinfo` (stdlib), httpx (al aanwezig via whatsapp.py), pytest.

**Spec:** [docs/superpowers/specs/2026-05-26-water-reminder-istanbul-design.md](../specs/2026-05-26-water-reminder-istanbul-design.md)

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `lead-automation/services/water_reminder_cron.py` | **Create** | Alle logica: constants (RECIPIENTS, JOKES, TEMPLATE_NAME, ENABLED), pure helpers (slot_index_for, should_trigger, format_istanbul_time), `_check_and_send()` (idempotency + send), `start()` async loop |
| `lead-automation/test_water_reminder_cron.py` | **Create** | Pytest unit-tests voor pure helpers (geen netwerk-calls). Volgt patroon van `test_branches_logic.py`. |
| `lead-automation/main.py` | **Modify** | 2 regels toevoegen: import (line ~34) + task-start in `_startup()` (line ~75). 1 regel toevoegen aan shutdown-cancel-tuple. |

**Prerequisites (door Christiaan vóór deploy):**
- Meta WhatsApp template `water_reminder_istanbul` indienen + approved status (sectie 5 spec)
- Exacte template-naam aan code-implementor doorgeven indien anders dan `water_reminder_istanbul`

---

## Task 1: Pure helper functions + tests

Doel: drie pure functies bouwen die de scheduling-logica encapsuleren, zonder netwerk-side-effects, zodat ze testbaar zijn.

**Files:**
- Create: `lead-automation/services/water_reminder_cron.py`
- Create: `lead-automation/test_water_reminder_cron.py`

### - [ ] Step 1.1: Maak de basis-file met constants en pure helpers

Maak `lead-automation/services/water_reminder_cron.py`:

```python
"""Water reminder cron — tijdelijke vakantiegrap (28-31 mei 2026).

Stuurt elke 2 uur (Istanbul-tijd, 10:00-20:00) een WhatsApp template naar
twee vaste ontvangers met een wisselende grap. Doet na 31 mei 2026 niets meer
(datum-check in should_trigger).

Verwijderen na vakantie: 1) delete deze file, 2) strip 2 regels uit main.py.
Zie docs/superpowers/specs/2026-05-26-water-reminder-istanbul-design.md
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime
from zoneinfo import ZoneInfo

from services.whatsapp import send_template

logger = logging.getLogger(__name__)

ENABLED = True

TEMPLATE_NAME = "water_reminder_istanbul"

RECIPIENTS = [
    {"name": "Schatje", "phone": "+31642341226"},
    {"name": "Shuul",   "phone": "+31619236722"},
]

ACTIVE_DATES = (
    date(2026, 5, 28),
    date(2026, 5, 29),
    date(2026, 5, 30),
    date(2026, 5, 31),
)

ACTIVE_HOURS = (10, 12, 14, 16, 18, 20)

ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")

LOOP_INTERVAL_S = 60

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

assert len(JOKES) == 24, "JOKES list must have exactly 24 entries (6 slots/day x 4 days)"


def slot_index_for(now: datetime) -> int | None:
    """Return 1-based slot index (1..24) for given Istanbul-localized datetime, or None if not a valid slot.

    Slot 1 = 28 mei 10:00, slot 2 = 28 mei 12:00, ..., slot 24 = 31 mei 20:00.
    Requires `now` to be tz-aware Istanbul time.
    """
    if now.tzinfo is None:
        raise ValueError("slot_index_for requires tz-aware datetime")
    today = now.date()
    if today not in ACTIVE_DATES:
        return None
    if now.hour not in ACTIVE_HOURS:
        return None
    day_offset = ACTIVE_DATES.index(today)
    hour_offset = ACTIVE_HOURS.index(now.hour)
    return day_offset * len(ACTIVE_HOURS) + hour_offset + 1


def should_trigger(now: datetime) -> bool:
    """True if `now` falls on a valid slot and minute == 0."""
    if not ENABLED:
        return False
    if now.minute != 0:
        return False
    return slot_index_for(now) is not None


def format_istanbul_time(now: datetime) -> str:
    """Format the Istanbul-time as 'HH:00'."""
    return f"{now.hour:02d}:00"
```

### - [ ] Step 1.2: Schrijf de unit-tests

Maak `lead-automation/test_water_reminder_cron.py`:

```python
#!/usr/bin/env python3
"""Unit tests for water_reminder_cron pure helpers (no network calls).

Run:
    cd lead-automation
    source venv/bin/activate
    pytest test_water_reminder_cron.py -v
"""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from services.water_reminder_cron import (
    ISTANBUL_TZ,
    JOKES,
    format_istanbul_time,
    should_trigger,
    slot_index_for,
)


def _ist(year, month, day, hour, minute=0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=ISTANBUL_TZ)


class TestSlotIndexFor:
    def test_first_slot_is_28may_10am(self):
        assert slot_index_for(_ist(2026, 5, 28, 10)) == 1

    def test_second_slot_is_28may_12pm(self):
        assert slot_index_for(_ist(2026, 5, 28, 12)) == 2

    def test_last_slot_of_day1_is_28may_20pm(self):
        assert slot_index_for(_ist(2026, 5, 28, 20)) == 6

    def test_first_slot_of_day2_is_29may_10am(self):
        assert slot_index_for(_ist(2026, 5, 29, 10)) == 7

    def test_final_slot_is_31may_20pm(self):
        assert slot_index_for(_ist(2026, 5, 31, 20)) == 24

    def test_returns_none_for_date_before_range(self):
        assert slot_index_for(_ist(2026, 5, 27, 10)) is None

    def test_returns_none_for_date_after_range(self):
        assert slot_index_for(_ist(2026, 6, 1, 10)) is None

    def test_returns_none_for_invalid_hour(self):
        assert slot_index_for(_ist(2026, 5, 28, 11)) is None
        assert slot_index_for(_ist(2026, 5, 28, 9)) is None
        assert slot_index_for(_ist(2026, 5, 28, 21)) is None

    def test_raises_on_naive_datetime(self):
        with pytest.raises(ValueError, match="tz-aware"):
            slot_index_for(datetime(2026, 5, 28, 10))


class TestShouldTrigger:
    def test_true_on_valid_slot_minute_zero(self):
        assert should_trigger(_ist(2026, 5, 28, 10, 0)) is True

    def test_false_on_valid_slot_nonzero_minute(self):
        assert should_trigger(_ist(2026, 5, 28, 10, 1)) is False
        assert should_trigger(_ist(2026, 5, 28, 10, 59)) is False

    def test_false_off_schedule(self):
        assert should_trigger(_ist(2026, 5, 28, 11, 0)) is False
        assert should_trigger(_ist(2026, 5, 27, 10, 0)) is False


class TestFormatIstanbulTime:
    def test_morning_slot(self):
        assert format_istanbul_time(_ist(2026, 5, 28, 10)) == "10:00"

    def test_evening_slot(self):
        assert format_istanbul_time(_ist(2026, 5, 31, 20)) == "20:00"


class TestJokesList:
    def test_has_exactly_24_jokes(self):
        assert len(JOKES) == 24

    def test_jokes_are_unique(self):
        assert len(set(JOKES)) == 24, "all jokes must be unique"

    def test_jokes_have_no_trailing_period(self):
        # Template body adds ". Tijd om water te drinken 💧", so jokes must not end with "."
        for i, joke in enumerate(JOKES, 1):
            assert not joke.endswith("."), f"Joke #{i} ends with period: {joke!r}"
```

### - [ ] Step 1.3: Run de tests, verifieer dat ze passen

Run:
```bash
cd "/Users/christiaantromp/Desktop/Frontlix website/lead-automation"
source venv/bin/activate
pytest test_water_reminder_cron.py -v
```

Expected: alle ~14 tests PASS. Bij failures: lees de fout en fix de helper-logica in `water_reminder_cron.py` (niet de tests aanpassen).

### - [ ] Step 1.4: Commit

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website"
git add lead-automation/services/water_reminder_cron.py lead-automation/test_water_reminder_cron.py
git commit -m "feat(water-reminder): pure helpers + unit tests voor scheduling-logica"
```

---

## Task 2: Send-helper + async loop

Doel: de async-loop bouwen die `should_trigger()` peilt en bij hit het template naar beide recipients stuurt, met in-memory idempotency en loop-safety.

**Files:**
- Modify: `lead-automation/services/water_reminder_cron.py` (append onder de bestaande code)

### - [ ] Step 2.1: Append send-helper + loop aan `water_reminder_cron.py`

Voeg onderaan `lead-automation/services/water_reminder_cron.py` toe:

```python


_sent_indices: set[int] = set()


async def _send_to_recipient(recipient: dict, tijdstip: str, joke: str, slot_index: int) -> None:
    """Send 1 template to 1 recipient. Logs success/failure, never raises."""
    try:
        await send_template(
            phone=recipient["phone"],
            template_name=TEMPLATE_NAME,
            parameters=[recipient["name"], tijdstip, joke],
        )
        logger.info(
            "water_reminder slot=%d sent to name=%s phone=%s",
            slot_index, recipient["name"], recipient["phone"],
        )
    except Exception:
        logger.exception(
            "water_reminder slot=%d FAILED for name=%s phone=%s",
            slot_index, recipient["name"], recipient["phone"],
        )


async def _check_and_send(now: datetime) -> None:
    """Single tick: check if a slot triggers, and if so send to all recipients in parallel."""
    if not should_trigger(now):
        return

    slot_index = slot_index_for(now)
    assert slot_index is not None, "should_trigger guaranteed a valid slot"

    if slot_index in _sent_indices:
        return

    # Add to set BEFORE send to prevent duplicate sends on flap within the same minute.
    _sent_indices.add(slot_index)

    joke = JOKES[slot_index - 1]
    tijdstip = format_istanbul_time(now)

    logger.info("water_reminder triggering slot=%d (joke=%r, tijdstip=%s)", slot_index, joke, tijdstip)

    await asyncio.gather(
        *[_send_to_recipient(r, tijdstip, joke, slot_index) for r in RECIPIENTS],
        return_exceptions=True,
    )


async def start() -> None:
    """Entry point. Run as asyncio.create_task() from main.py startup."""
    if not ENABLED:
        logger.info("water_reminder ENABLED=False; cron task exits immediately")
        return

    logger.info("water_reminder cron started (24 slots scheduled across 4 days)")

    while True:
        try:
            now = datetime.now(ISTANBUL_TZ)
            await _check_and_send(now)
        except Exception:
            logger.exception("water_reminder loop tick failed (continuing)")
        await asyncio.sleep(LOOP_INTERVAL_S)
```

### - [ ] Step 2.2: Voeg unit-tests toe voor de idempotency-logica

Append aan `lead-automation/test_water_reminder_cron.py`:

```python


class TestCheckAndSend:
    """Tests for _check_and_send idempotency. We patch send_template to count calls."""

    @pytest.fixture(autouse=True)
    def reset_sent_indices(self):
        from services.water_reminder_cron import _sent_indices
        _sent_indices.clear()
        yield
        _sent_indices.clear()

    @pytest.mark.asyncio
    async def test_marks_slot_as_sent_after_call(self, monkeypatch):
        from services import water_reminder_cron

        calls = []

        async def fake_send_template(phone, template_name, parameters):
            calls.append((phone, template_name, parameters))

        monkeypatch.setattr(water_reminder_cron, "send_template", fake_send_template)

        now = _ist(2026, 5, 28, 10, 0)
        await water_reminder_cron._check_and_send(now)

        assert 1 in water_reminder_cron._sent_indices
        assert len(calls) == 2  # two recipients

    @pytest.mark.asyncio
    async def test_does_not_resend_same_slot(self, monkeypatch):
        from services import water_reminder_cron

        calls = []

        async def fake_send_template(phone, template_name, parameters):
            calls.append((phone, template_name, parameters))

        monkeypatch.setattr(water_reminder_cron, "send_template", fake_send_template)

        now = _ist(2026, 5, 28, 10, 0)
        await water_reminder_cron._check_and_send(now)
        await water_reminder_cron._check_and_send(now)

        assert len(calls) == 2  # still just two, not four

    @pytest.mark.asyncio
    async def test_does_nothing_off_schedule(self, monkeypatch):
        from services import water_reminder_cron

        calls = []

        async def fake_send_template(phone, template_name, parameters):
            calls.append((phone, template_name, parameters))

        monkeypatch.setattr(water_reminder_cron, "send_template", fake_send_template)

        now = _ist(2026, 5, 27, 10, 0)  # day before range
        await water_reminder_cron._check_and_send(now)

        assert len(calls) == 0
        assert len(water_reminder_cron._sent_indices) == 0
```

### - [ ] Step 2.3: Check of `pytest-asyncio` is geïnstalleerd

De async tests in deze file gebruiken `@pytest.mark.asyncio` markers (explicit mode), dus alleen het pakket hoeft aanwezig te zijn — geen extra config nodig.

Run:
```bash
cd "/Users/christiaantromp/Desktop/Frontlix website/lead-automation"
source venv/bin/activate
pip show pytest-asyncio > /dev/null 2>&1 && echo "OK pytest-asyncio installed" || pip install pytest-asyncio
```

Expected: `OK pytest-asyncio installed`, of een nieuwe install.

### - [ ] Step 2.4: Run alle tests

Run:
```bash
cd "/Users/christiaantromp/Desktop/Frontlix website/lead-automation"
source venv/bin/activate
pytest test_water_reminder_cron.py -v
```

Expected: alle ~17 tests PASS.

### - [ ] Step 2.5: Commit

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website"
git add lead-automation/services/water_reminder_cron.py lead-automation/test_water_reminder_cron.py
git commit -m "feat(water-reminder): send-helper + async loop met idempotency"
```

---

## Task 3: Integratie in main.py

Doel: de cron-task starten bij FastAPI-startup en netjes cancellen bij shutdown.

**Files:**
- Modify: `lead-automation/main.py` (lines 33, 75, 80)

### - [ ] Step 3.1: Voeg de import toe

In `lead-automation/main.py`, na line 33 (`from services.web_chat_reminder_cron import start as start_web_chat_reminder_cron`):

```python
from services.water_reminder_cron import start as start_water_reminder_cron
```

Resultaat (lines 32-34):
```python
from services.delivery_timeout_cron import start as start_delivery_timeout_cron
from services.web_chat_reminder_cron import start as start_web_chat_reminder_cron
from services.water_reminder_cron import start as start_water_reminder_cron
```

### - [ ] Step 3.2: Start de task in `_startup()`

In `lead-automation/main.py`, na line 75 (`app.state.web_chat_reminder_task = asyncio.create_task(start_web_chat_reminder_cron())`):

```python
    app.state.water_reminder_task = asyncio.create_task(start_water_reminder_cron())
```

### - [ ] Step 3.3: Cancel de task in `_shutdown()`

In `lead-automation/main.py`, wijzig line 80 van:
```python
    for attr in ("config_refresh_task", "delivery_timeout_task", "web_chat_reminder_task"):
```
naar:
```python
    for attr in ("config_refresh_task", "delivery_timeout_task", "web_chat_reminder_task", "water_reminder_task"):
```

### - [ ] Step 3.4: Verifieer dat de service nog opstart (syntax-check)

Run:
```bash
cd "/Users/christiaantromp/Desktop/Frontlix website/lead-automation"
source venv/bin/activate
python -c "import main; print('main.py imports OK')"
```

Expected: `main.py imports OK`. Bij ImportError: fix de syntax/typo in main.py.

### - [ ] Step 3.5: Commit

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website"
git add lead-automation/main.py
git commit -m "feat(water-reminder): registreer cron task in FastAPI startup/shutdown"
```

---

## Task 4: Manual end-to-end test (1 echte send naar testnummer)

Doel: vóór deploy verifiëren dat het Meta-template echt werkt met onze parameter-volgorde. Stuurt 1 test-bericht naar een nummer van Christiaan zelf.

**Files:**
- Create + delete: `lead-automation/scripts/water_reminder_dryrun.py` (tijdelijk script, wordt na test weer verwijderd)

### - [ ] Step 4.1: Vraag Christiaan om zijn eigen testnummer

Vraag: **"Geef je eigen WhatsApp-nummer voor 1 test-bericht (formaat +316...)"**.

Wacht op nummer voordat je verder gaat. Laat 'm in deze stap nooit naar het Schatje- of Shuul-nummer testen — dat zou een echt bericht naar hen sturen.

### - [ ] Step 4.2: Bevestig dat Meta-template approved is

Vraag: **"Is het Meta-template `water_reminder_istanbul` (of de naam die jij koos) approved in WhatsApp Manager? Zo nee, wachten tot het approved is — anders faalt de send."**

Als template-naam afwijkt: pas `TEMPLATE_NAME` constant in `services/water_reminder_cron.py` aan.

### - [ ] Step 4.3: Maak een dry-run-script

Maak `lead-automation/scripts/water_reminder_dryrun.py`:

```python
#!/usr/bin/env python3
"""One-shot dry-run: stuur 1 water-reminder template naar een testnummer.

NIET committen — dit bestand wordt na de test weer verwijderd.

Usage:
    cd lead-automation
    source venv/bin/activate
    python scripts/water_reminder_dryrun.py +316XXXXXXXX
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.water_reminder_cron import JOKES, TEMPLATE_NAME
from services.whatsapp import send_template


async def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/water_reminder_dryrun.py +316XXXXXXXX")
        sys.exit(1)

    phone = sys.argv[1]
    test_name = "Christiaan"
    test_time = "14:00"
    test_joke = JOKES[14]  # "Een komkommer bestaat voor 95% uit water..."

    print(f"Sending test template '{TEMPLATE_NAME}' to {phone}...")
    print(f"  name={test_name}, time={test_time}, joke={test_joke!r}")

    await send_template(
        phone=phone,
        template_name=TEMPLATE_NAME,
        parameters=[test_name, test_time, test_joke],
    )
    print("OK — send completed without error. Check the WhatsApp of the recipient.")


if __name__ == "__main__":
    asyncio.run(main())
```

### - [ ] Step 4.4: Run de dry-run

Run (vervang `<TESTNUMMER>` door het nummer uit Step 4.1):
```bash
cd "/Users/christiaantromp/Desktop/Frontlix website/lead-automation"
source venv/bin/activate
python scripts/water_reminder_dryrun.py <TESTNUMMER>
```

Expected: print `OK — send completed without error.` en het bericht arriveert op het testnummer als:
> Ey Christiaan,
>
> Het is 14:00 in Istanbul. Een komkommer bestaat voor 95% uit water en presteert daarmee beter dan jij. Tijd om water te drinken 💧

**Bij fout:**
- `403`/`400` van Meta → template-naam fout of niet approved. Fix `TEMPLATE_NAME`.
- `httpx.HTTPStatusError` met andere code → log uitlezen, mogelijk env vars op lokaal niet gezet. Voor dry-run heb je `WHATSAPP_PHONE_NUMBER_ID` en `WHATSAPP_ACCESS_TOKEN` lokaal nodig.

### - [ ] Step 4.5: Vraag Christiaan om visuele bevestiging

Vraag: **"Bericht binnengekomen op je testnummer? Tekst en variabelen kloppen?"**

Bij `nee` → niet door. Debug eerst.

### - [ ] Step 4.6: Verwijder het dry-run script

```bash
rm "/Users/christiaantromp/Desktop/Frontlix website/lead-automation/scripts/water_reminder_dryrun.py"
```

Geen commit nodig — het bestand is nooit committed.

---

## Task 5: Deploy naar VPS

Doel: code live zetten. Cron start automatisch zodra PM2 herstart.

**Prerequisites:**
- Task 4 succesvol (test-bericht klopt)
- Vandaag is **26 of 27 mei 2026** (anders ga je live na de eerste slot)

### - [ ] Step 5.1: Final check — alle wijzigingen committed?

Run:
```bash
cd "/Users/christiaantromp/Desktop/Frontlix website"
git status
```

Expected: schone working tree behalve wijzigingen die niet bij dit project horen. **Zorg dat `scripts/water_reminder_dryrun.py` weg is.**

### - [ ] Step 5.2: Push naar GitHub

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website"
git push origin main
```

### - [ ] Step 5.3: SSH naar VPS en pull

Vraag Christiaan om toestemming voor SSH-actie (per memory `feedback_vps_ssh_workflow.md`):

> "Mag ik SSHen naar root@72.61.23.186 en `git pull` doen in `/var/www/frontlix-lead-automation` (of het juiste pad)?"

Bij toestemming, run lokaal:
```bash
ssh root@72.61.23.186 "cd /var/www/frontlix-lead-automation && git pull origin main"
```

(Pad-locatie checken in [docs/DEPLOY.md](../../DEPLOY.md) als het bovenstaande pad afwijkt.)

Expected: `Already up to date` of pull-summary met de nieuwe commits.

### - [ ] Step 5.4: PM2 restart

Vraag Christiaan om toestemming, dan:
```bash
ssh root@72.61.23.186 "pm2 restart frontlix-lead-automation"
```

Expected: `[PM2] Process successfully started`.

### - [ ] Step 5.5: Verifieer dat de cron is gestart in logs

```bash
ssh root@72.61.23.186 "pm2 logs frontlix-lead-automation --lines 100 --nostream | grep -i water_reminder"
```

Expected output bevat:
```
water_reminder cron started (24 slots scheduled across 4 days)
```

Als die regel ontbreekt → cron is niet gestart. Check `pm2 logs frontlix-lead-automation --lines 200` voor stacktraces.

### - [ ] Step 5.6: Eindbevestiging

Schrijf naar Christiaan: **"Live op VPS. Eerste bericht: 28 mei 09:00 NL-tijd (= 10:00 Istanbul) naar Schatje + Shuul. Logs zichtbaar via `pm2 logs frontlix-lead-automation`."**

---

## Self-Review Notes

Spec-coverage check uitgevoerd na schrijven:
- ✅ Sectie 1 (scope) → ACTIVE_DATES, ACTIVE_HOURS constants in Task 1
- ✅ Sectie 2 (architectuur) → File structure tabel + Tasks 1-3
- ✅ Sectie 3 (scheduling) → slot_index_for, should_trigger, format_istanbul_time + tests in Task 1
- ✅ Sectie 4 (data) → RECIPIENTS, JOKES, TEMPLATE_NAME, ENABLED in Task 1
- ✅ Sectie 5 (Meta template) → Task 4.2 verificatie + Task 4 e2e test
- ✅ Sectie 6 (send-flow) → Task 2 `_check_and_send` met exact volgorde uit spec (idempotency set add VOOR send)
- ✅ Sectie 7 (deploy) → Task 5
- ✅ Sectie 8 (verwijder-checklist) → Buiten scope van dit plan; staat in spec voor latere actie
- ✅ Sectie 9 (open punten) → Task 4.1 (testnummer) + 4.2 (template-naam) gates
- ✅ Sectie 10 (test-strategie) → Task 1 unit-tests + Task 4 e2e
