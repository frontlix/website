"""Quote approval route — triggered when team clicks the approve button in the email."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from services.supabase import get_supabase
from services.whatsapp import send_document
from services.pdf import generate_quote_pdf
from services.mail import send_customer_quote_email
from branches import get_branche
from config import get_settings

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _error_page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{title} - Frontlix</title>
    <style>body{{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F0F2F5;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:500px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}}
    h1{{color:#1A56FF;margin-bottom:16px}}p{{color:#555;line-height:1.6}}</style></head>
    <body><div class="card"><h1>{title}</h1><p>{message}</p></div></body></html>"""


def _success_page(naam: str, already_sent: bool = False) -> str:
    title = "Offerte al verzonden" if already_sent else "Offerte goedgekeurd"
    intro = f"De offerte voor {naam} is al eerder goedgekeurd en verzonden." if already_sent else f"De offerte is automatisch verzonden naar {naam} via WhatsApp."
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{title} - Frontlix</title>
    <style>body{{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F0F2F5;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:500px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}}
    h1{{color:#1A56FF;margin-bottom:16px}}p{{color:#555;line-height:1.6}}
    .check{{font-size:48px;margin-bottom:16px}}</style></head>
    <body><div class="card"><div class="check">✅</div><h1>{title}</h1><p>{intro}</p></div></body></html>"""


@router.get("/approve")
async def approve_quote(request: Request):
    """Handle quote approval from the email button click."""
    token = request.query_params.get("token")
    if not token:
        return HTMLResponse(_error_page("Ongeldige link", "Deze link werkt niet meer."), status_code=400)

    sb = get_supabase()

    # Look up lead by approval token
    try:
        resp = sb.table("leads").select("*").eq("approval_token", token).limit(1).execute()
        lead = (resp.data or [None])[0]
    except Exception:
        lead = None

    if not lead:
        return HTMLResponse(_error_page("Offerte niet gevonden", "Deze goedkeuringslink is ongeldig of verlopen."), status_code=404)

    status = lead.get("status", "")

    # Already processed
    if status in ("quote_sent", "scheduling", "appointment_booked"):
        return HTMLResponse(_success_page(lead.get("naam") or "de klant", already_sent=True))

    if status == "quote_processing":
        return HTMLResponse(_error_page("Even geduld", "De offerte wordt op dit moment al verwerkt. Check je WhatsApp over een minuutje."))

    if status != "pending_approval":
        return HTMLResponse(_error_page("Niet beschikbaar", f'Status "{status}" kan niet worden goedgekeurd.'), status_code=400)

    # Idempotency claim — atomic conditional update
    claim = sb.table("leads").update({
        "status": "quote_processing",
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).eq("status", "pending_approval").execute()

    if not claim.data:
        return HTMLResponse(_error_page("Even geduld", "De offerte wordt op dit moment al verwerkt."))

    demo_type = lead.get("demo_type")
    if not demo_type:
        return HTMLResponse(_error_page("Onvolledige lead", "Geen branche gekoppeld."), status_code=400)

    config = get_branche(demo_type)
    if not config:
        return HTMLResponse(_error_page("Onbekende branche", f'Branche "{demo_type}" is niet bekend.'), status_code=400)

    # Generate PDF
    try:
        result = await generate_quote_pdf(
            lead_id=lead["id"],
            branche_id=demo_type,
            klant_naam=lead.get("naam") or "Klant",
            klant_email=lead.get("email") or "",
            collected_data=lead.get("collected_data") or {},
        )
        pdf_url = result["url"]
    except Exception as e:
        print(f"PDF generation failed: {e}")
        return HTMLResponse(_error_page("PDF mislukt", "Er ging iets mis bij het genereren van de PDF."), status_code=500)

    # Send PDF via WhatsApp
    caption = 'Hier is je offerte! Bekijk \'m rustig. Wil je een gratis kennismakingsgesprek inplannen? Antwoord met "ja" dan stel ik wat tijden voor.'
    try:
        await send_document(lead["telefoon"], pdf_url, f"Offerte-{config.label}.pdf", caption)
    except Exception as e:
        print(f"WhatsApp document send failed: {e}")

    # Send customer email
    if lead.get("email"):
        site_url = get_settings().site_url
        try:
            await send_customer_quote_email(
                to_email=lead["email"],
                naam=lead.get("naam") or "klant",
                branche_label=config.label,
                pdf_url=pdf_url,
                schedule_url=f"{site_url}/schedule?token={lead['approval_token']}",
            )
        except Exception as e:
            print(f"Customer email failed: {e}")

    # Update lead status + save PDF URL
    sb.table("leads").update({
        "quote_pdf_url": pdf_url,
        "status": "quote_sent",
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    # Save in conversations
    sb.table("conversations").insert({
        "lead_id": lead["id"],
        "role": "assistant",
        "content": f"(PDF offerte verzonden — {pdf_url})",
        "message_type": "document",
        "media_url": pdf_url,
    }).execute()

    return HTMLResponse(_success_page(lead.get("naam") or "klant"))
