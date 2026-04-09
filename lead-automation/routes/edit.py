"""Edit route — modify quote details before approval.

GET  /edit?token=...            → render edit form HTML
POST /edit (action=recalculate) → save new values + re-render with updated price
POST /edit (action=approve)     → save new values + redirect to /approve
"""
from __future__ import annotations

from html import escape
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from services.supabase import get_supabase
from branches import get_branche, get_pricing
from config import get_settings

router = APIRouter()


def _get_pricing_js(branche_id: str) -> str:
    """Return JavaScript pricing function for live recalculation per branche."""
    if branche_id == "zonnepanelen":
        return """
function calcPricing(a) {
  var kWh = parseFloat((a.jaarverbruik||'4000').replace(/[^0-9.,]/g,'').replace(/\\./g,'').replace(',','.')) || 4000;
  var panels = Math.max(1, Math.ceil(kWh / 380));
  var lines = [
    {label:'Zonnepanelen levering', quantity:panels, unit:'stuks', unitPrice:175, total:panels*175},
    {label:'Montage en installatie', quantity:panels, unit:'stuks', unitPrice:40, total:panels*40},
    {label:'Omvormer levering en installatie', quantity:1, unit:'stuks', unitPrice:1100, total:1100}
  ];
  if ((a.daktype||'').toLowerCase()==='schuin') lines.push({label:'Steiger plaatsen en verwijderen',quantity:1,unit:'stuks',unitPrice:450,total:450});
  if ((a.dakmateriaal||'').toLowerCase()==='riet') lines.push({label:'Toeslag rietdak montage',quantity:1,unit:'stuks',unitPrice:3300,total:3300});
  var sub = lines.reduce(function(s,l){return s+l.total},0);
  var btw = Math.round(sub*0.21*100)/100;
  return {lines:lines, subtotaal:Math.round(sub*100)/100, btw:btw, totaal:Math.round((sub+btw)*100)/100};
}"""
    elif branche_id == "dakdekker":
        return """
function calcPricing(a) {
  var m2 = parseFloat((a.dakoppervlakte||'50').replace(/[^0-9.,]/g,'').replace(/\\./g,'').replace(',','.')) || 50;
  var type = (a.type_werk||'repareren').toLowerCase();
  var tarieven = {vervangen:120, repareren:60, isoleren:90};
  var tarief = tarieven[type] || 80;
  var lines = [{label:'Dakwerk: '+type, quantity:m2, unit:'m²', unitPrice:tarief, total:Math.round(m2*tarief*100)/100}];
  if ((a.isolatie||'').toLowerCase()==='ja' && type!=='isoleren') lines.push({label:'Isolatiepakket (PIR-platen + dampscherm)',quantity:1,unit:'pakket',unitPrice:1500,total:1500});
  var sub = lines.reduce(function(s,l){return s+l.total},0);
  if ((a.spoed||'').toLowerCase()==='ja') { var sp=Math.round(sub*0.25*100)/100; lines.push({label:'Spoedtoeslag (binnen 5 werkdagen)',quantity:1,unit:'stuks',unitPrice:sp,total:sp}); sub+=sp; }
  var btw = Math.round(sub*0.21*100)/100;
  return {lines:lines, subtotaal:Math.round(sub*100)/100, btw:btw, totaal:Math.round((sub+btw)*100)/100};
}"""
    elif branche_id == "schoonmaak":
        return """
function calcPricing(a) {
  var m2 = parseFloat((a.oppervlakte||'80').replace(/[^0-9.,]/g,'').replace(/\\./g,'').replace(',','.')) || 80;
  var freq = (a.frequentie||'eenmalig').toLowerCase();
  var tarieven = {eenmalig:1.2, wekelijks:0.8, '2-wekelijks':0.95, maandelijks:1.1};
  var tarief = tarieven[freq] || 1.0;
  var lines = [{label:'Schoonmaak '+freq+' (per beurt)', quantity:m2, unit:'m²', unitPrice:tarief, total:Math.round(m2*tarief*100)/100}];
  if ((a.ramen||'').toLowerCase()==='ja') lines.push({label:'Ramen meenemen',quantity:m2,unit:'m²',unitPrice:0.5,total:Math.round(m2*0.5*100)/100});
  var sub = lines.reduce(function(s,l){return s+l.total},0);
  var btw = Math.round(sub*0.21*100)/100;
  return {lines:lines, subtotaal:Math.round(sub*100)/100, btw:btw, totaal:Math.round((sub+btw)*100)/100};
}"""
    return "function calcPricing(a) { return {lines:[], subtotaal:0, btw:0, totaal:0}; }"


def _euro(n: float) -> str:
    return f"\u20AC {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _error_page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{escape(title)} - Frontlix</title>
    <style>body{{font-family:sans-serif;background:#F0F2F5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
    h1{{font-size:22px;font-weight:700;margin-bottom:12px}}p{{font-size:15px;color:#555;line-height:1.6}}a{{color:#1A56FF;text-decoration:none}}</style>
    </head><body><div class="card"><h1>{escape(title)}</h1><p>{escape(message)}</p>
    <p style="margin-top:24px"><a href="https://frontlix.com">Terug naar Frontlix</a></p></div></body></html>"""


def _fetch_lead(token: str) -> dict | None:
    try:
        resp = get_supabase().table("leads").select("*").eq("approval_token", token).limit(1).execute()
        return (resp.data or [None])[0]
    except Exception:
        return None


def _render_edit_form(lead: dict, config, flag: str | None = None, previous_total: float | None = None) -> str:
    collected = dict(lead.get("collected_data") or {})

    # Build field inputs
    field_inputs = []
    for f in config.fields:
        current = str(collected.get(f.key) or "")
        input_name = f"field_{f.key}"
        label_text = f"{f.label[0].upper()}{f.label[1:]}"
        if f.unit:
            label_text += f" ({f.unit})"

        if f.type == "enum" and f.enum_values:
            options = '<option value="">— kies —</option>'
            for v in f.enum_values:
                selected = " selected" if v.lower() == current.lower() else ""
                options += f'<option value="{escape(v)}"{selected}>{escape(v)}</option>'
            field_inputs.append(f"""
            <div class="field">
              <label for="{input_name}">{escape(label_text)}</label>
              <select id="{input_name}" name="{input_name}">{options}</select>
            </div>""")
        else:
            field_inputs.append(f"""
            <div class="field">
              <label for="{input_name}">{escape(label_text)}</label>
              <input type="text" id="{input_name}" name="{input_name}" value="{escape(current)}" />
            </div>""")

    field_inputs_html = "".join(field_inputs)

    # Calculate pricing
    pricing_answers = {k: str(v) for k, v in collected.items() if isinstance(v, (str, int, float))}
    pricing = get_pricing(config.id, pricing_answers)

    price_rows = "".join(
        f'<tr><td>{escape(l.label)}</td><td>{l.quantity:.0f} {escape(l.unit or "")}</td>'
        f'<td style="text-align:right">{_euro(l.unit_price or 0)}</td>'
        f'<td style="text-align:right">{_euro(l.total)}</td></tr>'
        for l in pricing.lines
    )

    # Recalculated banner
    banner = ""
    if flag == "recalculated":
        diff = ""
        if previous_total is not None and abs(previous_total - pricing.totaal_incl_btw) > 0.005:
            diff = f" De prijs is bijgewerkt van <strong>{_euro(previous_total)}</strong> naar <strong>{_euro(pricing.totaal_incl_btw)}</strong>."
        else:
            diff = " De prijs is ongewijzigd gebleven."
        banner = f'<div class="banner">✓ Wijzigingen opgeslagen.{diff}</div>'

    safe_name = escape(lead.get("naam") or "")
    safe_email = escape(lead.get("email") or "")
    safe_token = escape(lead.get("approval_token") or "")

    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offerte wijzigen — {escape(config.label)}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: #F0F2F5; color: #1A1A1A; padding: 40px 20px; line-height: 1.5; }}
    .container {{ max-width: 720px; margin: 0 auto; }}
    .header {{ background: linear-gradient(135deg, #1A56FF, #00CFFF); color: white; padding: 32px 40px; border-radius: 16px 16px 0 0; text-align: center; }}
    .header h1 {{ font-size: 22px; font-weight: 700; }}
    .header p {{ font-size: 14px; opacity: 0.9; margin-top: 6px; }}
    .card {{ background: white; padding: 32px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }}
    .banner {{ background: #DCFCE7; color: #166534; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-bottom: 24px; border: 1px solid #BBF7D0; }}
    h2 {{ font-size: 16px; font-weight: 700; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #F0F2F5; }}
    h2:first-of-type {{ margin-top: 0; }}
    .field {{ margin-bottom: 14px; }}
    .field label {{ display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }}
    .field input, .field select {{ width: 100%; padding: 10px 12px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 15px; font-family: inherit; color: #1A1A1A; background: #FAFBFC; }}
    .field input:focus, .field select:focus {{ outline: none; border-color: #1A56FF; background: white; }}
    table.pricing {{ width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 14px; }}
    table.pricing thead th {{ text-align: left; padding: 8px 10px; background: #F5F7FA; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: #555; font-weight: 700; }}
    table.pricing thead th:nth-child(2), table.pricing thead th:nth-child(3), table.pricing thead th:nth-child(4) {{ text-align: right; }}
    table.pricing tbody td {{ padding: 10px; border-bottom: 1px solid #F0F2F5; }}
    .totals {{ margin-top: 16px; padding: 16px 20px; background: #F5F7FA; border-radius: 12px; }}
    .totals .row {{ display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: #555; }}
    .totals .row.grand {{ margin-top: 8px; padding-top: 12px; border-top: 2px solid #E5E7EB; font-size: 18px; font-weight: 700; color: #1A1A1A; }}
    .actions {{ display: flex; gap: 12px; margin-top: 32px; }}
    .actions button {{ flex: 1; padding: 16px 24px; font-size: 15px; font-weight: 700; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; }}
    .btn-approve {{ background: #16a34a; color: white; }}
    .btn-approve:hover {{ background: #15803d; }}
    .footer {{ text-align: center; margin-top: 24px; font-size: 12px; color: #888; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Offerte wijzigen</h1>
      <p>{escape(config.label)} — {escape(lead.get('naam') or 'klant')}</p>
    </div>
    <div class="card">
      {banner}

      <form method="POST" action="/edit">
        <input type="hidden" name="token" value="{safe_token}" />

        <h2>Klantgegevens</h2>
        <div class="field">
          <label for="naam">Naam</label>
          <input type="text" id="naam" name="naam" value="{safe_name}" />
        </div>
        <div class="field">
          <label for="email">E-mailadres</label>
          <input type="email" id="email" name="email" value="{safe_email}" />
        </div>

        <h2>Aanvraag details</h2>
        {field_inputs_html}

        <h2>Huidige prijsopbouw</h2>
        <table class="pricing">
          <thead><tr><th>Omschrijving</th><th>Aantal</th><th>Per stuk</th><th>Totaal</th></tr></thead>
          <tbody>{price_rows}</tbody>
        </table>

        <div class="totals">
          <div class="row"><span>Subtotaal excl. BTW</span><span>{_euro(pricing.subtotaal_excl_btw)}</span></div>
          <div class="row"><span>BTW (21%)</span><span>{_euro(pricing.btw_bedrag)}</span></div>
          <div class="row grand"><span>Totaal incl. BTW</span><span>{_euro(pricing.totaal_incl_btw)}</span></div>
        </div>

        <div class="actions">
          <button type="submit" name="action" value="approve" class="btn-approve">Goedkeuren</button>
        </div>
      </form>

      <p class="footer">Wijzigingen worden direct opgeslagen. Bij goedkeuren wordt de PDF automatisch naar de klant verzonden.</p>
    </div>
  </div>

  <script>
  {_get_pricing_js(config.id)}

  function euro(n) {{
    return '€ ' + n.toFixed(2).replace('.', ',');
  }}

  function getVal(key) {{
    const el = document.getElementById('field_' + key);
    return el ? el.value.trim() : '';
  }}

  function recalc() {{
    const answers = {{}};
    document.querySelectorAll('[id^="field_"]').forEach(el => {{
      answers[el.id.replace('field_', '')] = el.value.trim();
    }});

    const result = calcPricing(answers);

    // Update table
    const tbody = document.querySelector('table.pricing tbody');
    tbody.innerHTML = result.lines.map(l =>
      '<tr><td>' + l.label + '</td>' +
      '<td>' + (l.quantity || 0).toFixed(0) + ' ' + (l.unit || '') + '</td>' +
      '<td style="text-align:right">' + euro(l.unitPrice || 0) + '</td>' +
      '<td style="text-align:right">' + euro(l.total) + '</td></tr>'
    ).join('');

    // Update totals
    const rows = document.querySelectorAll('.totals .row span:last-child');
    rows[0].textContent = euro(result.subtotaal);
    rows[1].textContent = euro(result.btw);
    rows[2].textContent = euro(result.totaal);
  }}

  // Listen to all form changes
  document.querySelectorAll('[id^="field_"]').forEach(el => {{
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  }});
  </script>
</body>
</html>"""


@router.get("/edit")
async def edit_form(request: Request):
    token = request.query_params.get("token")
    if not token:
        return HTMLResponse(_error_page("Ongeldige link", "Deze link werkt niet meer."), status_code=400)

    lead = _fetch_lead(token)
    if not lead:
        return HTMLResponse(_error_page("Link werkt niet meer", "Deze edit-link is verlopen."), status_code=404)

    demo_type = lead.get("demo_type")
    if not demo_type:
        return HTMLResponse(_error_page("Onvolledige lead", "Deze offerte mist een branche-keuze."), status_code=400)

    config = get_branche(demo_type)
    if not config:
        return HTMLResponse(_error_page("Onbekende branche", f'Branche "{demo_type}" is niet bekend.'), status_code=400)

    status = lead.get("status", "")
    if status in ("quote_sent", "scheduling", "appointment_booked"):
        return HTMLResponse(_error_page("Al verzonden", "Deze offerte is al goedgekeurd en verzonden. Wijzigingen zijn niet meer mogelijk."))
    if status == "quote_processing":
        return HTMLResponse(_error_page("Even geduld", "De offerte wordt op dit moment verwerkt."))

    return HTMLResponse(_render_edit_form(lead, config))


@router.post("/edit")
async def edit_submit(request: Request):
    form = await request.form()
    token = str(form.get("token") or "")
    action = str(form.get("action") or "")

    if not token:
        return HTMLResponse(_error_page("Ongeldige request", "Deze actie kon niet worden verwerkt."), status_code=400)

    lead = _fetch_lead(token)
    if not lead:
        return HTMLResponse(_error_page("Link werkt niet meer", "Deze edit-link is verlopen."), status_code=404)

    demo_type = lead.get("demo_type")
    if not demo_type:
        return HTMLResponse(_error_page("Onvolledige lead", "Deze offerte mist een branche-keuze."), status_code=400)

    config = get_branche(demo_type)
    if not config:
        return HTMLResponse(_error_page("Onbekende branche", f'Branche "{demo_type}" is niet bekend.'), status_code=400)

    # Extract form values
    new_naam = (str(form.get("naam") or "")).strip() or lead.get("naam")
    new_email = (str(form.get("email") or "")).strip() or lead.get("email")

    new_collected = dict(lead.get("collected_data") or {})
    for f in config.fields:
        v = form.get(f"field_{f.key}")
        if isinstance(v, str) and v.strip():
            new_collected[f.key] = v.strip()

    # Calculate old total for diff display
    old_answers = {k: str(v) for k, v in (lead.get("collected_data") or {}).items() if isinstance(v, (str, int, float))}
    previous_total = get_pricing(demo_type, old_answers).totaal_incl_btw

    # Save to DB
    get_supabase().table("leads").update({
        "naam": new_naam,
        "email": new_email,
        "collected_data": new_collected,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", lead["id"]).execute()

    # Approve → redirect to approve route
    if action == "approve":
        return RedirectResponse(url=f"/approve?token={token}", status_code=303)

    # Recalculate → re-render form with updated pricing
    updated_lead = {**lead, "naam": new_naam, "email": new_email, "collected_data": new_collected}
    return HTMLResponse(_render_edit_form(updated_lead, config, "recalculated", previous_total))
