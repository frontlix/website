"""Scheduling pagina voor De Designmaker personalized demo.

GET  /personalized/schedule?token=...  → pagina met beschikbare tijdslots
POST /personalized/schedule            → boek het gekozen slot
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from services.supabase import get_supabase  # shared via lead-automation
from services.google_calendar import get_free_slots, create_event, TIMEZONE  # shared

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _error_page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{escape(title)} — De Designmaker</title>
    <style>body{{font-family:-apple-system,sans-serif;background:#F3F4F6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06)}}
    h1{{font-size:22px;font-weight:700;margin-bottom:12px}}p{{font-size:15px;color:#555;line-height:1.6}}</style>
    </head><body><div class="card"><h1>{escape(title)}</h1><p>{escape(message)}</p></div></body></html>"""


def _success_page(naam: str, slot_label: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Afspraak ingepland — De Designmaker</title>
    <style>
      body{{font-family:-apple-system,sans-serif;background:#F3F4F6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
      .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06)}}
      .icon{{font-size:48px;margin-bottom:16px}}
      h1{{font-size:22px;font-weight:700;margin-bottom:8px;color:#16a34a}}
      p{{font-size:15px;color:#555;line-height:1.6}}
      .slot{{background:#F0FDF4;color:#166534;font-weight:700;padding:12px 20px;border-radius:10px;display:inline-block;margin:16px 0;font-size:16px}}
    </style></head><body><div class="card">
      <div class="icon">✓</div>
      <h1>Afspraak ingepland!</h1>
      <div class="slot">{escape(slot_label)}</div>
      <p>Hoi {escape(naam)}, je afspraak staat in de agenda. Je ontvangt een Google Calendar uitnodiging per mail.</p>
    </div></body></html>"""


def _fetch_lead(token: str) -> dict | None:
    try:
        resp = get_supabase().table("leads").select("*").eq("approval_token", token).eq("demo_type", "personalized").limit(1).execute()
        return (resp.data or [None])[0]
    except Exception:
        return None


@router.get("/personalized/schedule")
async def schedule_page(request: Request):
    token = request.query_params.get("token")
    if not token:
        return HTMLResponse(_error_page("Ongeldige link", "Deze link werkt niet meer."), status_code=400)

    lead = _fetch_lead(token)
    if not lead:
        return HTMLResponse(_error_page("Link niet gevonden", "Deze link is verlopen of ongeldig."), status_code=404)

    if lead.get("status") == "appointment_booked":
        return HTMLResponse(_error_page("Al ingepland", "Je afspraak staat al in de agenda!"))

    # Haal vrije slots op uit Google Calendar (komende 14 dagen)
    now = datetime.now(timezone.utc)
    range_end = now + timedelta(days=14)

    try:
        all_slots = await get_free_slots(now, range_end, 30)
    except Exception as e:
        print(f"[pd_schedule] Google Calendar error: {e}")
        return HTMLResponse(_error_page("Agenda fout", "Er ging iets mis bij het ophalen van beschikbare tijden. Probeer het later opnieuw."))

    if not all_slots:
        return HTMLResponse(_error_page("Geen beschikbaarheid", "Er zijn op dit moment geen vrije tijdslots beschikbaar in de komende 2 weken. Neem contact op via WhatsApp."))

    # Groepeer slots per dag
    from zoneinfo import ZoneInfo
    tz = ZoneInfo(TIMEZONE)
    days: dict[str, list[dict]] = {}
    for slot in all_slots:
        dt = datetime.fromisoformat(slot["start_utc"]).astimezone(tz)
        day_key = dt.strftime("%A %-d %B")
        if day_key not in days:
            days[day_key] = []
        days[day_key].append({
            **slot,
            "time": dt.strftime("%H:%M"),
        })

    # Render slots als knoppen per dag
    days_html = ""
    for day_label, slots in days.items():
        slots_btns = "".join(
            f'<button type="submit" name="slot_iso" value="{escape(s["iso"])}" class="slot-btn">{escape(s["time"])}</button>'
            for s in slots
        )
        days_html += f"""
        <div class="day-group">
          <h3 class="day-label">{escape(day_label)}</h3>
          <div class="slots-grid">{slots_btns}</div>
        </div>"""

    naam = lead.get("naam") or "daar"
    safe_token = escape(token)

    html = f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Afspraak inplannen — De Designmaker</title>
    <style>
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; min-height: 100vh; padding: 40px 20px; }}
      .container {{ max-width: 600px; margin: 0 auto; }}
      .header {{ background: #111; color: #fff; padding: 28px 36px; border-radius: 16px 16px 0 0; text-align: center; }}
      .header h1 {{ font-size: 20px; font-weight: 700; }}
      .header p {{ color: #999; font-size: 13px; margin-top: 4px; }}
      .card {{ background: #fff; padding: 32px 36px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }}
      .intro {{ font-size: 15px; color: #4B5563; line-height: 1.6; margin-bottom: 28px; }}
      .intro strong {{ color: #111; }}
      .day-group {{ margin-bottom: 24px; }}
      .day-label {{ font-size: 14px; font-weight: 700; color: #111; margin-bottom: 10px; text-transform: capitalize; }}
      .slots-grid {{ display: flex; flex-wrap: wrap; gap: 8px; }}
      .slot-btn {{
        background: #F9FAFB; border: 2px solid #E5E7EB; color: #111; font-size: 14px; font-weight: 600;
        padding: 10px 20px; border-radius: 10px; cursor: pointer; font-family: inherit; transition: all 0.15s;
      }}
      .slot-btn:hover {{ background: #111; color: #fff; border-color: #111; }}
      .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #9CA3AF; }}
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1>De Designmaker</h1>
        <p>Afspraak inplannen</p>
      </div>
      <div class="card">
        <p class="intro">Hoi <strong>{escape(naam)}</strong>, kies een tijdstip dat je uitkomt. De afspraak duurt 30 minuten.</p>
        <form method="POST" action="/personalized/schedule">
          <input type="hidden" name="token" value="{safe_token}" />
          {days_html}
        </form>
      </div>
      <p class="footer">De Designmaker — Windmolenboschweg 14, Haelen</p>
    </div>
    </body></html>"""

    return HTMLResponse(html)


@router.post("/personalized/schedule")
async def schedule_submit(request: Request):
    form = await request.form()
    token = str(form.get("token") or "")
    slot_iso = str(form.get("slot_iso") or "")

    if not token or not slot_iso:
        return HTMLResponse(_error_page("Ongeldige request", "Er mist informatie."), status_code=400)

    lead = _fetch_lead(token)
    if not lead:
        return HTMLResponse(_error_page("Link niet gevonden", "Deze link is verlopen."), status_code=404)

    if lead.get("status") == "appointment_booked":
        return HTMLResponse(_error_page("Al ingepland", "Je afspraak staat al in de agenda!"))

    # Parse slot
    try:
        start_utc = datetime.fromisoformat(slot_iso)
        end_utc = start_utc + timedelta(minutes=30)
    except ValueError:
        return HTMLResponse(_error_page("Ongeldig tijdstip", "Dit tijdstip kon niet worden verwerkt."), status_code=400)

    # Maak Google Calendar event
    collected = dict(lead.get("collected_data") or {})
    type_dienst = collected.get("type_dienst", "wrapping")
    naam = lead.get("naam") or "klant"

    try:
        event_id = await create_event(
            start_utc=start_utc,
            end_utc=end_utc,
            summary=f"De Designmaker — afspraak met {naam} ({type_dienst})",
            description=f"Afspraak ingepland via email.\n\nKlant: {naam}\nEmail: {lead.get('email')}\nTelefoon: +{lead['telefoon']}\nDienst: {type_dienst}",
            attendee_email=lead.get("email"),
        )
    except Exception as e:
        print(f"[pd_schedule] Google Calendar create event failed: {e}")
        return HTMLResponse(_error_page("Inplannen mislukt", "Er ging iets mis bij het inplannen. Probeer het opnieuw of neem contact op via WhatsApp."), status_code=500)

    # Update lead
    collected["_appointment_at"] = slot_iso
    collected["_google_event_id"] = event_id
    get_supabase().table("leads").update({
        "status": "appointment_booked",
        "collected_data": collected,
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    # Log in conversations
    get_supabase().table("conversations").insert({
        "lead_id": lead["id"],
        "role": "assistant",
        "content": f"(afspraak ingepland via email: {slot_iso})",
        "message_type": "text",
    }).execute()

    # Stuur WhatsApp bevestiging
    try:
        from services.whatsapp import send_text
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(TIMEZONE)
        dt_local = start_utc.astimezone(tz)
        datum_str = dt_local.strftime("%A %-d %B om %H:%M").capitalize()
        voornaam = naam.split()[0]
        await send_text(
            lead["telefoon"],
            f"Top {voornaam}! Je afspraak staat in de agenda voor {datum_str}. Je krijgt zo een Google Calendar uitnodiging in je mail. Tot snel!",
        )
    except Exception as e:
        print(f"[pd_schedule] WhatsApp confirmation failed: {e}")

    # Slot label voor success pagina
    from zoneinfo import ZoneInfo
    tz = ZoneInfo(TIMEZONE)
    dt_local = start_utc.astimezone(tz)
    slot_label = dt_local.strftime("%A %-d %B om %H:%M").capitalize()

    return HTMLResponse(_success_page(naam, slot_label))
