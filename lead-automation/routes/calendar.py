"""Calendar route, serveert het .ics bestand van een ingeplande afspraak.

GET /calendar/{token}.ics → download .ics voor het lead met approval_token=token.

Wordt gebruikt door de 'Apple Agenda' knop in de bevestigingsmail. Genereert
het bestand on-the-fly uit de lead-data + branche-config zodat het altijd
in sync is met de actuele afspraak.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from fastapi.responses import Response

from branches import get_branche
from services.mail import build_ics
from services.supabase import get_supabase

router = APIRouter()


def _appointment_window(collected: dict, duration_min: int) -> tuple[datetime, datetime] | None:
    """Reconstrueer (start_utc, end_utc) uit het opgeslagen _appointment_at veld.

    Format in DB: 'YYYY-MM-DDTHH:MM' (lokale Europe/Amsterdam tijd, geen tzinfo).
    """
    raw = collected.get("_appointment_at")
    if not isinstance(raw, str) or "T" not in raw:
        return None
    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo("Europe/Amsterdam")
        date_part, time_part = raw.split("T", 1)
        y, m, d = (int(x) for x in date_part.split("-"))
        hh, mm = (int(x) for x in time_part.split(":")[:2])
        local_start = datetime(y, m, d, hh, mm, tzinfo=tz)
        # Effective duration: stored value wint, anders config-default
        dur = int(collected.get("_appointment_duration_min") or duration_min)
        local_end = local_start + timedelta(minutes=dur)
        return local_start.astimezone(timezone.utc), local_end.astimezone(timezone.utc)
    except Exception:
        return None


@router.get("/calendar/{token}.ics")
async def serve_ics(token: str) -> Response:
    """Serve the .ics file for a lead's appointment. Used by the Apple Agenda
    button in the confirmation email."""
    if not token:
        return Response(status_code=404)

    try:
        resp = (
            get_supabase().table("leads")
            .select("id, naam, demo_type, collected_data, approval_token")
            .eq("approval_token", token).limit(1).execute()
        )
        lead = (resp.data or [None])[0]
    except Exception:
        lead = None

    if not lead:
        return Response(status_code=404)

    config = get_branche(lead.get("demo_type") or "") if lead.get("demo_type") else None
    if not config:
        return Response(status_code=404)

    collected = dict(lead.get("collected_data") or {})
    window = _appointment_window(collected, config.appointment_duration_min)
    if not window:
        return Response(status_code=404)

    start_utc, end_utc = window
    naam = lead.get("naam") or "klant"
    summary = f"Frontlix {config.appointment_label} ({config.label})"
    description = (
        f"{config.appointment_label.capitalize()} van {config.appointment_duration_min} minuten.\n"
        f"Klant: {naam}\nBranche: {config.label}\n"
        f"Bevestigd door Frontlix."
    )

    ics_bytes = build_ics(
        uid=f"frontlix-{lead['id']}",
        summary=summary,
        description=description,
        start_utc=start_utc,
        end_utc=end_utc,
    )

    return Response(
        content=ics_bytes,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="frontlix-afspraak.ics"',
            "Cache-Control": "no-store",
        },
    )
