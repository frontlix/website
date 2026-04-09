"""Wijzigen route voor De Designmaker personalized demo.

GET  /personalized/edit?token=...  → bewerkbaar formulier
POST /personalized/edit            → opslaan + herberekenen of goedkeuren
"""
from __future__ import annotations

from datetime import datetime, timezone
from html import escape

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from services.supabase import get_supabase  # shared via lead-automation

from pd_pricing import get_designmaker_pricing
from pd_config import FIELDS_PER_DIENST
from pd_pdf import DIENST_LABELS

router = APIRouter()


# ── Veld definities per dienst (voor formulier rendering) ────────────────

FIELD_DEFS: dict[str, list[dict]] = {
    "carwrapping": [
        {"key": "voertuig", "label": "Voertuig (merk en model)", "type": "text"},
        {"key": "wrap_type", "label": "Type wrap", "type": "enum", "values": ["full wrap", "partial wrap", "kleurverandering"]},
        {"key": "kleur_afwerking", "label": "Kleur en afwerking", "type": "text"},
        {"key": "huidige_kleur", "label": "Huidige kleur", "type": "text"},
    ],
    "keuken_interieur": [
        {"key": "wat_wrappen", "label": "Wat moet gewrapt worden", "type": "enum", "values": ["keukendeurtjes", "kastdeuren", "meubels", "deuren", "anders"]},
        {"key": "aantal_vlakken", "label": "Aantal vlakken/deurtjes", "type": "text"},
        {"key": "gewenste_look", "label": "Gewenste uitstraling", "type": "enum", "values": ["houtlook eiken", "houtlook walnoot", "betonlook", "mat wit", "mat zwart", "antraciet", "anders"]},
        {"key": "huidige_staat", "label": "Huidige staat/materiaal", "type": "text"},
    ],
    "binnen_reclame": [
        {"key": "type_reclame", "label": "Type reclame", "type": "enum", "values": ["muurreclame", "raamfolie", "wandprint", "kantoorsigning"]},
        {"key": "locatie_pand", "label": "Type pand", "type": "enum", "values": ["kantoor", "winkel", "horeca", "showroom", "anders"]},
        {"key": "afmetingen", "label": "Afmetingen (m²)", "type": "text"},
        {"key": "huisstijl", "label": "Logo/huisstijl beschikbaar", "type": "enum", "values": ["ja", "nee", "gedeeltelijk"]},
    ],
    "signing": [
        {"key": "voertuig_type", "label": "Type voertuig(en)", "type": "enum", "values": ["personenauto", "bestelbus", "vrachtwagen", "gevel", "anders"]},
        {"key": "aantal", "label": "Aantal voertuigen", "type": "text"},
        {"key": "ontwerp_scope", "label": "Ontwerp scope", "type": "enum", "values": ["alleen logo", "tekst en logo", "full design", "bestaand ontwerp"]},
        {"key": "huisstijl", "label": "Logo/huisstijl beschikbaar", "type": "enum", "values": ["ja", "nee", "gedeeltelijk"]},
    ],
}


# ── JavaScript pricing per dienst ────────────────────────────────────────

def _get_pricing_js(type_dienst: str) -> str:
    if type_dienst == "carwrapping":
        return """
function calcPricing(a) {
  var wt = (a.wrap_type||'full wrap').toLowerCase();
  var prijs = 2500;
  var label = 'Full wrap';
  if (wt.indexOf('partial') >= 0) { prijs = 800; label = 'Partial wrap'; }
  else if (wt.indexOf('kleur') >= 0) { prijs = 1800; label = 'Kleurverandering'; }
  var lines = [{label:label, quantity:1, unit:'stuks', unitPrice:prijs, total:prijs}];
  var sub = prijs;
  var btw = Math.round(sub*0.21*100)/100;
  return {lines:lines, subtotaal:Math.round(sub*100)/100, btw:btw, totaal:Math.round((sub+btw)*100)/100};
}"""
    elif type_dienst == "keuken_interieur":
        return """
function calcPricing(a) {
  var n = Math.max(1, parseInt((a.aantal_vlakken||'1').replace(/[^0-9]/g,'')) || 1);
  var lines = [{label:'Interieurwrapping', quantity:n, unit:'vlakken', unitPrice:65, total:n*65}];
  var sub = n*65;
  var btw = Math.round(sub*0.21*100)/100;
  return {lines:lines, subtotaal:Math.round(sub*100)/100, btw:btw, totaal:Math.round((sub+btw)*100)/100};
}"""
    elif type_dienst == "binnen_reclame":
        return """
function calcPricing(a) {
  var type = (a.type_reclame||'muurreclame').toLowerCase();
  if (type === 'kantoorsigning') {
    var lines = [{label:'Kantoorsigning pakket', quantity:1, unit:'stuks', unitPrice:500, total:500}];
    var sub = 500;
  } else {
    var tarieven = {muurreclame:45, raamfolie:60, wandprint:55};
    var tarief = tarieven[type] || 45;
    var m2 = parseFloat((a.afmetingen||'5').replace(/[^0-9.,]/g,'').replace(',','.')) || 5;
    var lines = [{label:type.charAt(0).toUpperCase()+type.slice(1)+' applicatie', quantity:m2, unit:'m²', unitPrice:tarief, total:Math.round(m2*tarief*100)/100}];
    var sub = lines[0].total;
  }
  var btw = Math.round(sub*0.21*100)/100;
  return {lines:lines, subtotaal:Math.round(sub*100)/100, btw:btw, totaal:Math.round((sub+btw)*100)/100};
}"""
    elif type_dienst == "signing":
        return """
function calcPricing(a) {
  var scope = (a.ontwerp_scope||'tekst en logo').toLowerCase();
  var n = Math.max(1, parseInt((a.aantal||'1').replace(/[^0-9]/g,'')) || 1);
  var prijzen = {'alleen logo':350, 'tekst en logo':650, 'full design':1200, 'bestaand ontwerp':350};
  var prijs = prijzen[scope] || 650;
  var lines = [{label:'Belettering ('+scope+')', quantity:n, unit:'voertuigen', unitPrice:prijs, total:n*prijs}];
  var sub = n*prijs;
  if (n >= 3) { var korting = Math.round(sub*0.10*100)/100; lines.push({label:'Fleet korting (10%)', quantity:1, unit:'stuks', unitPrice:-korting, total:-korting}); sub -= korting; }
  var btw = Math.round(sub*0.21*100)/100;
  return {lines:lines, subtotaal:Math.round(sub*100)/100, btw:btw, totaal:Math.round((sub+btw)*100)/100};
}"""
    return "function calcPricing(a) { return {lines:[], subtotaal:0, btw:0, totaal:0}; }"


def _euro(n: float) -> str:
    return f"\u20AC {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _error_page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{escape(title)} — De Designmaker</title>
    <style>body{{font-family:sans-serif;background:#F0F2F5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
    h1{{font-size:22px;font-weight:700;margin-bottom:12px}}p{{font-size:15px;color:#555;line-height:1.6}}a{{color:#1A56FF;text-decoration:none}}</style>
    </head><body><div class="card"><h1>{escape(title)}</h1><p>{escape(message)}</p></div></body></html>"""


def _fetch_lead(token: str) -> dict | None:
    try:
        resp = get_supabase().table("leads").select("*").eq("approval_token", token).eq("demo_type", "personalized").limit(1).execute()
        return (resp.data or [None])[0]
    except Exception:
        return None


def _render_edit_form(lead: dict, type_dienst: str, flag: str | None = None, previous_total: float | None = None) -> str:
    collected = dict(lead.get("collected_data") or {})
    field_defs = FIELD_DEFS.get(type_dienst, [])
    branche_label = DIENST_LABELS.get(type_dienst, "Wrapping")

    # Render field inputs
    field_inputs = []
    for f in field_defs:
        current = str(collected.get(f["key"]) or "")
        input_name = f"field_{f['key']}"
        label_text = f["label"]

        if f["type"] == "enum" and f.get("values"):
            options = '<option value="">— kies —</option>'
            for v in f["values"]:
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

    # Pricing berekenen
    pricing_answers = {k: str(v) for k, v in collected.items() if isinstance(v, (str, int, float))}
    pricing = get_designmaker_pricing(type_dienst, pricing_answers)

    price_rows = "".join(
        f'<tr><td>{escape(l.label)}</td><td>{l.quantity:.0f} {escape(l.unit or "")}</td>'
        f'<td style="text-align:right">{_euro(l.unit_price or 0)}</td>'
        f'<td style="text-align:right">{_euro(l.total)}</td></tr>'
        for l in pricing.lines
    )

    banner = ""
    if flag == "recalculated":
        diff = ""
        if previous_total is not None and abs(previous_total - pricing.totaal_incl_btw) > 0.005:
            diff = f" De prijs is bijgewerkt van <strong>{_euro(previous_total)}</strong> naar <strong>{_euro(pricing.totaal_incl_btw)}</strong>."
        else:
            diff = " De prijs is ongewijzigd gebleven."
        banner = f'<div class="banner">✓ Wijzigingen opgeslagen.{diff}</div>'

    # Korting waarden
    korting_percentage = str(collected.get("_korting_percentage") or "")
    korting_notitie = str(collected.get("_korting_notitie") or "")

    safe_name = escape(lead.get("naam") or "")
    safe_email = escape(lead.get("email") or "")
    safe_token = escape(lead.get("approval_token") or "")

    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offerte wijzigen — {escape(branche_label)}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: #F0F2F5; color: #1A1A1A; padding: 40px 20px; line-height: 1.5; }}
    .container {{ max-width: 720px; margin: 0 auto; }}
    .header {{ background: #1A1A1A; color: white; padding: 32px 40px; border-radius: 16px 16px 0 0; text-align: center; }}
    .header h1 {{ font-size: 22px; font-weight: 700; }}
    .header p {{ font-size: 14px; opacity: 0.9; margin-top: 6px; }}
    .card {{ background: white; padding: 32px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }}
    .banner {{ background: #DCFCE7; color: #166534; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-bottom: 24px; border: 1px solid #BBF7D0; }}
    h2 {{ font-size: 16px; font-weight: 700; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #F0F2F5; }}
    h2:first-of-type {{ margin-top: 0; }}
    .field {{ margin-bottom: 14px; }}
    .field label {{ display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }}
    .field input, .field select {{ width: 100%; padding: 10px 12px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 15px; font-family: inherit; color: #1A1A1A; background: #FAFBFC; }}
    .field input:focus, .field select:focus {{ outline: none; border-color: #1A1A1A; background: white; }}
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
      <p>{escape(branche_label)} — {escape(lead.get('naam') or 'klant')}</p>
    </div>
    <div class="card">
      {banner}

      <form method="POST" action="/personalized/edit">
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

        <h2>Korting</h2>
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px">
          <div class="field">
            <label for="korting_percentage">Korting percentage (%)</label>
            <input type="number" id="korting_percentage" name="korting_percentage" value="{escape(korting_percentage)}" min="0" max="100" step="1" placeholder="bijv. 10" />
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="korting_notitie">Notitie bij korting</label>
            <textarea id="korting_notitie" name="korting_notitie" rows="3" style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:15px;font-family:inherit;color:#1A1A1A;background:#FAFBFC;resize:vertical" placeholder="bijv. Kennismakingskorting eerste project">{escape(korting_notitie)}</textarea>
          </div>
        </div>

        <div class="actions">
          <button type="submit" name="action" value="approve" class="btn-approve">Goedkeuren</button>
        </div>
      </form>

      <p class="footer">Wijzigingen worden direct opgeslagen. Bij goedkeuren wordt de offerte automatisch naar de klant verzonden.</p>
    </div>
  </div>

  <script>
  {_get_pricing_js(type_dienst)}

  function euro(n) {{
    return '\u20AC ' + n.toFixed(2).replace('.', ',');
  }}

  function recalc() {{
    var answers = {{}};
    document.querySelectorAll('[id^="field_"]').forEach(function(el) {{
      answers[el.id.replace('field_', '')] = el.value.trim();
    }});

    var result = calcPricing(answers);

    // Korting toepassen
    var kortingPct = parseFloat(document.getElementById('korting_percentage').value) || 0;
    if (kortingPct > 0 && kortingPct <= 100) {{
      var kortingBedrag = Math.round(result.subtotaal * (kortingPct / 100) * 100) / 100;
      result.lines.push({{label: 'Korting (' + kortingPct + '%)', quantity: 1, unit: '', unitPrice: -kortingBedrag, total: -kortingBedrag}});
      result.subtotaal = Math.round((result.subtotaal - kortingBedrag) * 100) / 100;
      result.btw = Math.round(result.subtotaal * 0.21 * 100) / 100;
      result.totaal = Math.round((result.subtotaal + result.btw) * 100) / 100;
    }}

    var tbody = document.querySelector('table.pricing tbody');
    tbody.innerHTML = result.lines.map(function(l) {{
      return '<tr><td>' + l.label + '</td>' +
        '<td>' + (l.quantity || 0).toFixed(0) + ' ' + (l.unit || '') + '</td>' +
        '<td style="text-align:right">' + euro(l.unitPrice || 0) + '</td>' +
        '<td style="text-align:right">' + euro(l.total) + '</td></tr>';
    }}).join('');

    var rows = document.querySelectorAll('.totals .row span:last-child');
    rows[0].textContent = euro(result.subtotaal);
    rows[1].textContent = euro(result.btw);
    rows[2].textContent = euro(result.totaal);
  }}

  document.querySelectorAll('[id^="field_"]').forEach(function(el) {{
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  }});
  document.getElementById('korting_percentage').addEventListener('input', recalc);
  </script>
</body>
</html>"""


@router.get("/personalized/edit")
async def edit_form(request: Request):
    token = request.query_params.get("token")
    if not token:
        return HTMLResponse(_error_page("Ongeldige link", "Deze link werkt niet meer."), status_code=400)

    lead = _fetch_lead(token)
    if not lead:
        return HTMLResponse(_error_page("Link werkt niet meer", "Deze edit-link is verlopen."), status_code=404)

    collected = dict(lead.get("collected_data") or {})
    type_dienst = collected.get("type_dienst", "carwrapping")

    status = lead.get("status", "")
    if status in ("quote_sent", "scheduling", "appointment_booked"):
        return HTMLResponse(_error_page("Al verzonden", "Deze offerte is al goedgekeurd en verzonden."))
    if status == "quote_processing":
        return HTMLResponse(_error_page("Even geduld", "De offerte wordt op dit moment verwerkt."))

    return HTMLResponse(_render_edit_form(lead, type_dienst))


@router.post("/personalized/edit")
async def edit_submit(request: Request):
    form = await request.form()
    token = str(form.get("token") or "")
    action = str(form.get("action") or "")

    if not token:
        return HTMLResponse(_error_page("Ongeldige request", "Deze actie kon niet worden verwerkt."), status_code=400)

    lead = _fetch_lead(token)
    if not lead:
        return HTMLResponse(_error_page("Link werkt niet meer", "Deze edit-link is verlopen."), status_code=404)

    collected = dict(lead.get("collected_data") or {})
    type_dienst = collected.get("type_dienst", "carwrapping")
    field_defs = FIELD_DEFS.get(type_dienst, [])

    # Extract form values
    new_naam = (str(form.get("naam") or "")).strip() or lead.get("naam")
    new_email = (str(form.get("email") or "")).strip() or lead.get("email")

    new_collected = dict(collected)
    for f in field_defs:
        v = form.get(f"field_{f['key']}")
        if isinstance(v, str) and v.strip():
            new_collected[f["key"]] = v.strip()

    # Korting velden opslaan
    korting_pct = (str(form.get("korting_percentage") or "")).strip()
    korting_note = (str(form.get("korting_notitie") or "")).strip()
    if korting_pct:
        new_collected["_korting_percentage"] = korting_pct
    elif "_korting_percentage" in new_collected:
        del new_collected["_korting_percentage"]
    if korting_note:
        new_collected["_korting_notitie"] = korting_note
    elif "_korting_notitie" in new_collected:
        del new_collected["_korting_notitie"]

    # Oude totaal voor diff
    old_answers = {k: str(v) for k, v in collected.items() if isinstance(v, (str, int, float))}
    previous_total = get_designmaker_pricing(type_dienst, old_answers).totaal_incl_btw

    # Opslaan
    get_supabase().table("leads").update({
        "naam": new_naam,
        "email": new_email,
        "collected_data": new_collected,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", lead["id"]).execute()

    if action == "approve":
        return RedirectResponse(url=f"/personalized/approve?token={token}", status_code=303)

    updated_lead = {**lead, "naam": new_naam, "email": new_email, "collected_data": new_collected}
    return HTMLResponse(_render_edit_form(updated_lead, type_dienst, "recalculated", previous_total))
