"""Google Calendar integration, free slots and event creation.

Availability rules (Frontlix private calendar):
  7 days/week, 07:00 - 18:00 local (Europe/Amsterdam).

Slot granularity (the user-visible 'every 30 min' grid): 30 min.
Real appointment duration is set per branche via `appointment_duration_min`
and used when creating the actual event.
"""
from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from config import get_settings

TIMEZONE = "Europe/Amsterdam"
SLOT_DURATION_MIN = 30
TZ = ZoneInfo(TIMEZONE)

# Standaard-werkrooster (fallback): 7 dagen/week, 07:00-18:00 lokaal. Wordt
# overschreven door tenant_settings.beschikbaarheid als die is ingesteld.
_DEFAULT_WINDOW: tuple[time, time] = (time(7, 0), time(18, 0))
DEFAULT_AVAILABILITY: dict[int, tuple[time, time] | None] = {d: _DEFAULT_WINDOW for d in range(7)}


def _parse_hhmm(value: str) -> time | None:
    try:
        hh, mm = value.split(":")
        return time(int(hh), int(mm))
    except Exception:
        return None


def _load_availability() -> dict[int, tuple[time, time] | None]:
    """Lees de ingestelde beschikbaarheid uit tenant_settings.beschikbaarheid.

    Vorm: array van 7 (Ma..Zo, index 0=ma ... 6=zo): [{aan, van: "HH:MM",
    tot: "HH:MM"}]. Een dag met aan=False is dicht (None). Valt bij
    afwezigheid/ongeldige data terug op DEFAULT_AVAILABILITY (het oude gedrag),
    zodat de bot blijft werken als de kolom (nog) leeg is.
    """
    try:
        from services.supabase import get_supabase

        res = (
            get_supabase()
            .table("tenant_settings")
            .select("beschikbaarheid")
            .limit(1)
            .single()
            .execute()
        )
        dagen = (res.data or {}).get("beschikbaarheid")
        if not isinstance(dagen, list) or len(dagen) != 7:
            return DEFAULT_AVAILABILITY

        out: dict[int, tuple[time, time] | None] = {}
        for i in range(7):
            d = dagen[i] if isinstance(dagen[i], dict) else {}
            if not d.get("aan"):
                out[i] = None
                continue
            van = _parse_hhmm(str(d.get("van", "")))
            tot = _parse_hhmm(str(d.get("tot", "")))
            out[i] = (van, tot) if van and tot and tot > van else _DEFAULT_WINDOW
        return out
    except Exception as e:  # nooit de scheduling laten crashen op een DB-hiccup
        print(f"[calendar] kon beschikbaarheid niet laden, val terug op default: {e}")
        return DEFAULT_AVAILABILITY


def _get_calendar_service():
    s = get_settings()
    creds = Credentials(
        token=None,
        refresh_token=s.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=s.google_client_id,
        client_secret=s.google_client_secret,
    )
    return build("calendar", "v3", credentials=creds)


async def get_free_slots(
    range_start: datetime,
    range_end: datetime,
    max_slots: int = 500,
) -> list[dict]:
    """Get free slots within the given range respecting AVAILABILITY.

    Raises on Google Calendar API errors so callers can decide on fallback.
    Returns list of dicts with: start_utc, end_utc, label, iso
    """
    service = _get_calendar_service()
    calendar_id = get_settings().google_calendar_id or "primary"

    # Fail-loud: if Google's freebusy endpoint is down or our refresh token
    # is expired, surface that to the caller instead of silently degrading.
    try:
        fb = service.freebusy().query(body={
            "timeMin": range_start.isoformat(),
            "timeMax": range_end.isoformat(),
            "timeZone": TIMEZONE,
            "items": [{"id": calendar_id}],
        }).execute()
    except Exception as e:
        print(f"[calendar] freebusy query failed (calendar_id={calendar_id}): {e}")
        raise

    busy_ranges = []
    for b in (fb.get("calendars", {}).get(calendar_id, {}).get("busy") or []):
        busy_ranges.append((
            datetime.fromisoformat(b["start"]),
            datetime.fromisoformat(b["end"]),
        ))

    slots: list[dict] = []
    now = datetime.now(timezone.utc)
    earliest = now + timedelta(hours=1)  # nothing in the next hour

    # Werkdagen/-tijden uit de instellingen (tenant_settings.beschikbaarheid),
    # of het standaard 7-dagen-07:00-18:00-rooster als die leeg is.
    availability = _load_availability()

    # Iterate day by day in NL timezone
    cursor_local = range_start.astimezone(TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = range_end.astimezone(TZ).replace(hour=0, minute=0, second=0, microsecond=0)

    while cursor_local <= end_local and len(slots) < max_slots:
        dow = cursor_local.weekday()  # 0=mon
        window = availability.get(dow)

        if window:
            van_t, tot_t = window
            for hour in range(van_t.hour, tot_t.hour + 1):
                for minute in range(0, 60, SLOT_DURATION_MIN):
                    local_dt = cursor_local.replace(hour=hour, minute=minute)
                    # Respecteer de exacte begin-/eindtijd van de dag.
                    if local_dt.time() < van_t or local_dt.time() >= tot_t:
                        continue
                    start_utc = local_dt.astimezone(timezone.utc)
                    end_utc = start_utc + timedelta(minutes=SLOT_DURATION_MIN)

                    if start_utc < earliest:
                        continue
                    if start_utc < range_start or end_utc > range_end:
                        continue

                    # Conflict-check against real busy ranges only, no synthetic occupancy
                    conflict = any(start_utc < b_end and end_utc > b_start for b_start, b_end in busy_ranges)
                    if conflict:
                        continue

                    label = start_utc.astimezone(TZ).strftime("%a %-d %b %H:%M")
                    slots.append({
                        "start_utc": start_utc.isoformat(),
                        "end_utc": end_utc.isoformat(),
                        "label": label,
                        "iso": start_utc.isoformat(),
                    })

                    if len(slots) >= max_slots:
                        break
                if len(slots) >= max_slots:
                    break

        cursor_local += timedelta(days=1)

    return slots


async def create_event(
    start_utc: datetime,
    end_utc: datetime,
    summary: str,
    description: str,
    attendee_email: str | None = None,
) -> str:
    """Create a Google Calendar event. Returns event ID."""
    service = _get_calendar_service()
    calendar_id = get_settings().google_calendar_id or "primary"

    body: dict = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_utc.isoformat(), "timeZone": TIMEZONE},
        "end": {"dateTime": end_utc.isoformat(), "timeZone": TIMEZONE},
    }
    if attendee_email:
        body["attendees"] = [{"email": attendee_email}]

    event = service.events().insert(
        calendarId=calendar_id,
        body=body,
        sendUpdates="none",
    ).execute()

    return event.get("id", "")
