"""PDF quote generation using WeasyPrint + Jinja2 HTML template.

Replaces the React-PDF implementation from TypeScript.
Generates a professional invoice-style PDF and uploads to Supabase storage.
"""
from __future__ import annotations

import time
from html import escape
from pathlib import Path

from jinja2 import Template

from services.supabase import get_supabase
from branches import get_branche, get_pricing
from models.branches import PricingResult

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"


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

    intake_summary = _build_intake_summary(branche_id, collected_data)

    # Load and render HTML template
    template_path = TEMPLATE_DIR / "quote.html"
    template = Template(template_path.read_text(encoding="utf-8"))

    html_content = template.render(
        company=config.company,
        klant_naam=escape(klant_naam),
        klant_email=escape(klant_email),
        branche_label=config.label,
        intro_offerte=config.intro_offerte,
        intake_summary=intake_summary,
        aanbod_beschrijving=config.aanbod_beschrijving,
        pricing=pricing,
        escape=escape,
    )

    # Generate PDF (lazy import — WeasyPrint needs system libs that may not be on dev machines)
    from weasyprint import HTML
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
