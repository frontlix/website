"""PDF quote generation using WeasyPrint + Jinja2 HTML template.

Replaces the React-PDF implementation from TypeScript.
Generates a professional invoice-style PDF and uploads to Supabase storage.
"""
from __future__ import annotations

import base64
import time
from datetime import datetime
from functools import lru_cache
from html import escape
from pathlib import Path
from zoneinfo import ZoneInfo

from jinja2 import Environment

from services.supabase import get_supabase
from branches import get_branche, get_pricing
from models.branches import PricingResult

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
ASSETS_DIR = Path(__file__).parent.parent / "assets"
LOGO_PATH = ASSETS_DIR / "frontlix-logo.png"


@lru_cache(maxsize=1)
def _logo_data_uri() -> str:
    """Inline the Frontlix logo as base64 so the PDF is portable (no file://
    or external URL needed at render time)."""
    try:
        encoded = base64.b64encode(LOGO_PATH.read_bytes()).decode("ascii")
        return f"data:image/png;base64,{encoded}"
    except Exception as e:
        print(f"[pdf] logo load failed (continuing without): {e}")
        return ""


def _offerte_meta() -> dict[str, str]:
    """Reference number + human-readable date for the offerte header."""
    now = datetime.now(ZoneInfo("Europe/Amsterdam"))
    ref = f"OFF-{now.strftime('%Y%m%d-%H%M%S')}"
    NL_MONTHS = ["", "januari", "februari", "maart", "april", "mei", "juni",
                 "juli", "augustus", "september", "oktober", "november", "december"]
    geldig_tot = now.replace(hour=23, minute=59, second=59).timestamp()
    # Add ~30 days
    geldig_dt = datetime.fromtimestamp(geldig_tot + 30 * 86400, tz=ZoneInfo("Europe/Amsterdam"))
    return {
        "ref": ref,
        "datum_str": f"{now.day} {NL_MONTHS[now.month]} {now.year}",
        "geldig_tot_str": f"{geldig_dt.day} {NL_MONTHS[geldig_dt.month]} {geldig_dt.year}",
    }


def _build_intake_summary(branche_id: str, collected_data: dict) -> str:
    """Build a natural-language intake summary for the PDF intro paragraph."""
    config = get_branche(branche_id)
    if not config:
        return ""
    parts = []
    for field in config.fields:
        v = collected_data.get(field.key)
        if v is None or str(v).strip() == "":
            continue
        display = f"{v} {field.unit}" if field.unit else str(v)
        parts.append(f"{field.label}: {display}")
    if not parts:
        return ""
    return f"Op basis van de informatie die je via WhatsApp hebt gedeeld ({', '.join(parts)}) hebben wij onderstaand voorstel voor je opgesteld."


async def generate_quote_pdf(
    lead_id: str,
    branche_id: str,
    klant_naam: str,
    klant_email: str,
    collected_data: dict,
) -> dict:
    """Generate a PDF quote, upload to Supabase storage, return {url, filename, pricing}."""
    config = get_branche(branche_id)
    if not config:
        raise ValueError(f"Unknown branche: {branche_id}")

    # Calculate pricing
    string_data = {k: str(v) for k, v in collected_data.items() if v is not None and not isinstance(v, (dict, list))}
    pricing = get_pricing(branche_id, string_data)

    # Korting toepassen als die is ingesteld
    from branches.base import round2, with_btw
    from models.branches import PricingLine
    korting_pct = collected_data.get("_korting_percentage")
    korting_notitie = collected_data.get("_korting_notitie")
    if korting_pct:
        try:
            pct = float(str(korting_pct))
            if 0 < pct <= 100:
                korting_bedrag = round2(pricing.subtotaal_excl_btw * (pct / 100))
                pricing.lines.append(PricingLine(
                    label=f"Korting ({pct:.0f}%)",
                    quantity=1, unit="", unit_price=-korting_bedrag, total=-korting_bedrag,
                ))
                new_sub = pricing.subtotaal_excl_btw - korting_bedrag
                btw_info = with_btw(new_sub)
                pricing.subtotaal_excl_btw = btw_info["subtotaal_excl_btw"]
                pricing.btw_bedrag = btw_info["btw_bedrag"]
                pricing.totaal_incl_btw = btw_info["totaal_incl_btw"]
        except (ValueError, TypeError):
            pass

    intake_summary = _build_intake_summary(branche_id, collected_data)

    # Build a dedicated Jinja Environment so we can register NL number filters.
    env = Environment(autoescape=False)

    def _nl_currency(value) -> str:
        """Format as Dutch currency: 1234.5 → '1.234,50'. Negatives keep sign."""
        try:
            n = float(value)
        except (TypeError, ValueError):
            return str(value)
        sign = "-" if n < 0 else ""
        s = f"{abs(n):,.2f}"
        # English locale → swap separators
        s = s.replace(",", "§").replace(".", ",").replace("§", ".")
        return f"{sign}{s}"

    def _nl_int(value) -> str:
        """Render whole-number quantity without decimals (60.0 → '60')."""
        try:
            n = float(value)
        except (TypeError, ValueError):
            return str(value)
        if n.is_integer():
            return f"{int(n):,}".replace(",", ".")
        return _nl_currency(n)

    env.filters["nl_currency"] = _nl_currency
    env.filters["nl_int"] = _nl_int

    template_path = TEMPLATE_DIR / "quote.html"
    template = env.from_string(template_path.read_text(encoding="utf-8"))

    meta = _offerte_meta()
    html_content = template.render(
        company=config.company,
        klant_naam=escape(klant_naam),
        klant_email=escape(klant_email),
        branche_label=config.label,
        intro_offerte=config.intro_offerte,
        intake_summary=intake_summary,
        aanbod_beschrijving=config.aanbod_beschrijving,
        pricing=pricing,
        # Escape user-supplied korting-notitie: env heeft autoescape=False, dus
        # rauwe HTML/CSS hierin zou anders in de WeasyPrint-render geïnjecteerd worden.
        # escape("") blijft "", dus de {% if korting_notitie %}-guard werkt door.
        korting_notitie=escape(korting_notitie or ""),
        logo_data_uri=_logo_data_uri(),
        ref=meta["ref"],
        datum_str=meta["datum_str"],
        geldig_tot_str=meta["geldig_tot_str"],
        escape=escape,
    )

    # Generate PDF (lazy import — WeasyPrint needs system libs that may not be on dev machines)
    from weasyprint import HTML  # pyrefly: ignore[missing-import]
    pdf_bytes = HTML(string=html_content).write_pdf()

    # Upload to Supabase storage
    timestamp = int(time.time() * 1000)
    filename = f"offerte-{timestamp}.pdf"
    storage_path = f"quotes/{lead_id}/{filename}"

    sb = get_supabase()
    sb.storage.from_("photos").upload(storage_path, pdf_bytes, {"content-type": "application/pdf", "upsert": "false"})
    public_url = sb.storage.from_("photos").get_public_url(storage_path)

    return {
        "url": public_url,
        "filename": filename,
        "pricing": pricing,
    }
