"""Edit route, modify quote details before approval.

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
from services.pdf import _logo_data_uri  # reuse base64-embedded Frontlix logo
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
    """Format als '€ 1.234,56'. Tussen € en bedrag een non-breaking space (\\u00A0)
    zodat het teken nooit los van het bedrag op een nieuwe regel komt."""
    sign = "-" if n < 0 else ""
    n = abs(n)
    return f"{sign}€ {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _error_page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{escape(title)} - Frontlix</title>
    <style>body{{font-family:-apple-system,sans-serif;background:#F0F2F5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
    h1{{font-size:22px;font-weight:700;margin-bottom:12px;color:#0F1729}}p{{font-size:15px;color:#475569;line-height:1.6}}a{{color:#1A56FF;text-decoration:none}}</style>
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

    # Build field inputs (rendered in 2-col grid)
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
        f'<tr><td class="lbl">{escape(l.label)}</td>'
        f'<td class="num">{l.quantity:.0f}{(" " + escape(l.unit)) if l.unit else ""}</td>'
        f'<td class="num">{_euro(l.unit_price or 0)}</td>'
        f'<td class="amount">{_euro(l.total)}</td></tr>'
        for l in pricing.lines
    )

    # Recalculated banner
    banner = ""
    if flag == "recalculated":
        if previous_total is not None and abs(previous_total - pricing.totaal_incl_btw) > 0.005:
            diff = f"De prijs is bijgewerkt van <strong>{_euro(previous_total)}</strong> naar <strong>{_euro(pricing.totaal_incl_btw)}</strong>."
        else:
            diff = "De prijs is ongewijzigd gebleven."
        banner = (
            '<div class="banner">'
            '<span class="banner-icon">&#10003;</span>'
            f'<span class="banner-text"><strong>Wijzigingen opgeslagen.</strong> {diff}</span>'
            '</div>'
        )

    safe_name = escape(lead.get("naam") or "")
    safe_email = escape(lead.get("email") or "")
    safe_token = escape(lead.get("approval_token") or "")
    ref = (safe_token[:8] or "—").upper()
    today = datetime.now().strftime("%d-%m-%Y")
    logo = _logo_data_uri()
    branche_label_lc = config.label.lower()

    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offerte wijzigen, {escape(config.label)}</title>
  <style>
    :root {{
      --c-bg:        #F0F2F5;
      --c-surface:   #F9FAFB;
      --c-surface-2: #F3F4F6;
      --c-primary:   #1A56FF;
      --c-accent:    #00CFFF;
      --c-text:      #0F1729;
      --c-text-mute: #475569;
      --c-text-soft: #94A3B8;
      --c-border:    #E5E7EB;
      --c-border-2:  #F0F2F5;
      --c-success:   #22C55E;
      --c-warn:      #F59E0B;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
      background: var(--c-bg);
      color: var(--c-text);
      padding: 24px 16px 60px 16px;
      line-height: 1.5;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }}
    .container {{ max-width: 1080px; margin: 0 auto; }}

    /* ── Header card ──────────────────────────────────────── */
    .top-bar {{
      height: 6px;
      background: linear-gradient(90deg, #1A56FF 0%, #00CFFF 100%);
      border-radius: 14px 14px 0 0;
    }}
    .header {{
      background: #FFFFFF;
      border-radius: 0 0 14px 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
      padding: 22px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 22px;
      flex-wrap: wrap;
    }}
    .header-left {{ display: flex; align-items: center; gap: 16px; min-width: 0; }}
    .header-logo {{ height: 40px; width: auto; display: block; flex-shrink: 0; }}
    .header-title .eyebrow {{
      text-transform: uppercase; letter-spacing: 1.4px; font-size: 10.5px;
      font-weight: 700; color: var(--c-primary); margin-bottom: 4px;
    }}
    .header-title h1 {{
      font-size: 20px; font-weight: 800; color: var(--c-text); letter-spacing: -0.4px;
    }}
    .header-title h1 .muted {{ color: var(--c-text-mute); font-weight: 600; font-size: 16px; }}
    .header-meta {{
      display: flex; gap: 28px; font-size: 12.5px; color: var(--c-text-mute);
    }}
    .header-meta .k {{ text-transform: uppercase; letter-spacing: 0.8px; font-size: 10px; color: var(--c-text-soft); font-weight: 700; margin-bottom: 2px; }}
    .header-meta .v {{ color: var(--c-text); font-weight: 600; font-size: 13px; }}

    .brand-front {{ color: #0F1729; font-weight: 700; }}
    .brand-lix   {{ color: #00CFFF; font-weight: 700; }}

    /* ── Banner ───────────────────────────────────────────── */
    .banner {{
      background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46;
      padding: 14px 18px; border-radius: 12px; font-size: 14px;
      margin-bottom: 22px; display: flex; align-items: flex-start; gap: 12px;
    }}
    .banner-icon {{
      background: var(--c-success); color: #fff; width: 22px; height: 22px;
      border-radius: 50%; display: inline-flex; align-items: center;
      justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0;
    }}
    .banner-text strong {{ color: var(--c-text); }}

    /* ── Two-column grid ───────────────────────────────────── */
    .grid {{
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(360px, 1fr);
      gap: 22px;
      align-items: start;
    }}
    @media (max-width: 900px) {{
      .grid {{ grid-template-columns: 1fr; }}
      .sidebar {{ position: static !important; }}
    }}

    /* ── Card ──────────────────────────────────────────────── */
    .card {{
      background: #FFFFFF;
      border-radius: 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      padding: 22px 26px;
      margin-bottom: 18px;
    }}
    .card-eyebrow {{
      text-transform: uppercase; letter-spacing: 1.4px;
      font-size: 10.5px; font-weight: 700; color: var(--c-text-soft);
      margin-bottom: 4px;
    }}
    .card-title {{
      font-size: 15.5px; font-weight: 800; color: var(--c-text);
      letter-spacing: -0.2px; margin-bottom: 18px; padding-bottom: 12px;
      border-bottom: 1px solid var(--c-border-2);
    }}

    /* ── Form fields ──────────────────────────────────────── */
    .field-grid {{
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px;
    }}
    .field-grid .field.span-2 {{ grid-column: 1 / -1; }}
    @media (max-width: 600px) {{ .field-grid {{ grid-template-columns: 1fr; }} }}

    .field {{ margin-bottom: 0; }}
    .field label {{
      display: block; font-size: 10.5px; font-weight: 700;
      color: var(--c-text-soft); margin-bottom: 6px;
      text-transform: uppercase; letter-spacing: 0.8px;
    }}
    .field input, .field select, .field textarea {{
      width: 100%; padding: 11px 13px; border: 1px solid var(--c-border);
      border-radius: 9px; font-size: 14.5px; font-family: inherit;
      color: var(--c-text); background: var(--c-surface);
      transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }}
    .field input:focus, .field select:focus, .field textarea:focus {{
      outline: none; border-color: var(--c-primary); background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(26, 86, 255, 0.12);
    }}
    .field select {{
      appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='%2394A3B8' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>");
      background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px;
    }}
    .field textarea {{ resize: vertical; min-height: 70px; }}

    /* Korting card, subtle amber tint */
    .card.korting {{
      background: linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%);
      border: 1px solid #FDE68A;
    }}
    .card.korting .card-title {{ color: #92400E; border-bottom-color: #FDE68A; }}
    .card.korting .card-eyebrow {{ color: var(--c-warn); }}

    /* ── Sidebar (sticky pricing) ───────────────────────────── */
    .sidebar {{ position: sticky; top: 18px; }}
    .price-table {{
      width: 100%; border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 14px;
    }}
    .price-table thead th {{
      background: var(--c-primary); color: #fff;
      text-align: left; padding: 9px 12px; font-size: 10.5px;
      text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;
    }}
    .price-table thead th:first-child {{ border-radius: 8px 0 0 0; }}
    .price-table thead th:last-child  {{ border-radius: 0 8px 0 0; text-align: right; }}
    .price-table thead th.num {{ text-align: right; white-space: nowrap; }}
    .price-table tbody td {{
      padding: 9px 12px; border-bottom: 1px solid var(--c-border-2);
      color: var(--c-text);
    }}
    .price-table tbody tr:nth-child(even) td {{ background: var(--c-surface); }}
    /* nowrap zorgt dat '€ 12.000,00' nooit splitst tussen € en bedrag */
    .price-table td.num {{ text-align: right; font-variant-numeric: tabular-nums; color: var(--c-text-mute); white-space: nowrap; }}
    .price-table td.amount {{ text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }}
    .price-table td.lbl {{ font-weight: 500; }}

    .totals {{
      border-radius: 10px; overflow: hidden;
      border: 1px solid var(--c-border);
      margin-bottom: 18px;
    }}
    .totals .row {{
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 20px; font-size: 13.5px; gap: 14px;
    }}
    .totals .row.subtotal {{ background: var(--c-surface); color: var(--c-text-mute); }}
    .totals .row.btw      {{ background: var(--c-surface); color: var(--c-text-mute); border-top: 1px solid var(--c-border-2); }}
    .totals .row.grand {{
      background: linear-gradient(135deg, #1A56FF 0%, #00CFFF 100%);
      color: #fff; padding: 14px 22px; font-size: 16px; font-weight: 700;
      letter-spacing: -0.2px;
    }}
    .totals .row .v {{ font-variant-numeric: tabular-nums; font-weight: 700; color: var(--c-text); }}
    .totals .row.grand .v {{ color: #fff; }}

    .actions {{ display: flex; flex-direction: column; gap: 10px; }}
    .btn {{
      display: inline-flex; align-items: center; justify-content: center;
      gap: 10px; padding: 14px 22px; font-size: 15px; font-weight: 700;
      border-radius: 14px; border: none; cursor: pointer; font-family: inherit;
      letter-spacing: -0.1px; text-decoration: none;
      transition: filter 120ms ease, transform 60ms ease;
    }}
    .btn:active {{ transform: translateY(1px); }}
    .btn-primary {{ background: var(--c-success); color: #fff; }}
    .btn-primary:hover {{ filter: brightness(1.05); }}
    .btn .ico {{ font-size: 16px; }}

    .helper {{
      text-align: center; margin-top: 12px; font-size: 11.5px;
      color: var(--c-text-soft); line-height: 1.55;
    }}

    .powered {{
      text-align: center; margin-top: 28px;
      font-size: 11.5px; color: var(--c-text-soft); letter-spacing: 0.3px;
    }}

    /* ── Mobile (<= 600px) ─────────────────────────────────── */
    @media (max-width: 600px) {{
      body {{ padding: 14px 10px 32px 10px; }}
      .header {{
        flex-direction: column; align-items: flex-start;
        padding: 16px 18px; gap: 14px;
      }}
      .header-logo {{ height: 34px; }}
      .header-title h1 {{ font-size: 17px; }}
      .header-title h1 .muted {{ font-size: 13px; display: block; margin-top: 2px; }}
      .header-meta {{ gap: 22px; width: 100%; flex-wrap: wrap; }}
      .header-meta .v {{ font-size: 12px; }}
      .card {{ padding: 18px 18px; margin-bottom: 14px; }}
      .card-title {{ font-size: 14.5px; margin-bottom: 14px; padding-bottom: 10px; }}
      .field input, .field select, .field textarea {{ font-size: 14px; padding: 10px 12px; }}
      .price-table {{ font-size: 11.5px; }}
      .price-table thead th {{ padding: 7px 8px; font-size: 9.5px; letter-spacing: 0.6px; }}
      .price-table tbody td {{ padding: 7px 8px; }}
      .price-table td.num, .price-table td.amount {{ white-space: nowrap; }}
      .totals .row {{ padding: 7px 12px; font-size: 12.5px; }}
      .totals .row.grand {{ font-size: 14.5px; padding: 12px 12px; }}
      .btn {{ font-size: 14px; padding: 13px 18px; border-radius: 12px; }}
      .actions {{ gap: 8px; }}
    }}
  </style>
</head>
<body>
  <div class="container">

    <!-- ── HEADER ───────────────────────────────────────────── -->
    <div class="top-bar"></div>
    <div class="header">
      <div class="header-left">
        {f'<img src="{logo}" alt="Frontlix" class="header-logo">' if logo else ''}
        <div class="header-title">
          <div class="eyebrow">Offerte wijzigen &middot; {escape(config.label)}</div>
          <h1>{escape(lead.get('naam') or 'Klant')} <span class="muted">— offerte aanpassen</span></h1>
        </div>
      </div>
      <div class="header-meta">
        <div><div class="k">Referentie</div><div class="v">{ref}</div></div>
        <div><div class="k">Datum</div><div class="v">{today}</div></div>
      </div>
    </div>

    {banner}

    <form method="POST" action="/edit">
      <input type="hidden" name="token" value="{safe_token}" />

      <div class="grid">

        <!-- ── LEFT COLUMN: FORM ──────────────────────────────── -->
        <div>

          <div class="card">
            <div class="card-eyebrow">Klantgegevens</div>
            <div class="card-title">Naam &amp; contact</div>
            <div class="field-grid">
              <div class="field">
                <label for="naam">Naam</label>
                <input type="text" id="naam" name="naam" value="{safe_name}" />
              </div>
              <div class="field">
                <label for="email">E-mailadres</label>
                <input type="email" id="email" name="email" value="{safe_email}" />
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-eyebrow">Aanvraag</div>
            <div class="card-title">Details {escape(branche_label_lc)}</div>
            <div class="field-grid">
              {field_inputs_html}
            </div>
          </div>

          <div class="card korting">
            <div class="card-eyebrow">Optioneel</div>
            <div class="card-title">Korting toepassen</div>
            <div class="field-grid">
              <div class="field">
                <label for="korting_percentage">Percentage (%)</label>
                <input type="number" id="korting_percentage" name="korting_percentage" min="0" max="100" step="1" value="{escape(str(collected.get('_korting_percentage') or ''))}" placeholder="bijv. 10" />
              </div>
              <div class="field span-2">
                <label for="korting_notitie">Notitie bij korting (zichtbaar op offerte)</label>
                <textarea id="korting_notitie" name="korting_notitie" rows="2" placeholder="Bijv. introductiekorting nieuwe klant">{escape(str(collected.get('_korting_notitie') or ''))}</textarea>
              </div>
            </div>
          </div>

        </div>

        <!-- ── RIGHT COLUMN: PRICING SIDEBAR ──────────────────── -->
        <div class="sidebar">
          <div class="card" style="padding:22px 26px">
            <div class="card-eyebrow">Prijsopbouw</div>
            <div class="card-title" style="margin-bottom:12px">Live overzicht</div>

            <table class="price-table">
              <thead>
                <tr>
                  <th>Omschrijving</th>
                  <th class="num">Aantal</th>
                  <th class="num">Per stuk</th>
                  <th class="num">Totaal</th>
                </tr>
              </thead>
              <tbody>{price_rows}</tbody>
            </table>

            <div class="totals">
              <div class="row subtotal"><span>Subtotaal excl. BTW</span><span class="v">{_euro(pricing.subtotaal_excl_btw)}</span></div>
              <div class="row btw"><span>BTW (21%)</span><span class="v">{_euro(pricing.btw_bedrag)}</span></div>
              <div class="row grand"><span>Totaal incl. BTW</span><span class="v">{_euro(pricing.totaal_incl_btw)}</span></div>
            </div>

            <div class="actions">
              <button type="submit" name="action" value="approve" class="btn btn-primary">
                <span class="ico">&#10003;</span> Goedkeuren &amp; versturen
              </button>
            </div>

            <p class="helper">
              Wijzigingen worden direct opgeslagen.<br>
              Bij goedkeuren wordt de PDF automatisch naar de klant verzonden.
            </p>
          </div>
        </div>

      </div>
    </form>

    <p class="powered">Beheerd via <span class="brand-front">Front</span><span class="brand-lix">lix</span> &middot; frontlix.com</p>

  </div>

  <script>
  {_get_pricing_js(config.id)}

  function euro(n) {{
    var sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    var parts = n.toFixed(2).split('.');
    var whole = parts[0].replace(/\\B(?=(\\d{{3}})+(?!\\d))/g, '.');
    return sign + '€ ' + whole + ',' + parts[1];
  }}

  function recalc() {{
    const answers = {{}};
    document.querySelectorAll('[id^="field_"]').forEach(el => {{
      answers[el.id.replace('field_', '')] = el.value.trim();
    }});

    const result = calcPricing(answers);

    // Korting toepassen
    var kortingPct = parseFloat(document.getElementById('korting_percentage').value) || 0;
    if (kortingPct > 0 && kortingPct <= 100) {{
      var kortingBedrag = Math.round(result.subtotaal * (kortingPct / 100) * 100) / 100;
      result.lines.push({{label: 'Korting (' + kortingPct + '%)', quantity: 1, unit: '', unitPrice: -kortingBedrag, total: -kortingBedrag}});
      result.subtotaal = Math.round((result.subtotaal - kortingBedrag) * 100) / 100;
      result.btw = Math.round(result.subtotaal * 0.21 * 100) / 100;
      result.totaal = Math.round((result.subtotaal + result.btw) * 100) / 100;
    }}

    // Update pricing table
    const tbody = document.querySelector('table.price-table tbody');
    tbody.innerHTML = result.lines.map(l =>
      '<tr><td class="lbl">' + l.label + '</td>' +
      '<td class="num">' + (l.quantity || 0).toFixed(0) + (l.unit ? ' ' + l.unit : '') + '</td>' +
      '<td class="num">' + euro(l.unitPrice || 0) + '</td>' +
      '<td class="amount">' + euro(l.total) + '</td></tr>'
    ).join('');

    // Update totals
    const vals = document.querySelectorAll('.totals .row .v');
    vals[0].textContent = euro(result.subtotaal);
    vals[1].textContent = euro(result.btw);
    vals[2].textContent = euro(result.totaal);
  }}

  document.querySelectorAll('[id^="field_"]').forEach(el => {{
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  }});
  document.getElementById('korting_percentage').addEventListener('input', recalc);
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
