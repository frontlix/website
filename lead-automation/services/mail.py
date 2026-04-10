"""Email service — approval emails and customer quote emails via SMTP."""
from __future__ import annotations

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from html import escape

import httpx

from config import get_settings
from models.branches import PricingResult


def _send_email(to: str, subject: str, html_body: str, attachments: list[dict] | None = None):
    """Send an email via SMTP SSL. Attachments: [{"filename": "...", "data": bytes, "content_type": "..."}]"""
    s = get_settings()

    msg = MIMEMultipart("mixed")
    msg["From"] = f"Frontlix <{s.mail_user}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    for att in (attachments or []):
        part = MIMEApplication(att["data"], Name=att["filename"])
        part["Content-Disposition"] = f'attachment; filename="{att["filename"]}"'
        msg.attach(part)

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
    pdf_url: str | None = None,
) -> None:
    """Send approval email with quote details to Frontlix team."""
    fields_html = "".join(
        f'<tr>'
        f'<td style="padding:11px 20px;font-family:Georgia,serif;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#8993A4;vertical-align:top;width:40%;border-bottom:1px solid #EDF0F5">{escape(f["label"])}</td>'
        f'<td style="padding:11px 20px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:14px;color:#1B2A4A;font-weight:600;border-bottom:1px solid #EDF0F5">{escape(f["value"])}</td>'
        f'</tr>'
        for f in fields
    )

    price_lines_html = "".join(
        f'<tr>'
        f'<td style="padding:10px 20px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:14px;color:#4A5568">{escape(line.label)}</td>'
        f'<td style="padding:10px 20px;text-align:right;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:14px;color:#1B2A4A;font-weight:600">&euro;{line.total:.2f}</td>'
        f'</tr>'
        for line in pricing.lines
    )

    photos_html = ""
    if photo_urls:
        thumbs = "".join(
            f'<td style="padding:0 4px"><img src="{escape(url)}" width="76" height="76" style="display:block;border-radius:6px;object-fit:cover" /></td>'
            for url in photo_urls[:6]
        )
        photos_html = f"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 20px"><tr>{thumbs}</tr></table>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="nl">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background-color:#F0F2F7;-webkit-font-smoothing:antialiased">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F7">
      <tr><td align="center" style="padding:40px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%">

          <!-- HEADER — dark navy with gradient accent stripe -->
          <tr><td style="background-color:#0D1B3E;padding:36px 40px 28px 40px;border-radius:12px 12px 0 0">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <p style="margin:0;font-family:Georgia,serif;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#5B8DEF">Nieuwe aanvraag</p>
                  <h1 style="margin:8px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px">Offerte ter goedkeuring</h1>
                </td>
                <td align="right" valign="top">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr><td style="background-color:rgba(26,86,255,0.25);border-radius:6px;padding:6px 14px">
                      <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;font-weight:600;color:#5B8DEF;text-transform:uppercase;letter-spacing:0.5px">{escape(branche_label)}</span>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Gradient accent line -->
          <tr><td style="height:3px;background:linear-gradient(90deg,#1A56FF,#00CFFF,#1A56FF);font-size:0;line-height:0">&nbsp;</td></tr>

          <!-- BODY -->
          <tr><td style="background-color:#FFFFFF;padding:0;border-left:1px solid #E2E6EF;border-right:1px solid #E2E6EF">

            <!-- Klantgegevens section -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:28px 40px 12px 40px">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:3px;background-color:#1A56FF;border-radius:2px"></td>
                    <td style="padding-left:10px">
                      <p style="margin:0;font-family:Georgia,serif;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#8993A4;font-weight:400">Klantgegevens</p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px">
              <tr>
                <td style="padding:11px 20px;font-family:Georgia,serif;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#8993A4;vertical-align:top;width:40%;border-bottom:1px solid #EDF0F5">Naam</td>
                <td style="padding:11px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#1B2A4A;font-weight:600;border-bottom:1px solid #EDF0F5">{escape(naam)}</td>
              </tr>
              <tr>
                <td style="padding:11px 20px;font-family:Georgia,serif;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#8993A4;vertical-align:top;border-bottom:1px solid #EDF0F5">Telefoon</td>
                <td style="padding:11px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#1B2A4A;font-weight:600;border-bottom:1px solid #EDF0F5">+{escape(telefoon)}</td>
              </tr>
              <tr>
                <td style="padding:11px 20px;font-family:Georgia,serif;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#8993A4;vertical-align:top;border-bottom:1px solid #EDF0F5">Email</td>
                <td style="padding:11px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#1A56FF;font-weight:600;border-bottom:1px solid #EDF0F5">{escape(email)}</td>
              </tr>
              {fields_html}
            </table>

            {photos_html}

            <!-- Divider -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:0 40px"><div style="height:1px;background-color:#EDF0F5"></div></td></tr>
            </table>

            <!-- Prijsoverzicht section -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:24px 40px 12px 40px">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:3px;background-color:#00CFFF;border-radius:2px"></td>
                    <td style="padding-left:10px">
                      <p style="margin:0;font-family:Georgia,serif;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#8993A4;font-weight:400">Prijsoverzicht</p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              {price_lines_html}
            </table>

            <!-- Totals card -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:12px 0 0 0">
              <tr><td style="padding:0 20px">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F7F8FC;border-radius:10px">
                  <tr>
                    <td style="padding:14px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#6B7280">Subtotaal excl. BTW</td>
                    <td style="padding:14px 20px;text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#4A5568;font-weight:500">&euro;{pricing.subtotaal_excl_btw:.2f}</td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px 14px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#6B7280">BTW 21%</td>
                    <td style="padding:0 20px 14px 20px;text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#4A5568">&euro;{pricing.btw_bedrag:.2f}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:0 20px"><div style="height:1px;background-color:#DFE3ED"></div></td>
                  </tr>
                  <tr>
                    <td style="padding:16px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:20px;font-weight:700;color:#0D1B3E">Totaal incl. BTW</td>
                    <td style="padding:16px 20px;text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:20px;font-weight:700;color:#0D1B3E">&euro;{pricing.totaal_incl_btw:.2f}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- Action buttons -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:32px 40px 12px 40px" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:0 6px">
                      <a href="{escape(approve_url)}" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.2px">Goedkeuren &amp; versturen</a>
                    </td>
                    <td style="padding:0 6px">
                      <a href="{escape(edit_url)}" style="display:inline-block;background-color:#F97316;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.2px">Wijzigen</a>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

          </td></tr>

          <!-- Footer -->
          <tr><td style="background-color:#F7F8FC;padding:20px 40px;border-radius:0 0 12px 12px;border:1px solid #E2E6EF;border-top:none">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#A0A8B8">Automatisch gegenereerd door Frontlix</p>
                </td>
                <td align="right">
                  <p style="margin:0;font-family:Georgia,serif;font-size:11px;color:#A0A8B8;letter-spacing:0.3px">frontlix.com</p>
                </td>
              </tr>
            </table>
          </td></tr>

        </table>
      </td></tr>
    </table>
    </body>
    </html>
    """

    # Download PDF and attach if available
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
            print(f"[mail] Failed to download PDF for attachment: {e}")

    _send_email(
        to=to_email,
        subject=f"Offerte ter goedkeuring — {naam} ({branche_label})",
        html_body=html,
        attachments=attachments,
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
