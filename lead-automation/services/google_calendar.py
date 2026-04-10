"""Google Calendar integration — free slots and event creation.

Availability rules (Frontlix private calendar):
  Monday    13:00 - 20:00
  Tuesday   09:00 - 20:00
  Wednesday 09:00 - 20:00
  Thursday  13:00 - 20:00
  Friday    13:00 - 20:00
  Saturday  09:00 - 20:00
  Sunday    09:00 - 20:00

Slot duration: 30 minutes.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from config import get_settings

TIMEZONE = "Europe/Amsterdam"
SLOT_DURATION_MIN = 30
TZ = ZoneInfo(TIMEZONE)

# day-of-week (0=mon ... 6=sun) → start/end hour in local time
AVAILABILITY: dict[int, tuple[int, int] | None] = {
    0: (13, 20),  # mon
    1: (9, 20),   # tue
    2: (9, 20),   # wed
    3: (13, 20),  # thu
    4: (13, 20),  # fri
    5: (9, 20),   # sat
    6: (9, 20),   # sun
}


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
    max_slots: int = 20,
) -> list[dict]:
    """Get free slots within the given range respecting availability rules.

    Returns list of dicts with: start_utc, end_utc, label, iso
    """
    service = _get_calendar_service()
    calendar_id = get_settings().google_calendar_id or "primary"

    # Query Google Calendar for busy times
    fb = service.freebusy().query(body={
        "timeMin": range_start.isoformat(),
        "timeMax": range_end.isoformat(),
        "timeZone": TIMEZONE,
        "items": [{"id": calendar_id}],
    }).execute()

    busy_ranges = []
    for b in (fb.get("calendars", {}).get(calendar_id, {}).get("busy") or []):
        busy_ranges.append((
            datetime.fromisoformat(b["start"]),
            datetime.fromisoformat(b["end"]),
        ))

    # Generate candidate slots, then simulate 30% occupancy
    import hashlib
    OCCUPANCY_RATE = 0.30  # 30% of slots appear as "busy"

    slots = []
    now = datetime.now(timezone.utc)
    earliest = now + timedelta(hours=1)

    # Iterate day by day in NL timezone
    cursor_local = range_start.astimezone(TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = range_end.astimezone(TZ).replace(hour=0, minute=0, second=0, microsecond=0)

    while cursor_local <= end_local and len(slots) < max_slots:
        dow = cursor_local.weekday()  # 0=mon
        window = AVAILABILITY.get(dow)

        if window:
            start_hour, end_hour = window
            for hour in range(start_hour, end_hour):
                for minute in range(0, 60, SLOT_DURATION_MIN):
                    local_dt = cursor_local.replace(hour=hour, minute=minute)
                    start_utc = local_dt.astimezone(timezone.utc)
                    end_utc = start_utc + timedelta(minutes=SLOT_DURATION_MIN)

                    if start_utc < earliest:
                        continue
                    if start_utc < range_start or end_utc > range_end:
                        continue

                    # Check for conflicts with busy times
                    conflict = any(start_utc < b_end and end_utc > b_start for b_start, b_end in busy_ranges)
                    if conflict:
                        continue

                    label = start_utc.astimezone(TZ).strftime("%a %-d %b %H:%M")

                    # Deterministic pseudo-random filter: hash the slot time to decide
                    # if it should appear "busy" (simulates 30% occupancy)
                    slot_hash = int(hashlib.md5(start_utc.isoformat().encode()).hexdigest(), 16)
                    if (slot_hash % 100) < (OCCUPANCY_RATE * 100):
                        continue

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
        sendUpdates="all" if attendee_email else "none",
    ).execute()

    return event.get("id", "")
