"""Scheduling pagina voor De Designmaker personalized demo.

Maandkalender weergave — klik op een dag om een afspraak in te plannen.
Afspraak duurt 1 hele dag (09:00 - 17:00).
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from html import escape
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from services.supabase import get_supabase  # shared via lead-automation
from services.google_calendar import get_free_slots, create_event, TIMEZONE  # shared

router = APIRouter()

TZ = ZoneInfo(TIMEZONE)
APPOINTMENT_DURATION_HOURS = 8  # hele dag: 09:00 - 17:00


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _error_page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{escape(title)} — De Designmaker</title>
    <style>body{{font-family:-apple-system,sans-serif;background:#F3F4F6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06)}}
    h1{{font-size:22px;font-weight:700;margin-bottom:12px}}p{{font-size:15px;color:#555;line-height:1.6}}</style>
    </head><body><div class="card"><h1>{escape(title)}</h1><p>{escape(message)}</p></div></body></html>"""


def _success_page(naam: str, datum_str: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Afspraak ingepland — De Designmaker</title>
    <style>
      body{{font-family:-apple-system,sans-serif;background:#F3F4F6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
      .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06)}}
      .icon{{font-size:48px;margin-bottom:16px}}
      h1{{font-size:22px;font-weight:700;margin-bottom:8px;color:#16a34a}}
      p{{font-size:15px;color:#555;line-height:1.6}}
      .slot{{background:#F0FDF4;color:#166534;font-weight:700;padding:12px 24px;border-radius:10px;display:inline-block;margin:16px 0;font-size:16px}}
    </style></head><body><div class="card">
      <div class="icon">✓</div>
      <h1>Afspraak ingepland!</h1>
      <div class="slot">{escape(datum_str)}</div>
      <p>Hoi {escape(naam)}, je afspraak staat in de agenda. Je ontvangt een Google Calendar uitnodiging per mail.</p>
    </div></body></html>"""


def _fetch_lead(token: str) -> dict | None:
    try:
        resp = get_supabase().table("leads").select("*").eq("approval_token", token).eq("demo_type", "personalized").limit(1).execute()
        return (resp.data or [None])[0]
    except Exception:
        return None


async def _get_free_dates(months_ahead: int = 3) -> set[str]:
    """Haal vrije dagen op uit Google Calendar. Returns set van 'YYYY-MM-DD' strings.

    Haalt in blokken van 14 dagen op om gaten te voorkomen.
    """
    now = datetime.now(timezone.utc)
    total_days = months_ahead * 31
    free_days: set[str] = set()

    cursor = now
    while cursor < now + timedelta(days=total_days):
        block_end = cursor + timedelta(days=14)
        try:
            slots = await get_free_slots(cursor, block_end, 500)
            for slot in slots:
                dt = datetime.fromisoformat(slot["start_utc"]).astimezone(TZ)
                free_days.add(dt.strftime("%Y-%m-%d"))
        except Exception:
            pass
        cursor = block_end

    return free_days


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

    naam = lead.get("naam") or "daar"
    safe_token = escape(token)

    # Haal vrije dagen op (2 maanden vooruit)
    free_days = await _get_free_dates(3)
    free_days_json = json.dumps(sorted(free_days))

    today = datetime.now(TZ).date()
    today_str = today.isoformat()

    # Bereken min/max maand voor navigatie (huidige + 2 maanden vooruit)
    max_month = today.month + 2
    max_year = today.year
    while max_month > 12:
        max_month -= 12
        max_year += 1

    html = f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Afspraak inplannen — De Designmaker</title>
    <style>
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; min-height: 100vh; padding: 40px 20px; }}
      .container {{ max-width: 480px; margin: 0 auto; }}
      .header {{ background: #111; color: #fff; padding: 28px 36px; border-radius: 16px 16px 0 0; text-align: center; }}
      .header h1 {{ font-size: 20px; font-weight: 700; }}
      .header p {{ color: #999; font-size: 13px; margin-top: 4px; }}
      .card {{ background: #fff; padding: 32px 36px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }}
      .intro {{ font-size: 15px; color: #4B5563; line-height: 1.6; margin-bottom: 28px; }}
      .intro strong {{ color: #111; }}

      /* Maand navigatie */
      .month-nav {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }}
      .month-nav-label {{ font-size: 18px; font-weight: 800; color: #111; text-transform: capitalize; }}
      .month-nav-btn {{ background: none; border: 2px solid #E5E7EB; color: #111; width: 40px; height: 40px; border-radius: 10px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }}
      .month-nav-btn:hover {{ background: #111; color: #fff; border-color: #111; }}
      .month-nav-btn:disabled {{ opacity: 0.3; cursor: not-allowed; }}
      .month-nav-btn:disabled:hover {{ background: none; color: #111; border-color: #E5E7EB; }}

      /* Kalender */
      .cal-table {{ width: 100%; border-collapse: collapse; }}
      .cal-table th {{ font-size: 12px; font-weight: 600; color: #9CA3AF; padding: 8px 0; text-align: center; text-transform: uppercase; }}
      .cal-table td {{ text-align: center; padding: 0; height: 48px; width: 14.28%; font-size: 15px; font-weight: 500; }}
      .cal-table td.past {{ color: #D1D5DB; }}
      .cal-table td.day-cell {{ cursor: pointer; border-radius: 12px; transition: all 0.15s; color: #374151; }}
      .cal-table td.day-cell:hover {{ background: #F3F4F6; }}
      .cal-table td.day-cell.available {{ color: #111; font-weight: 700; }}
      .cal-table td.day-cell.available:hover {{ background: #111; color: #fff; }}
      .cal-table td.day-cell.unavailable {{ color: #D1D5DB; cursor: not-allowed; }}
      .cal-table td.day-cell.selected {{ background: #111; color: #fff; }}
      .cal-table td.today {{ position: relative; }}
      .cal-table td.today::after {{ content: ''; position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; background: #16a34a; border-radius: 50%; }}

      /* Bevestiging */
      .confirm-box {{ display: none; margin-top: 28px; padding: 24px; background: #F9FAFB; border-radius: 12px; text-align: center; }}
      .confirm-box.visible {{ display: block; }}
      .confirm-date {{ font-size: 18px; font-weight: 800; color: #111; margin-bottom: 8px; }}
      .confirm-info {{ font-size: 14px; color: #6B7280; margin-bottom: 20px; }}
      .confirm-btn {{ background: #16a34a; color: #fff; padding: 14px 40px; border-radius: 10px; border: none; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; }}
      .confirm-btn:hover {{ background: #15803d; }}

      .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #9CA3AF; }}
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1>De Designmaker</h1>
        <p>Afspraak inplannen</p>
      </div>
      <div class="card">
        <p class="intro">Hoi <strong>{escape(naam)}</strong>, kies een datum voor je afspraak. Lever je voertuig voor 10:00 uur aan, dan is het dezelfde dag klaar.</p>

        <!-- Maand navigatie -->
        <div class="month-nav">
          <button class="month-nav-btn" id="prevMonth" disabled>&#8249;</button>
          <span class="month-nav-label" id="monthLabel"></span>
          <button class="month-nav-btn" id="nextMonth">&#8250;</button>
        </div>

        <!-- Kalender -->
        <div id="calendarContainer"></div>

        <div class="confirm-box" id="confirmBox">
          <div class="confirm-date" id="confirmDate"></div>
          <div class="confirm-info">Inleveren voor 10:00 uur</div>
          <form method="POST" action="/personalized/schedule">
            <input type="hidden" name="token" value="{safe_token}" />
            <input type="hidden" name="selected_date" id="selectedDateInput" value="" />
            <button type="submit" class="confirm-btn">Afspraak bevestigen</button>
          </form>
        </div>
      </div>
      <p class="footer">De Designmaker — Windmolenboschweg 14, Haelen</p>
    </div>

    <script>
    var freeDays = {free_days_json};
    var freeDaysSet = new Set(freeDays);
    var todayStr = '{today_str}';
    var todayParts = todayStr.split('-');
    var todayYear = parseInt(todayParts[0]);
    var todayMonth = parseInt(todayParts[1]) - 1;
    var todayDay = parseInt(todayParts[2]);

    var minYear = todayYear;
    var minMonth = todayMonth;
    var maxYear = {max_year};
    var maxMonth = {max_month - 1};

    var currentYear = todayYear;
    var currentMonth = todayMonth;
    var selectedDate = null;

    var NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
    var NL_DAYS = ['Ma','Di','Wo','Do','Vr','Za','Zo'];
    var NL_WEEKDAYS_FULL = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];

    function pad(n) {{ return n < 10 ? '0' + n : '' + n; }}

    function daysInMonth(y, m) {{ return new Date(y, m + 1, 0).getDate(); }}

    function firstDayOfMonth(y, m) {{
      var d = new Date(y, m, 1).getDay();
      return d === 0 ? 6 : d - 1; // maandag = 0
    }}

    function renderCalendar() {{
      var label = NL_MONTHS[currentMonth] + ' ' + currentYear;
      document.getElementById('monthLabel').textContent = label.charAt(0).toUpperCase() + label.slice(1);

      // Navigatie knoppen
      document.getElementById('prevMonth').disabled = (currentYear === minYear && currentMonth === minMonth);
      document.getElementById('nextMonth').disabled = (currentYear === maxYear && currentMonth === maxMonth);

      var days = daysInMonth(currentYear, currentMonth);
      var startDay = firstDayOfMonth(currentYear, currentMonth);

      var html = '<table class="cal-table"><thead><tr>';
      for (var i = 0; i < 7; i++) html += '<th>' + NL_DAYS[i] + '</th>';
      html += '</tr></thead><tbody><tr>';

      // Lege cellen voor de eerste dag
      for (var i = 0; i < startDay; i++) html += '<td></td>';

      var cellCount = startDay;
      for (var day = 1; day <= days; day++) {{
        var dateStr = currentYear + '-' + pad(currentMonth + 1) + '-' + pad(day);
        var isPast = (currentYear < todayYear) || (currentYear === todayYear && currentMonth < todayMonth) || (currentYear === todayYear && currentMonth === todayMonth && day < todayDay);
        var isToday = (currentYear === todayYear && currentMonth === todayMonth && day === todayDay);
        var isAvailable = freeDaysSet.has(dateStr);
        var isSelected = (selectedDate === dateStr);

        var cls = 'day-cell';
        if (isPast) cls = 'past';
        else if (isAvailable) cls += ' available';
        else cls += ' unavailable';
        if (isToday && !isPast) cls += ' today';
        if (isSelected) cls += ' selected';

        if (isPast) {{
          html += '<td class="' + cls + '">' + day + '</td>';
        }} else {{
          html += '<td class="' + cls + '" data-date="' + dateStr + '">' + day + '</td>';
        }}

        cellCount++;
        if (cellCount % 7 === 0 && day < days) html += '</tr><tr>';
      }}

      // Vul rest van de week
      while (cellCount % 7 !== 0) {{
        html += '<td></td>';
        cellCount++;
      }}

      html += '</tr></tbody></table>';
      document.getElementById('calendarContainer').innerHTML = html;

      // Event listeners
      document.querySelectorAll('.day-cell.available').forEach(function(td) {{
        td.addEventListener('click', function() {{
          var date = this.getAttribute('data-date');
          selectedDate = date;

          // Render opnieuw om selected state te updaten
          renderCalendar();

          // Toon bevestiging
          var parts = date.split('-');
          var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
          var dayName = NL_WEEKDAYS_FULL[d.getDay()];
          var label = dayName + ' ' + d.getDate() + ' ' + NL_MONTHS[d.getMonth()] + ' ' + d.getFullYear();

          document.getElementById('confirmDate').textContent = label.charAt(0).toUpperCase() + label.slice(1);
          document.getElementById('selectedDateInput').value = date;
          document.getElementById('confirmBox').classList.add('visible');
        }});
      }});
    }}

    document.getElementById('prevMonth').addEventListener('click', function() {{
      currentMonth--;
      if (currentMonth < 0) {{ currentMonth = 11; currentYear--; }}
      document.getElementById('confirmBox').classList.remove('visible');
      renderCalendar();
    }});

    document.getElementById('nextMonth').addEventListener('click', function() {{
      currentMonth++;
      if (currentMonth > 11) {{ currentMonth = 0; currentYear++; }}
      document.getElementById('confirmBox').classList.remove('visible');
      renderCalendar();
    }});

    renderCalendar();
    </script>
    </body></html>"""

    return HTMLResponse(html)


@router.post("/personalized/schedule")
async def schedule_submit(request: Request):
    form = await request.form()
    token = str(form.get("token") or "")
    selected_date = str(form.get("selected_date") or "")

    if not token or not selected_date:
        return HTMLResponse(_error_page("Ongeldige request", "Er mist informatie."), status_code=400)

    lead = _fetch_lead(token)
    if not lead:
        return HTMLResponse(_error_page("Link niet gevonden", "Deze link is verlopen."), status_code=404)

    if lead.get("status") == "appointment_booked":
        return HTMLResponse(_error_page("Al ingepland", "Je afspraak staat al in de agenda!"))

    # Parse datum → hele dag 09:00 - 17:00 NL tijd
    try:
        parts = selected_date.split("-")
        local_start = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 10, 0, tzinfo=TZ)
        local_end = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 17, 0, tzinfo=TZ)
        start_utc = local_start.astimezone(timezone.utc)
        end_utc = local_end.astimezone(timezone.utc)
    except (ValueError, IndexError):
        return HTMLResponse(_error_page("Ongeldige datum", "Deze datum kon niet worden verwerkt."), status_code=400)

    collected = dict(lead.get("collected_data") or {})
    type_dienst = collected.get("type_dienst", "wrapping")
    naam = lead.get("naam") or "klant"

    # Google Calendar event aanmaken
    try:
        event_id = await create_event(
            start_utc=start_utc,
            end_utc=end_utc,
            summary=f"De Designmaker — {type_dienst} voor {naam}",
            description=f"Voertuig inleveren voor 10:00 voor {type_dienst}.\n\nKlant: {naam}\nEmail: {lead.get('email')}\nTelefoon: +{lead['telefoon']}",
            attendee_email=lead.get("email"),
        )
    except Exception as e:
        print(f"[pd_schedule] Google Calendar create event failed: {e}")
        return HTMLResponse(_error_page("Inplannen mislukt", "Er ging iets mis. Probeer het opnieuw of neem contact op via WhatsApp."), status_code=500)

    # Update lead
    collected["_appointment_at"] = selected_date
    collected["_google_event_id"] = event_id
    get_supabase().table("leads").update({
        "status": "appointment_booked",
        "collected_data": collected,
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    # Log
    get_supabase().table("conversations").insert({
        "lead_id": lead["id"],
        "role": "assistant",
        "content": f"(afspraak ingepland: {selected_date}, hele dag)",
        "message_type": "text",
    }).execute()

    # WhatsApp bevestiging
    try:
        from services.whatsapp import send_text
        dt_local = local_start
        NL_MONTHS = ["", "januari", "februari", "maart", "april", "mei", "juni",
                     "juli", "augustus", "september", "oktober", "november", "december"]
        NL_WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
        dag_naam = NL_WEEKDAYS[dt_local.weekday()]
        datum_str = f"{dag_naam} {dt_local.day} {NL_MONTHS[dt_local.month]}"
        voornaam = naam.split()[0]
        await send_text(
            lead["telefoon"],
            f"Top {voornaam}! Je afspraak staat in de agenda voor {datum_str} (inleveren voor 10:00). Je krijgt een Google Calendar uitnodiging in je mail. Tot dan!",
        )
    except Exception as e:
        print(f"[pd_schedule] WhatsApp confirmation failed: {e}")

    # Success pagina
    NL_MONTHS = ["", "januari", "februari", "maart", "april", "mei", "juni",
                 "juli", "augustus", "september", "oktober", "november", "december"]
    NL_WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
    dt_local = local_start
    datum_label = f"{NL_WEEKDAYS[dt_local.weekday()].capitalize()} {dt_local.day} {NL_MONTHS[dt_local.month]} {dt_local.year} (inleveren voor 10:00)"

    return HTMLResponse(_success_page(naam, datum_label))
