"""Schedule pagina voor Frontlix lead-automation.

Kalender weergave met beschikbare 30-min tijdslots.
Klant kiest datum + tijd → Google Calendar event wordt aangemaakt.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from html import escape
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from services.supabase import get_supabase
from services.google_calendar import get_free_slots, create_event, TIMEZONE
from branches import get_branche

router = APIRouter()

TZ = ZoneInfo(TIMEZONE)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _error_page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{escape(title)} — Frontlix</title>
    <style>body{{font-family:-apple-system,sans-serif;background:#F0F2F5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06)}}
    h1{{font-size:22px;font-weight:700;margin-bottom:12px;color:#1A56FF}}p{{font-size:15px;color:#555;line-height:1.6}}</style>
    </head><body><div class="card"><h1>{escape(title)}</h1><p>{escape(message)}</p></div></body></html>"""


def _success_page(naam: str, datum_str: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Afspraak ingepland — Frontlix</title>
    <style>
      body{{font-family:-apple-system,sans-serif;background:#F0F2F5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
      .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06)}}
      .icon{{font-size:48px;margin-bottom:16px;color:#1A56FF}}
      h1{{font-size:22px;font-weight:700;margin-bottom:8px;color:#1A56FF}}
      p{{font-size:15px;color:#555;line-height:1.6}}
      .slot{{background:#EEF2FF;color:#1A56FF;font-weight:700;padding:12px 24px;border-radius:10px;display:inline-block;margin:16px 0;font-size:16px}}
    </style></head><body><div class="card">
      <div class="icon">&#10003;</div>
      <h1>Afspraak ingepland!</h1>
      <div class="slot">{escape(datum_str)}</div>
      <p>Hoi {escape(naam)}, je afspraak staat in de agenda. Je ontvangt een Google Calendar uitnodiging per mail.</p>
    </div></body></html>"""


def _fetch_lead(token: str) -> dict | None:
    try:
        resp = get_supabase().table("leads").select("*").eq("approval_token", token).limit(1).execute()
        return (resp.data or [None])[0]
    except Exception:
        return None


async def _get_free_slots_grouped(days_ahead: int = 14) -> dict[str, list[str]]:
    """Haal beschikbare 30-min slots op, gegroepeerd per dag.

    Returns dict van 'YYYY-MM-DD' → lijst van 'HH:MM' strings.
    """
    now = datetime.now(timezone.utc)
    range_end = now + timedelta(days=days_ahead)

    try:
        slots = await get_free_slots(now, range_end, 500)
    except Exception:
        slots = []

    days: dict[str, list[str]] = {}
    for slot in slots:
        dt = datetime.fromisoformat(slot["start_utc"]).astimezone(TZ)
        date_key = dt.strftime("%Y-%m-%d")
        time_str = dt.strftime("%H:%M")
        if date_key not in days:
            days[date_key] = []
        days[date_key].append(time_str)

    return days


@router.get("/schedule")
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

    # Haal beschikbare slots op (2 weken vooruit)
    slots_by_day = await _get_free_slots_grouped(14)
    slots_json = json.dumps(slots_by_day)

    today = datetime.now(TZ).date()
    today_str = today.isoformat()

    # Min/max maand voor navigatie
    max_date = today + timedelta(days=14)
    max_month = max_date.month - 1  # JS is 0-indexed
    max_year = max_date.year

    html = f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Afspraak inplannen — Frontlix</title>
    <style>
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F0F2F5; min-height: 100vh; padding: 40px 20px; }}
      .container {{ max-width: 480px; margin: 0 auto; }}
      .header {{ background: linear-gradient(135deg, #1A56FF, #00CFFF); color: #fff; padding: 28px 36px; border-radius: 16px 16px 0 0; text-align: center; }}
      .header h1 {{ font-size: 20px; font-weight: 700; }}
      .header p {{ color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }}
      .card {{ background: #fff; padding: 32px 36px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }}
      .intro {{ font-size: 15px; color: #4B5563; line-height: 1.6; margin-bottom: 28px; }}
      .intro strong {{ color: #111; }}

      /* Maand navigatie */
      .month-nav {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }}
      .month-nav-label {{ font-size: 18px; font-weight: 800; color: #111; text-transform: capitalize; }}
      .month-nav-btn {{ background: none; border: 2px solid #E5E7EB; color: #111; width: 40px; height: 40px; border-radius: 10px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }}
      .month-nav-btn:hover {{ background: #1A56FF; color: #fff; border-color: #1A56FF; }}
      .month-nav-btn:disabled {{ opacity: 0.3; cursor: not-allowed; }}
      .month-nav-btn:disabled:hover {{ background: none; color: #111; border-color: #E5E7EB; }}

      /* Kalender */
      .cal-table {{ width: 100%; border-collapse: collapse; }}
      .cal-table th {{ font-size: 12px; font-weight: 600; color: #9CA3AF; padding: 8px 0; text-align: center; text-transform: uppercase; }}
      .cal-table td {{ text-align: center; padding: 0; height: 48px; width: 14.28%; font-size: 15px; font-weight: 500; }}
      .cal-table td.past {{ color: #D1D5DB; }}
      .cal-table td.day-cell {{ cursor: pointer; border-radius: 12px; transition: all 0.15s; color: #374151; }}
      .cal-table td.day-cell:hover {{ background: #F3F4F6; }}
      .cal-table td.day-cell.available {{ color: #1A56FF; font-weight: 700; }}
      .cal-table td.day-cell.available:hover {{ background: #1A56FF; color: #fff; }}
      .cal-table td.day-cell.unavailable {{ color: #D1D5DB; cursor: not-allowed; }}
      .cal-table td.day-cell.selected {{ background: #1A56FF; color: #fff; }}
      .cal-table td.today {{ position: relative; }}
      .cal-table td.today::after {{ content: ''; position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; background: #00CFFF; border-radius: 50%; }}

      /* Tijdslots */
      .time-picker {{ display: none; margin-top: 24px; }}
      .time-picker.visible {{ display: block; }}
      .time-picker-label {{ font-size: 14px; font-weight: 700; color: #111; margin-bottom: 12px; }}
      .time-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }}
      .time-slot {{ padding: 10px; border: 2px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.15s; background: #fff; color: #374151; }}
      .time-slot:hover {{ border-color: #1A56FF; color: #1A56FF; }}
      .time-slot.selected {{ background: #1A56FF; color: #fff; border-color: #1A56FF; }}

      /* Bevestiging */
      .confirm-box {{ display: none; margin-top: 28px; padding: 24px; background: #F9FAFB; border-radius: 12px; text-align: center; }}
      .confirm-box.visible {{ display: block; }}
      .confirm-date {{ font-size: 18px; font-weight: 800; color: #111; margin-bottom: 8px; }}
      .confirm-info {{ font-size: 14px; color: #6B7280; margin-bottom: 20px; }}
      .confirm-btn {{ background: #1A56FF; color: #fff; padding: 14px 40px; border-radius: 10px; border: none; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s; }}
      .confirm-btn:hover {{ background: #1545CC; }}

      .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #9CA3AF; }}
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1>Frontlix</h1>
        <p>Kennismakingsgesprek inplannen</p>
      </div>
      <div class="card">
        <p class="intro">Hoi <strong>{escape(naam)}</strong>, kies een datum en tijd voor je gratis kennismakingsgesprek van 30 minuten.</p>

        <!-- Maand navigatie -->
        <div class="month-nav">
          <button class="month-nav-btn" id="prevMonth" disabled>&#8249;</button>
          <span class="month-nav-label" id="monthLabel"></span>
          <button class="month-nav-btn" id="nextMonth">&#8250;</button>
        </div>

        <!-- Kalender -->
        <div id="calendarContainer"></div>

        <!-- Tijdslot kiezer -->
        <div class="time-picker" id="timePicker">
          <div class="time-picker-label" id="timePickerLabel">Kies een tijd:</div>
          <div class="time-grid" id="timeGrid"></div>
        </div>

        <div class="confirm-box" id="confirmBox">
          <div class="confirm-date" id="confirmDate"></div>
          <div class="confirm-info">Kennismakingsgesprek van 30 minuten</div>
          <form method="POST" action="/schedule">
            <input type="hidden" name="token" value="{safe_token}" />
            <input type="hidden" name="selected_date" id="selectedDateInput" value="" />
            <input type="hidden" name="selected_time" id="selectedTimeInput" value="" />
            <button type="submit" class="confirm-btn">Afspraak bevestigen</button>
          </form>
        </div>
      </div>
      <p class="footer">Frontlix</p>
    </div>

    <script>
    var slotsByDay = {slots_json};
    var todayStr = '{today_str}';
    var todayParts = todayStr.split('-');
    var todayYear = parseInt(todayParts[0]);
    var todayMonth = parseInt(todayParts[1]) - 1;
    var todayDay = parseInt(todayParts[2]);

    var minYear = todayYear;
    var minMonth = todayMonth;
    var maxYear = {max_year};
    var maxMonth = {max_month};

    var currentYear = todayYear;
    var currentMonth = todayMonth;
    var selectedDate = null;
    var selectedTime = null;

    var NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
    var NL_DAYS = ['Ma','Di','Wo','Do','Vr','Za','Zo'];
    var NL_WEEKDAYS_FULL = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];

    function pad(n) {{ return n < 10 ? '0' + n : '' + n; }}
    function daysInMonth(y, m) {{ return new Date(y, m + 1, 0).getDate(); }}
    function firstDayOfMonth(y, m) {{
      var d = new Date(y, m, 1).getDay();
      return d === 0 ? 6 : d - 1;
    }}

    function renderCalendar() {{
      var label = NL_MONTHS[currentMonth] + ' ' + currentYear;
      document.getElementById('monthLabel').textContent = label.charAt(0).toUpperCase() + label.slice(1);

      document.getElementById('prevMonth').disabled = (currentYear === minYear && currentMonth === minMonth);
      document.getElementById('nextMonth').disabled = (currentYear === maxYear && currentMonth === maxMonth);

      var days = daysInMonth(currentYear, currentMonth);
      var startDay = firstDayOfMonth(currentYear, currentMonth);

      var html = '<table class="cal-table"><thead><tr>';
      for (var i = 0; i < 7; i++) html += '<th>' + NL_DAYS[i] + '</th>';
      html += '</tr></thead><tbody><tr>';

      for (var i = 0; i < startDay; i++) html += '<td></td>';

      var cellCount = startDay;
      for (var day = 1; day <= days; day++) {{
        var dateStr = currentYear + '-' + pad(currentMonth + 1) + '-' + pad(day);
        var isPast = (currentYear < todayYear) || (currentYear === todayYear && currentMonth < todayMonth) || (currentYear === todayYear && currentMonth === todayMonth && day < todayDay);
        var isToday = (currentYear === todayYear && currentMonth === todayMonth && day === todayDay);
        var isAvailable = slotsByDay.hasOwnProperty(dateStr);
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

      while (cellCount % 7 !== 0) {{
        html += '<td></td>';
        cellCount++;
      }}

      html += '</tr></tbody></table>';
      document.getElementById('calendarContainer').innerHTML = html;

      // Event listeners voor beschikbare dagen
      document.querySelectorAll('.day-cell.available').forEach(function(td) {{
        td.addEventListener('click', function() {{
          selectedDate = this.getAttribute('data-date');
          selectedTime = null;
          renderCalendar();
          renderTimeSlots(selectedDate);
        }});
      }});
    }}

    function renderTimeSlots(dateStr) {{
      var times = slotsByDay[dateStr] || [];
      var picker = document.getElementById('timePicker');
      var grid = document.getElementById('timeGrid');
      var label = document.getElementById('timePickerLabel');

      if (!times.length) {{
        picker.classList.remove('visible');
        return;
      }}

      // Dag naam voor label
      var parts = dateStr.split('-');
      var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      var dayName = NL_WEEKDAYS_FULL[d.getDay()];
      label.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1) + ' ' + d.getDate() + ' ' + NL_MONTHS[d.getMonth()] + ':';

      var html = '';
      for (var i = 0; i < times.length; i++) {{
        var cls = 'time-slot';
        if (selectedTime === times[i]) cls += ' selected';
        html += '<div class="' + cls + '" data-time="' + times[i] + '">' + times[i] + '</div>';
      }}
      grid.innerHTML = html;
      picker.classList.add('visible');

      // Event listeners voor tijdslots
      document.querySelectorAll('.time-slot').forEach(function(el) {{
        el.addEventListener('click', function() {{
          selectedTime = this.getAttribute('data-time');
          renderTimeSlots(selectedDate);
          showConfirmation();
        }});
      }});

      // Verberg bevestiging als geen tijd gekozen
      if (!selectedTime) {{
        document.getElementById('confirmBox').classList.remove('visible');
      }}
    }}

    function showConfirmation() {{
      if (!selectedDate || !selectedTime) return;

      var parts = selectedDate.split('-');
      var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      var dayName = NL_WEEKDAYS_FULL[d.getDay()];
      var label = dayName + ' ' + d.getDate() + ' ' + NL_MONTHS[d.getMonth()] + ' om ' + selectedTime;

      document.getElementById('confirmDate').textContent = label.charAt(0).toUpperCase() + label.slice(1);
      document.getElementById('selectedDateInput').value = selectedDate;
      document.getElementById('selectedTimeInput').value = selectedTime;
      document.getElementById('confirmBox').classList.add('visible');
    }}

    document.getElementById('prevMonth').addEventListener('click', function() {{
      currentMonth--;
      if (currentMonth < 0) {{ currentMonth = 11; currentYear--; }}
      selectedDate = null;
      selectedTime = null;
      document.getElementById('timePicker').classList.remove('visible');
      document.getElementById('confirmBox').classList.remove('visible');
      renderCalendar();
    }});

    document.getElementById('nextMonth').addEventListener('click', function() {{
      currentMonth++;
      if (currentMonth > 11) {{ currentMonth = 0; currentYear++; }}
      selectedDate = null;
      selectedTime = null;
      document.getElementById('timePicker').classList.remove('visible');
      document.getElementById('confirmBox').classList.remove('visible');
      renderCalendar();
    }});

    renderCalendar();
    </script>
    </body></html>"""

    return HTMLResponse(html)


@router.post("/schedule")
async def schedule_submit(request: Request):
    form = await request.form()
    token = str(form.get("token") or "")
    selected_date = str(form.get("selected_date") or "")
    selected_time = str(form.get("selected_time") or "")

    if not token or not selected_date or not selected_time:
        return HTMLResponse(_error_page("Ongeldige request", "Er mist informatie."), status_code=400)

    lead = _fetch_lead(token)
    if not lead:
        return HTMLResponse(_error_page("Link niet gevonden", "Deze link is verlopen."), status_code=404)

    if lead.get("status") == "appointment_booked":
        return HTMLResponse(_error_page("Al ingepland", "Je afspraak staat al in de agenda!"))

    # Parse datum + tijd → 30-min slot
    try:
        date_parts = selected_date.split("-")
        time_parts = selected_time.split(":")
        local_start = datetime(int(date_parts[0]), int(date_parts[1]), int(date_parts[2]),
                               int(time_parts[0]), int(time_parts[1]), tzinfo=TZ)
        local_end = local_start + timedelta(minutes=30)
        start_utc = local_start.astimezone(timezone.utc)
        end_utc = local_end.astimezone(timezone.utc)
    except (ValueError, IndexError):
        return HTMLResponse(_error_page("Ongeldige datum", "Deze datum kon niet worden verwerkt."), status_code=400)

    naam = lead.get("naam") or "klant"
    config = get_branche(lead.get("demo_type")) if lead.get("demo_type") else None
    branche_label = config.label if config else "demo"

    # Google Calendar event aanmaken
    try:
        event_id = await create_event(
            start_utc=start_utc,
            end_utc=end_utc,
            summary=f"Frontlix kennismakingsgesprek met {naam} ({branche_label})",
            description=f"Kennismakingsgesprek van 30 minuten.\n\nKlant: {naam}\nEmail: {lead.get('email')}\nTelefoon: +{lead['telefoon']}\nBranche: {branche_label}",
            attendee_email=lead.get("email"),
        )
    except Exception as e:
        print(f"[schedule] Google Calendar create event failed: {e}")
        return HTMLResponse(_error_page("Inplannen mislukt", "Er ging iets mis. Probeer het opnieuw of neem contact op."), status_code=500)

    # Update lead
    collected = dict(lead.get("collected_data") or {})
    collected["_appointment_at"] = f"{selected_date}T{selected_time}"
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
        "content": f"(afspraak ingepland: {selected_date} om {selected_time}, 30 min)",
        "message_type": "text",
    }).execute()

    # WhatsApp bevestiging
    try:
        from services.whatsapp import send_text
        NL_MONTHS = ["", "januari", "februari", "maart", "april", "mei", "juni",
                     "juli", "augustus", "september", "oktober", "november", "december"]
        NL_WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
        dag_naam = NL_WEEKDAYS[local_start.weekday()]
        datum_str = f"{dag_naam} {local_start.day} {NL_MONTHS[local_start.month]} om {selected_time}"
        voornaam = naam.split()[0]
        await send_text(
            lead["telefoon"],
            f"Top {voornaam}! Je kennismakingsgesprek staat in de agenda voor {datum_str}. Je krijgt een Google Calendar uitnodiging in je mail. Tot dan!",
        )
    except Exception as e:
        print(f"[schedule] WhatsApp confirmation failed: {e}")

    # Success pagina
    NL_MONTHS = ["", "januari", "februari", "maart", "april", "mei", "juni",
                 "juli", "augustus", "september", "oktober", "november", "december"]
    NL_WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
    datum_label = f"{NL_WEEKDAYS[local_start.weekday()].capitalize()} {local_start.day} {NL_MONTHS[local_start.month]} {local_start.year} om {selected_time}"

    return HTMLResponse(_success_page(naam, datum_label))
