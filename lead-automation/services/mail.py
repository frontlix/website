"""Email service — approval emails and customer quote emails via SMTP."""
from __future__ import annotations

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from html import escape

from config import get_settings
from models.branches import PricingResult


def _send_email(to: str, subject: str, html_body: str):
    """Send an email via SMTP SSL."""
    s = get_settings()

    msg = MIMEMultipart("alternative")
    msg["From"] = f"Frontlix <{s.mail_user}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    with smtplib.SMTP_SSL(s.mail_host, s.mail_port, context=context) as server:
        server.login(s.mail_user, s.mail_pass)
        server.send_message(msg)


async def send_approval_email(
    to_email: str,
    naam: str,
    telefoon: str,
    email: str,
    branche_label: str,
    fields: list[dict],
    pricing: PricingResult,
    approve_url: str,
    edit_url: str,
    photo_urls: list[str] | None = None,
) -> None:
    """Send approval email with quote details to Frontlix team."""
    fields_html = "".join(
        f'<tr><td style="padding:4px 12px 4px 0;color:#555">{escape(f["label"])}</td>'
        f'<td style="padding:4px 0">{escape(f["value"])}</td></tr>'
        for f in fields
    )

    price_lines_html = "".join(
        f'<tr><td style="padding:4px 12px 4px 0">{escape(line.label)}</td>'
        f'<td style="padding:4px 0;text-align:right">€{line.total:.2f}</td></tr>'
        for line in pricing.lines
    )

    photos_html = ""
    if photo_urls:
        thumbs = "".join(
            f'<img src="{escape(url)}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;margin:2px" />'
            for url in photo_urls[:6]
        )
        photos_html = f'<div style="margin:16px 0">{thumbs}</div>'

    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1A56FF">Nieuwe offerte-aanvraag — {escape(branche_label)}</h2>

      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#555">Naam</td><td>{escape(naam)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Telefoon</td><td>+{escape(telefoon)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Email</td><td>{escape(email)}</td></tr>
        {fields_html}
      </table>

      {photos_html}

      <h3 style="margin-top:24px">Prijsoverzicht</h3>
      <table style="width:100%;border-collapse:collapse">
        {price_lines_html}
        <tr style="border-top:1px solid #ddd">
          <td style="padding:8px 12px 4px 0;font-weight:600">Subtotaal</td>
          <td style="padding:8px 0;text-align:right">€{pricing.subtotaal_excl_btw:.2f}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#555">BTW 21%</td>
          <td style="padding:4px 0;text-align:right">€{pricing.btw_bedrag:.2f}</td>
        </tr>
        <tr style="border-top:1px solid #ddd">
          <td style="padding:8px 12px 4px 0;font-weight:700;font-size:18px">Totaal incl. BTW</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;font-size:18px">€{pricing.totaal_incl_btw:.2f}</td>
        </tr>
      </table>

      <div style="margin:32px 0;text-align:center">
        <a href="{escape(approve_url)}" style="background:linear-gradient(135deg,#1A56FF,#00CFFF);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin:8px">
          Goedkeuren & versturen
        </a>
        <a href="{escape(edit_url)}" style="color:#1A56FF;padding:14px 32px;text-decoration:none;display:inline-block;margin:8px">
          Bewerken
        </a>
      </div>

      <p style="color:#999;font-size:12px;text-align:center">
        Dit is een automatisch gegenereerde e-mail van het Frontlix demo-systeem.
      </p>
    </div>
    """

    _send_email(
        to=get_settings().mail_user,  # Approval goes to Frontlix team
        subject=f"Offerte ter goedkeuring — {naam} ({branche_label})",
        html_body=html,
    )


async def send_customer_quote_email(
    to_email: str,
    naam: str,
    branche_label: str,
    pdf_url: str,
    schedule_url: str,
) -> None:
    """Send the approved quote to the customer with a scheduling link."""
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1A56FF">Je offerte staat klaar!</h2>

      <p>Hoi {escape(naam)},</p>

      <p>Goed nieuws — je offerte voor {escape(branche_label)} is goedgekeurd en staat klaar als PDF.</p>

      <div style="margin:24px 0;text-align:center">
        <a href="{escape(pdf_url)}" style="background:#1A56FF;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin:8px">
          Offerte bekijken (PDF)
        </a>
      </div>

      <p>Wil je een afspraak inplannen? Klik hieronder of antwoord met "ja" op WhatsApp.</p>

      <div style="margin:24px 0;text-align:center">
        <a href="{escape(schedule_url)}" style="background:linear-gradient(135deg,#1A56FF,#00CFFF);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Afspraak inplannen
        </a>
      </div>

      <p style="color:#999;font-size:12px;text-align:center;margin-top:32px">
        Dit is een automatisch gegenereerde e-mail van het Frontlix demo-systeem.
      </p>
    </div>
    """

    _send_email(
        to=to_email,
        subject=f"Je offerte voor {branche_label} — Frontlix demo",
        html_body=html,
    )
