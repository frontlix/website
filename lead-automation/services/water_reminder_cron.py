"""Water reminder cron, tijdelijke vakantiegrap (28-31 mei 2026).

Stuurt elke 2 uur (Istanbul-tijd, 10:00-20:00) een WhatsApp template naar
twee vaste ontvangers met een wisselende grap. Doet na 31 mei 2026 niets meer
(datum-check in should_trigger).

Verwijderen na vakantie: 1) delete deze file, 2) strip 2 regels uit main.py.
Zie docs/superpowers/specs/2026-05-26-water-reminder-istanbul-design.md
"""
from __future__ import annotations

import asyncio
from datetime import date, datetime
from zoneinfo import ZoneInfo

from services.whatsapp import send_template

ENABLED = True

TEMPLATE_NAME = "water_reminder"

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
    "Cafeïne onttrekt 1.2x het volume water dat je drinkt, die 6 koffies werken tegen je",
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


_sent_indices: set[int] = set()


def _log(msg: str) -> None:
    # flush=True: stdout is block-buffered onder PM2, anders blijven logs hangen tot de buffer vol is.
    print(msg, flush=True)


async def _send_to_recipient(recipient: dict, tijdstip: str, joke: str, slot_index: int) -> None:
    """Send 1 template to 1 recipient. Prints success/failure, never raises."""
    try:
        await send_template(
            phone=recipient["phone"],
            template_name=TEMPLATE_NAME,
            parameters=[recipient["name"], tijdstip, joke],
        )
        _log(f"[water-reminder] slot={slot_index} sent to name={recipient['name']} phone={recipient['phone']}")
    except Exception as e:
        _log(f"[water-reminder] slot={slot_index} FAILED for name={recipient['name']} phone={recipient['phone']}: {e}")


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

    _log(f"[water-reminder] triggering slot={slot_index} (tijdstip={tijdstip})")

    await asyncio.gather(
        *[_send_to_recipient(r, tijdstip, joke, slot_index) for r in RECIPIENTS],
        return_exceptions=True,
    )


async def start() -> None:
    """Entry point. Run as asyncio.create_task() from main.py startup."""
    if not ENABLED:
        _log("[water-reminder] ENABLED=False; cron task exits immediately")
        return

    _log("[water-reminder] cron started (24 slots scheduled across 4 days)")

    while True:
        try:
            now = datetime.now(ISTANBUL_TZ)
            await _check_and_send(now)
        except asyncio.CancelledError:
            _log("[water-reminder] cron cancelled")
            raise
        except Exception as e:
            _log(f"[water-reminder] iteration error: {e}")
        await asyncio.sleep(LOOP_INTERVAL_S)
