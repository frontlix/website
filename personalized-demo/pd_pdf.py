"""PDF offerte generatie voor De Designmaker.

Hergebruikt de quote.html Jinja2 template uit lead-automation/templates/.
"""
from __future__ import annotations

import os
import time
from html import escape
from pathlib import Path

# WeasyPrint heeft system libraries nodig van Homebrew
if not os.environ.get("DYLD_FALLBACK_LIBRARY_PATH"):
    os.environ["DYLD_FALLBACK_LIBRARY_PATH"] = "/opt/homebrew/lib"

from jinja2 import Template

from services.supabase import get_supabase  # shared via lead-automation
from models.branches import CompanyInfo  # shared via lead-automation
from pd_pricing import get_designmaker_pricing
from pd_config import FIELDS_PER_DIENST

# De Designmaker company info
DESIGNMAKER_COMPANY = CompanyInfo(
    name="De Designmaker",
    address_lines=["Windmolenboschweg 14", "6085 PE Haelen", "Nederland"],
    phone="+31 6 37296847",
    email="lars@dedesignmaker.nl",
    website="www.dedesignmaker.nl",
    kvk="87654321",
    btw="NL876543210B01",
    iban="NL50 RABO 0123 4567 89",
    contact_person="Lars Wouters",
)

DIENST_LABELS = {
    "carwrapping": "Carwrapping",
    "keuken_interieur": "Keuken & Interieur Wrapping",
    "binnen_reclame": "Binnen Reclame",
    "signing": "Signing & Belettering",
}

DIENST_BESCHRIJVING = {
    "carwrapping": "Professionele carwrapping met premium folies van 3M, Hexis, Avery Dennison en Orafol. Inclusief voorbereiding, applicatie en nabewerking.",
    "keuken_interieur": "Interieurwrapping voor keukens, kasten en deuren. Geef je interieur een nieuwe uitstraling zonder verbouwing, met duurzame folies in vele texturen.",
    "binnen_reclame": "Professionele binnen reclame: muurreclame, raamfolie, wandprints en kantoorsigning. Van huisstijl naar de muren van je pand.",
    "signing": "Voertuigbelettering en signing op maat. Van een enkel logo tot een complete fleet, met premium materialen en vakkundige applicatie.",
}

# Template pad: hergebruik uit lead-automation
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "lead-automation" / "templates"


def _build_intake_summary(type_dienst: str, collected_data: dict) -> str:
    """Bouw een samenvatting van de verzamelde gegevens."""
    fields = FIELDS_PER_DIENST.get(type_dienst, [])
    parts = []
    for key in fields:
        v = collected_data.get(key)
        if v and str(v).strip():
            label = key.replace("_", " ")
            parts.append(f"{label}: {v}")
    if not parts:
        return ""
    return f"Op basis van de informatie die je via WhatsApp hebt gedeeld ({', '.join(parts)}) hebben wij onderstaand voorstel voor je opgesteld."


async def generate_designmaker_pdf(
    lead_id: str,
    type_dienst: str,
    klant_naam: str,
    klant_email: str,
    collected_data: dict,
) -> dict:
    """Genereer een PDF offerte voor De Designmaker. Returns {url, filename, pricing}."""
    # Pricing berekenen
    string_data = {k: str(v) for k, v in collected_data.items() if v is not None and not isinstance(v, (dict, list))}
    pricing = get_designmaker_pricing(type_dienst, string_data)

    # Korting toepassen als die is ingesteld
    korting_pct = collected_data.get("_korting_percentage")
    korting_notitie = collected_data.get("_korting_notitie")
    if korting_pct:
        try:
            pct = float(str(korting_pct))
            if 0 < pct <= 100:
                from models.branches import PricingLine
                from branches.base import round2, with_btw
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

    intake_summary = _build_intake_summary(type_dienst, collected_data)
    branche_label = DIENST_LABELS.get(type_dienst, "Wrapping")

    # Korting notitie toevoegen aan intro als die er is
    extra_note = ""
    if korting_notitie:
        extra_note = f"\n\n{korting_notitie}"

    # HTML template laden en renderen
    template_path = TEMPLATE_DIR / "quote.html"
    template = Template(template_path.read_text(encoding="utf-8"))

    html_content = template.render(
        company=DESIGNMAKER_COMPANY,
        klant_naam=escape(klant_naam),
        klant_email=escape(klant_email),
        branche_label=branche_label,
        intro_offerte=f"Naar aanleiding van ons gesprek sturen wij u graag een voorstel voor de hieronder beschreven werkzaamheden.{extra_note}",
        intake_summary=intake_summary,
        aanbod_beschrijving=DIENST_BESCHRIJVING.get(type_dienst, ""),
        pricing=pricing,
        escape=escape,
    )

    # PDF genereren
    from weasyprint import HTML
    pdf_bytes = HTML(string=html_content).write_pdf()

    # Upload naar Supabase storage
    timestamp = int(time.time() * 1000)
    filename = f"offerte-designmaker-{timestamp}.pdf"
    storage_path = f"quotes/{lead_id}/{filename}"

    sb = get_supabase()
    sb.storage.from_("photos").upload(storage_path, pdf_bytes, {"content-type": "application/pdf", "upsert": "false"})
    public_url = sb.storage.from_("photos").get_public_url(storage_path)

    return {
        "url": public_url,
        "filename": filename,
        "pricing": pricing,
    }
