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
    font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"

    fields_html = "".join(
        f'<tr>'
        f'<td style="padding:10px 0;font-family:{font};font-size:13px;color:#7A8599;width:40%;border-bottom:1px solid #F0F2F5">{escape(f["label"])}</td>'
        f'<td style="padding:10px 0;font-family:{font};font-size:14px;color:#1A1A1A;font-weight:500;border-bottom:1px solid #F0F2F5">{escape(f["value"])}</td>'
        f'</tr>'
        for f in fields
    )

    price_lines_html = "".join(
        f'<tr>'
        f'<td style="padding:9px 0;font-family:{font};font-size:14px;color:#555">{escape(line.label)}</td>'
        f'<td style="padding:9px 0;text-align:right;font-family:{font};font-size:14px;color:#1A1A1A;font-weight:600">&euro;{line.total:.2f}</td>'
        f'</tr>'
        for line in pricing.lines
    )

    photos_html = ""
    if photo_urls:
        thumbs = "".join(
            f'<td style="padding:0 3px"><img src="{escape(url)}" width="72" height="72" style="display:block;border-radius:8px;object-fit:cover" /></td>'
            for url in photo_urls[:6]
        )
        photos_html = f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0"><tr>{thumbs}</tr></table>'

    logo_url = "https://frontlix.com/logo.png"

    html = f"""
    <!DOCTYPE html>
    <html lang="nl">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background-color:#F0F2F5;-webkit-font-smoothing:antialiased">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5">
      <tr><td align="center" style="padding:40px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%">

          <!-- Logo + naam -->
          <tr><td style="padding:0 0 24px 0" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle"><img src="{logo_url}" width="36" height="36" alt="Frontlix" style="display:block" /></td>
                <td style="vertical-align:middle;padding-left:10px">
                  <span style="font-family:{font};font-size:20px;font-weight:700;color:#1A1A1A;letter-spacing:-0.3px"><span style="color:#1A56FF">Front</span><span style="color:#00CFFF">lix</span></span>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Main card -->
          <tr><td style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06)">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">

              <!-- Gradient top bar -->
              <tr><td style="height:4px;background:linear-gradient(90deg,#1A56FF,#00CFFF);font-size:0;line-height:0">&nbsp;</td></tr>

              <!-- Header -->
              <tr><td style="padding:32px 40px 24px 40px">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin:0 0 4px 0;font-family:{font};font-size:13px;font-weight:600;color:#1A56FF;text-transform:uppercase;letter-spacing:0.8px">Nieuwe aanvraag</p>
                      <h1 style="margin:0;font-family:{font};font-size:22px;font-weight:700;color:#1A1A1A">Offerte ter goedkeuring</h1>
                    </td>
                    <td align="right" valign="top">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr><td style="background-color:#EEF4FF;border-radius:20px;padding:6px 16px">
                          <span style="font-family:{font};font-size:12px;font-weight:600;color:#1A56FF">{escape(branche_label)}</span>
                        </td></tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td></tr>

              <!-- Divider -->
              <tr><td style="padding:0 40px"><table role="presentation" width="100%"><tr><td style="height:1px;background-color:#F0F2F5"></td></tr></table></td></tr>

              <!-- Klantgegevens -->
              <tr><td style="padding:24px 40px 0 40px">
                <p style="margin:0 0 14px 0;font-family:{font};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:#B0B8C9">Klantgegevens</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:10px 0;font-family:{font};font-size:13px;color:#7A8599;width:40%;border-bottom:1px solid #F0F2F5">Naam</td>
                    <td style="padding:10px 0;font-family:{font};font-size:14px;color:#1A1A1A;font-weight:500;border-bottom:1px solid #F0F2F5">{escape(naam)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;font-family:{font};font-size:13px;color:#7A8599;border-bottom:1px solid #F0F2F5">Telefoon</td>
                    <td style="padding:10px 0;font-family:{font};font-size:14px;color:#1A1A1A;font-weight:500;border-bottom:1px solid #F0F2F5">+{escape(telefoon)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;font-family:{font};font-size:13px;color:#7A8599;border-bottom:1px solid #F0F2F5">Email</td>
                    <td style="padding:10px 0;font-family:{font};font-size:14px;color:#1A56FF;font-weight:500;border-bottom:1px solid #F0F2F5">{escape(email)}</td>
                  </tr>
                  {fields_html}
                </table>
              </td></tr>

              {f'<tr><td style="padding:20px 40px 0 40px">{photos_html}</td></tr>' if photos_html else ''}

              <!-- Divider -->
              <tr><td style="padding:20px 40px 0 40px"><table role="presentation" width="100%"><tr><td style="height:1px;background-color:#F0F2F5"></td></tr></table></td></tr>

              <!-- Prijsoverzicht -->
              <tr><td style="padding:24px 40px 0 40px">
                <p style="margin:0 0 14px 0;font-family:{font};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:#B0B8C9">Prijsoverzicht</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  {price_lines_html}
                </table>
              </td></tr>

              <!-- Totals -->
              <tr><td style="padding:16px 40px 0 40px">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F8F9FC;border-radius:12px">
                  <tr>
                    <td style="padding:14px 20px 4px 20px;font-family:{font};font-size:13px;color:#7A8599">Subtotaal excl. BTW</td>
                    <td style="padding:14px 20px 4px 20px;text-align:right;font-family:{font};font-size:13px;color:#555;font-weight:500">&euro;{pricing.subtotaal_excl_btw:.2f}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 20px 14px 20px;font-family:{font};font-size:13px;color:#7A8599">BTW 21%</td>
                    <td style="padding:4px 20px 14px 20px;text-align:right;font-family:{font};font-size:13px;color:#555">&euro;{pricing.btw_bedrag:.2f}</td>
                  </tr>
                  <tr><td colspan="2" style="padding:0 20px"><div style="height:1px;background-color:#E5E7EB"></div></td></tr>
                  <tr>
                    <td style="padding:16px 20px;font-family:{font};font-size:18px;font-weight:700;color:#1A1A1A">Totaal incl. BTW</td>
                    <td style="padding:16px 20px;text-align:right;font-family:{font};font-size:18px;font-weight:700;color:#1A56FF">&euro;{pricing.totaal_incl_btw:.2f}</td>
                  </tr>
                </table>
              </td></tr>

              <!-- Buttons (stacked for mobile compatibility) -->
              <tr><td style="padding:28px 40px 8px 40px" align="center">
                <a href="{escape(approve_url)}" style="display:block;background-color:#16a34a;color:#ffffff;font-family:{font};font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;text-align:center">Goedkeuren &amp; versturen</a>
              </td></tr>
              <tr><td style="padding:0 40px 32px 40px" align="center">
                <a href="{escape(edit_url)}" style="display:block;background-color:#F97316;color:#ffffff;font-family:{font};font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;text-align:center">Wijzigen</a>
              </td></tr>

            </table>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:24px 0 0 0" align="center">
            <p style="margin:0;font-family:{font};font-size:12px;color:#B0B8C9">Automatisch gegenereerd door <span style="color:#1A56FF;font-weight:500">Front</span><span style="color:#00CFFF;font-weight:500">lix</span></p>
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
    """Send the approved quote to the customer with a scheduling link and PDF attachment."""
    font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
    logo_url = "https://frontlix.com/logo.png"
    voornaam = naam.split()[0] if naam else "daar"

    html = f"""
    <!DOCTYPE html>
    <html lang="nl">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background-color:#F0F2F5;-webkit-font-smoothing:antialiased">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5">
      <tr><td align="center" style="padding:40px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%">

          <!-- Logo + naam -->
          <tr><td style="padding:0 0 24px 0" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle"><img src="{logo_url}" width="36" height="36" alt="Frontlix" style="display:block" /></td>
                <td style="vertical-align:middle;padding-left:10px">
                  <span style="font-family:{font};font-size:20px;font-weight:700;letter-spacing:-0.3px"><span style="color:#1A56FF">Front</span><span style="color:#00CFFF">lix</span></span>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Main card -->
          <tr><td style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06)">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">

              <!-- Gradient top bar -->
              <tr><td style="height:4px;background:linear-gradient(90deg,#1A56FF,#00CFFF);font-size:0;line-height:0">&nbsp;</td></tr>

              <!-- Content -->
              <tr><td style="padding:40px 40px 20px 40px">
                <h1 style="margin:0 0 20px 0;font-family:{font};font-size:22px;font-weight:700;color:#1A1A1A">Je offerte staat klaar!</h1>
                <p style="margin:0 0 16px 0;font-family:{font};font-size:15px;color:#555;line-height:1.6">Hoi {escape(voornaam)},</p>
                <p style="margin:0 0 16px 0;font-family:{font};font-size:15px;color:#555;line-height:1.6">Goed nieuws, je offerte voor {escape(branche_label)} is goedgekeurd en staat klaar. Je vindt de offerte als PDF bijlage bij deze email.</p>
                <p style="margin:0 0 8px 0;font-family:{font};font-size:15px;color:#555;line-height:1.6">Wil je een gratis kennismakingsgesprek inplannen? Klik hieronder om een moment te kiezen.</p>
              </td></tr>

              <!-- Schedule button -->
              <tr><td style="padding:12px 40px 36px 40px" align="center">
                <a href="{escape(schedule_url)}" style="display:inline-block;background-color:#1A56FF;color:#ffffff;font-family:{font};font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px">Afspraak inplannen</a>
              </td></tr>

            </table>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:24px 0 0 0" align="center">
            <p style="margin:0;font-family:{font};font-size:12px;color:#B0B8C9">Automatisch gegenereerd door <span style="color:#1A56FF;font-weight:500">Front</span><span style="color:#00CFFF;font-weight:500">lix</span></p>
          </td></tr>

        </table>
      </td></tr>
    </table>
    </body>
    </html>
    """

    # Download PDF and attach
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
            print(f"[mail] Failed to download PDF for customer email attachment: {e}")

    _send_email(
        to=to_email,
        subject=f"Je offerte voor {branche_label}, {voornaam}",
        html_body=html,
        attachments=attachments,
    )
