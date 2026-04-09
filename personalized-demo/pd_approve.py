"""Goedkeuren route voor De Designmaker personalized demo.

GET /personalized/approve?token=...
"""
from __future__ import annotations

from datetime import datetime, timezone
from html import escape

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from services.supabase import get_supabase  # shared via lead-automation
from services.whatsapp import send_text, send_document  # shared
from services.mail import _send_email  # shared

from pd_pdf import generate_designmaker_pdf, DIENST_LABELS

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _error_page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{escape(title)} — De Designmaker</title>
    <style>body{{font-family:sans-serif;background:#F0F2F5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
    h1{{font-size:22px;font-weight:700;margin-bottom:12px}}p{{font-size:15px;color:#555;line-height:1.6}}a{{color:#1A56FF;text-decoration:none}}</style>
    </head><body><div class="card"><h1>{escape(title)}</h1><p>{escape(message)}</p>
    <p style="margin-top:24px"><a href="https://dedesignmaker.nl">Terug naar De Designmaker</a></p></div></body></html>"""


def _success_page(naam: str) -> str:
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Offerte verstuurd — De Designmaker</title>
    <style>body{{font-family:sans-serif;background:#F0F2F5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
    .card{{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
    .icon{{font-size:48px;margin-bottom:16px}}
    h1{{font-size:22px;font-weight:700;margin-bottom:12px;color:#16a34a}}
    p{{font-size:15px;color:#555;line-height:1.6}}</style>
    </head><body><div class="card"><div class="icon">✓</div>
    <h1>Offerte verstuurd!</h1>
    <p>De offerte voor <strong>{escape(naam)}</strong> is goedgekeurd en verstuurd via WhatsApp en e-mail.</p>
    </div></body></html>"""


@router.get("/personalized/approve")
async def approve(request: Request):
    token = request.query_params.get("token")
    if not token:
        return HTMLResponse(_error_page("Ongeldige link", "Deze link werkt niet meer."), status_code=400)

    sb = get_supabase()
    resp = sb.table("leads").select("*").eq("approval_token", token).eq("demo_type", "personalized").limit(1).execute()
    lead = (resp.data or [None])[0]
    if not lead:
        return HTMLResponse(_error_page("Link werkt niet meer", "Deze goedkeuringslink is verlopen."), status_code=404)

    status = lead.get("status", "")

    # Al verstuurd
    if status in ("quote_sent", "scheduling", "appointment_booked"):
        return HTMLResponse(_success_page(lead.get("naam") or "klant"))
    if status == "quote_processing":
        return HTMLResponse(_error_page("Even geduld", "De offerte wordt op dit moment verwerkt."))
    if status != "pending_approval":
        return HTMLResponse(_error_page("Onverwachte status", f"Status: {status}"), status_code=400)

    # Atomic claim
    claim = sb.table("leads").update({
        "status": "quote_processing",
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).eq("status", "pending_approval").execute()

    if not claim.data:
        return HTMLResponse(_error_page("Even geduld", "De offerte wordt op dit moment al verwerkt."))

    collected = dict(lead.get("collected_data") or {})
    type_dienst = collected.get("type_dienst", "carwrapping")
    naam = lead.get("naam") or "Klant"
    email = lead.get("email") or ""

    # PDF genereren
    try:
        result = await generate_designmaker_pdf(
            lead_id=lead["id"],
            type_dienst=type_dienst,
            klant_naam=naam,
            klant_email=email,
            collected_data=collected,
        )
        pdf_url = result["url"]
        pricing = result["pricing"]
    except Exception as e:
        print(f"[pd_approve] PDF generation failed: {e}")
        sb.table("leads").update({"status": "pending_approval"}).eq("id", lead["id"]).execute()
        return HTMLResponse(_error_page("PDF fout", "Er ging iets mis bij het genereren van de offerte. Probeer het opnieuw."), status_code=500)

    # Stuur PDF via WhatsApp
    branche_label = DIENST_LABELS.get(type_dienst, "Wrapping")
    try:
        await send_document(
            lead["telefoon"],
            pdf_url,
            f"Offerte-{branche_label}.pdf",
            caption=f"Hier is je offerte voor {branche_label.lower()}! Bekijk 'm rustig.",
        )
    except Exception as e:
        print(f"[pd_approve] WhatsApp document send failed: {e}")

    # Stuur apart bericht over afspraak inplannen
    try:
        await send_text(
            lead["telefoon"],
            "Als je een afspraak wilt inplannen om alles door te spreken, laat het gerust weten. Dan zoek ik een mooi moment uit!",
        )
    except Exception as e:
        print(f"[pd_approve] WhatsApp follow-up failed: {e}")

    # Stuur email naar klant met PDF bijlage + afspraak knop
    try:
        _send_customer_email(email, naam, type_dienst, pdf_url, lead.get("approval_token", ""), collected)
    except Exception as e:
        import traceback
        print(f"[pd_approve] Customer email failed:")
        traceback.print_exc()

    # Update lead
    sb.table("leads").update({
        "status": "quote_sent",
        "quote_pdf_url": pdf_url,
        "pricing": pricing.model_dump(),
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    # Log in conversations
    sb.table("conversations").insert({
        "lead_id": lead["id"],
        "role": "assistant",
        "content": "(offerte PDF verstuurd)",
        "message_type": "document",
        "media_url": pdf_url,
    }).execute()

    return HTMLResponse(_success_page(naam))


def _send_customer_email(to_email: str, naam: str, type_dienst: str, pdf_url: str, token: str, collected: dict):
    """Stuur de offerte email naar de klant met PDF bijlage en afspraak knop."""
    import httpx

    branche_label = DIENST_LABELS.get(type_dienst, "Wrapping")
    # WhatsApp deep link — stuurt klant terug naar WhatsApp waar de scheduling flow werkt
    whatsapp_url = "https://wa.me/31638272245?text=Hoi%2C%20ik%20wil%20graag%20een%20afspraak%20inplannen"

    # Korting notitie (als ingevuld in het edit formulier)
    korting_html = ""
    korting_notitie = collected.get("_korting_notitie")
    korting_percentage = collected.get("_korting_percentage")
    if korting_notitie or korting_percentage:
        korting_html = '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin:16px 0">'
        if korting_percentage:
            korting_html += f'<p style="margin:0 0 4px;font-weight:700;color:#166534">{escape(str(korting_percentage))}% korting</p>'
        if korting_notitie:
            korting_html += f'<p style="margin:0;color:#166534">{escape(str(korting_notitie))}</p>'
        korting_html += "</div>"

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F3F4F6">
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">

      <!-- Header -->
      <div style="background:#111111;padding:28px 36px;text-align:center">
        <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;letter-spacing:-0.3px">De Designmaker</h1>
        <p style="color:#666;font-size:12px;margin:6px 0 0">Specialist in wrapping, belettering &amp; design</p>
      </div>

      <!-- Content -->
      <div style="padding:32px 36px">

        <!-- Groene check badge -->
        <div style="text-align:center;margin-bottom:24px">
          <span style="background:#F0FDF4;color:#16a34a;font-size:13px;font-weight:700;padding:8px 20px;border-radius:20px;display:inline-block">Je offerte staat klaar</span>
        </div>

        <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px">Hoi {escape(naam)},</p>

        <p style="font-size:15px;color:#4B5563;line-height:1.7;margin:0 0 24px">
          Goed nieuws! Je offerte voor {escape(branche_label.lower())} is goedgekeurd en staat klaar.
          Je vindt de PDF als bijlage bij deze mail.
        </p>

        {korting_html}

        <!-- Divider -->
        <div style="border-top:1px solid #E5E7EB;margin:28px 0"></div>

        <!-- Afspraak sectie -->
        <div style="background:#F9FAFB;border-radius:12px;padding:24px;text-align:center">
          <p style="font-size:15px;color:#374151;font-weight:600;margin:0 0 6px">Wil je de offerte doorspreken?</p>
          <p style="font-size:14px;color:#6B7280;margin:0 0 20px">Plan een vrijblijvend gesprek in of stuur ons een WhatsApp berichtje.</p>
          <a href="{escape(whatsapp_url)}" style="background:#25D366;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
            Afspraak inplannen via WhatsApp
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#F9FAFB;padding:20px 36px;text-align:center;border-top:1px solid #F3F4F6">
        <p style="color:#9CA3AF;font-size:11px;margin:0;line-height:1.6">
          De Designmaker — Windmolenboschweg 14, Haelen<br>
          <a href="mailto:lars@dedesignmaker.nl" style="color:#9CA3AF">lars@dedesignmaker.nl</a> —
          <a href="tel:+31637296847" style="color:#9CA3AF">+31 6 37296847</a>
        </p>
      </div>
    </div>
    </body></html>"""

    # Download PDF en voeg toe als bijlage
    attachments = []
    if pdf_url:
        try:
            pdf_data = httpx.get(pdf_url).content
            attachments.append({
                "filename": f"Offerte-{branche_label}.pdf",
                "data": pdf_data,
                "content_type": "application/pdf",
            })
        except Exception as e:
            print(f"[pd_approve] PDF download for attachment failed: {e}")

    print(f"[pd_approve] Sending customer email to {to_email}")
    _send_email(
        to=to_email,
        subject=f"Je offerte voor {branche_label} — De Designmaker",
        html_body=html,
        attachments=attachments,
    )
    print(f"[pd_approve] Customer email sent successfully")
