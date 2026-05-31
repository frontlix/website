"""Email service — approval emails, customer quote emails, appointment confirmations via SMTP."""
from __future__ import annotations

import asyncio
import smtplib
import ssl
import uuid
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from html import escape
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import httpx

from config import get_settings
from models.branches import PricingResult

NL_WEEKDAYS_FULL = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
NL_MONTHS_FULL = ["", "januari", "februari", "maart", "april", "mei", "juni",
                  "juli", "augustus", "september", "oktober", "november", "december"]


def build_google_calendar_url(
    summary: str,
    description: str,
    start_utc: datetime,
    end_utc: datetime,
    location: str = "",
) -> str:
    """Google Calendar 'add event' deep-link. Geen API-call nodig; alleen een
    gestructureerde GET-URL die Google's render-endpoint pre-vult."""
    fmt = "%Y%m%dT%H%M%SZ"
    params = {
        "action": "TEMPLATE",
        "text": summary,
        "dates": f"{start_utc.strftime(fmt)}/{end_utc.strftime(fmt)}",
        "details": description,
    }
    if location:
        params["location"] = location
    return "https://calendar.google.com/calendar/render?" + urlencode(params)


def build_ics(
    uid: str,
    summary: str,
    description: str,
    start_utc: datetime,
    end_utc: datetime,
    location: str = "",
    organizer_email: str = "info@frontlix.com",
) -> bytes:
    """Genereer RFC-5545 .ics inline. Hang aan email als attachment; Apple Mail,
    Outlook en de meeste andere clients tonen automatisch 'Toevoegen aan agenda'."""
    fmt = "%Y%m%dT%H%M%SZ"
    now_fmt = datetime.now(timezone.utc).strftime(fmt)

    def esc(s: str) -> str:
        return s.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Frontlix//Lead Automation//NL",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{now_fmt}",
        f"DTSTART:{start_utc.strftime(fmt)}",
        f"DTEND:{end_utc.strftime(fmt)}",
        f"SUMMARY:{esc(summary)}",
        f"DESCRIPTION:{esc(description)}",
    ]
    if location:
        lines.append(f"LOCATION:{esc(location)}")
    lines.append(f"ORGANIZER:mailto:{organizer_email}")
    lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return ("\r\n".join(lines) + "\r\n").encode("utf-8")


def _nl(n: float) -> str:
    """Format number as Dutch currency string without € sign: 16335.00 → '16.335,00'.
    Negatives keep their sign. Used voor alle bedragen in de mail templates."""
    try:
        v = float(n)
    except (TypeError, ValueError):
        return str(n)
    sign = "-" if v < 0 else ""
    s = f"{abs(v):,.2f}"
    # English locale → swap separators (1,234.56 → 1.234,56)
    return f"{sign}{s.replace(',', '§').replace('.', ',').replace('§', '.')}"


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

    # Geverifieerde TLS: create_default_context() doet standaard check_hostname=True
    # en CERT_REQUIRED, dus het servercertificaat wordt tegen de systeem-CA's
    # gevalideerd (beschermt tegen MITM op credentials + mailinhoud).
    context = ssl.create_default_context()
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

    # Label/value rows: padding-right op de label-cel zorgt voor een duidelijke
    # gap tussen kolommen (anders plakte 'isolatie gewenst' direct tegen 'ja' aan
    # op mobiel waar kolommen smaller worden). vertical-align:top → multi-line
    # labels lijnen netjes uit met hun value.
    fields_html = "".join(
        f'<tr>'
        f'<td style="padding:12px 18px 12px 0;font-family:{font};font-size:13px;color:#7A8599;width:42%;border-bottom:1px solid #F0F2F5;vertical-align:top">{escape(f["label"])}</td>'
        f'<td style="padding:12px 0 12px 4px;font-family:{font};font-size:14px;color:#1A1A1A;font-weight:500;border-bottom:1px solid #F0F2F5;vertical-align:top">{escape(f["value"])}</td>'
        f'</tr>'
        for f in fields
    )

    price_lines_html = "".join(
        f'<tr>'
        f'<td style="padding:11px 14px 11px 0;font-family:{font};font-size:14px;color:#555;vertical-align:top">{escape(line.label)}</td>'
        f'<td style="padding:11px 0;text-align:right;font-family:{font};font-size:14px;color:#1A1A1A;font-weight:600;white-space:nowrap;vertical-align:top">&euro;&nbsp;{_nl(line.total)}</td>'
        f'</tr>'
        for line in pricing.lines
    )

    photos_html = ""
    if photo_urls:
        # Compact thumbnails ~200x200, side-by-side via inline-block (wrappen
        # automatisch op kleine mail-clients). Klikbaar: <a target=_blank>
        # opent het originele Supabase-storage-bestand op full-size.
        blocks = "".join(
            f'<a href="{escape(url)}" target="_blank" style="display:inline-block;margin:0 8px 8px 0;text-decoration:none">'
            f'<img src="{escape(url)}" alt="Foto van klant" width="200" height="200" '
            f'style="display:block;width:200px;height:200px;object-fit:cover;border-radius:12px;border:1px solid #E5E7EB" />'
            f'</a>'
            for url in photo_urls[:6]
        )
        photos_html = (
            f'<p style="margin:0 0 12px 0;font-family:{font};font-size:11px;font-weight:700;'
            f'text-transform:uppercase;letter-spacing:1.2px;color:#1A56FF">Foto\'s van de klant</p>'
            f'<div>{blocks}</div>'
        )

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
                  <span style="font-family:{font};font-size:20px;font-weight:700;color:#1A1A1A;letter-spacing:-0.3px"><span style="color:#0F1729">Front</span><span style="color:#00CFFF">lix</span></span>
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
                <p style="margin:0 0 14px 0;font-family:{font};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#1A56FF">Klantgegevens</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:12px 18px 12px 0;font-family:{font};font-size:13px;color:#7A8599;width:42%;border-bottom:1px solid #F0F2F5;vertical-align:top">Naam</td>
                    <td style="padding:12px 0 12px 4px;font-family:{font};font-size:14px;color:#1A1A1A;font-weight:500;border-bottom:1px solid #F0F2F5;vertical-align:top">{escape(naam)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 18px 12px 0;font-family:{font};font-size:13px;color:#7A8599;border-bottom:1px solid #F0F2F5;vertical-align:top">Telefoon</td>
                    <td style="padding:12px 0 12px 4px;font-family:{font};font-size:14px;color:#1A1A1A;font-weight:500;border-bottom:1px solid #F0F2F5;vertical-align:top">+{escape(telefoon)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 18px 12px 0;font-family:{font};font-size:13px;color:#7A8599;border-bottom:1px solid #F0F2F5;vertical-align:top">Email</td>
                    <td style="padding:12px 0 12px 4px;font-family:{font};font-size:14px;color:#1A56FF;font-weight:500;border-bottom:1px solid #F0F2F5;vertical-align:top">{escape(email)}</td>
                  </tr>
                  {fields_html}
                </table>
              </td></tr>

              {f'<tr><td style="padding:20px 40px 0 40px">{photos_html}</td></tr>' if photos_html else ''}

              <!-- Divider -->
              <tr><td style="padding:20px 40px 0 40px"><table role="presentation" width="100%"><tr><td style="height:1px;background-color:#F0F2F5"></td></tr></table></td></tr>

              <!-- Prijsoverzicht -->
              <tr><td style="padding:24px 40px 0 40px">
                <p style="margin:0 0 14px 0;font-family:{font};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#1A56FF">Prijsoverzicht</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  {price_lines_html}
                </table>
              </td></tr>

              <!-- Totals -->
              <tr><td style="padding:16px 40px 0 40px">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F8F9FC;border-radius:12px">
                  <tr>
                    <td style="padding:14px 20px 4px 20px;font-family:{font};font-size:13px;color:#7A8599">Subtotaal excl. BTW</td>
                    <td style="padding:14px 20px 4px 20px;text-align:right;font-family:{font};font-size:13px;color:#555;font-weight:500;white-space:nowrap">&euro;&nbsp;{_nl(pricing.subtotaal_excl_btw)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 20px 14px 20px;font-family:{font};font-size:13px;color:#7A8599">BTW 21%</td>
                    <td style="padding:4px 20px 14px 20px;text-align:right;font-family:{font};font-size:13px;color:#555;white-space:nowrap">&euro;&nbsp;{_nl(pricing.btw_bedrag)}</td>
                  </tr>
                  <tr><td colspan="2" style="padding:0 20px"><div style="height:1px;background-color:#E5E7EB"></div></td></tr>
                  <tr>
                    <td style="padding:16px 20px;font-family:{font};font-size:18px;font-weight:700;color:#1A1A1A">Totaal incl. BTW</td>
                    <td style="padding:16px 20px;text-align:right;font-family:{font};font-size:18px;font-weight:700;color:#1A56FF;white-space:nowrap">&euro;&nbsp;{_nl(pricing.totaal_incl_btw)}</td>
                  </tr>
                </table>
              </td></tr>

              <!-- Buttons (side-by-side, met icons; nested table = max compatibility) -->
              <!-- white-space:nowrap voorkomt dat icon + tekst over 2 regels splitsen op smalle mobile-clients -->
              <tr><td style="padding:24px 24px 12px 24px" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto">
                  <tr>
                    <td style="padding:0 6px">
                      <a href="{escape(approve_url)}" style="display:inline-block;background-color:#22C55E;color:#ffffff;font-family:{font};font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:12px;letter-spacing:-0.1px;white-space:nowrap;mso-padding-alt:0">&#10003;&nbsp;Goedkeuren</a>
                    </td>
                    <td style="padding:0 6px">
                      <a href="{escape(edit_url)}" style="display:inline-block;background-color:#F59E0B;color:#ffffff;font-family:{font};font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:12px;letter-spacing:-0.1px;white-space:nowrap;mso-padding-alt:0">&#9998;&nbsp;Wijzigen</a>
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:4px 40px 32px 40px" align="center">
                <p style="margin:0;font-family:{font};font-size:12px;color:#8A94A6;text-align:center;line-height:1.5">Bij goedkeuring wordt de offerte automatisch naar de klant verzonden via WhatsApp en e-mail.</p>
              </td></tr>

            </table>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:24px 0 0 0" align="center">
            <p style="margin:0;font-family:{font};font-size:12px;color:#B0B8C9">Automatisch gegenereerd door <span style="color:#0F1729;font-weight:500">Front</span><span style="color:#00CFFF;font-weight:500">lix</span></p>
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
            pdf_data = httpx.get(pdf_url, timeout=15.0).content
            attachments.append({
                "filename": f"Offerte-{branche_label}.pdf",
                "data": pdf_data,
                "content_type": "application/pdf",
            })
        except Exception as e:
            print(f"[mail] Failed to download PDF for attachment: {e}")

    # Blocking smtplib draait in een thread zodat de async event-loop niet
    # blokkeert; to_thread re-raiset excepties in deze coroutine.
    await asyncio.to_thread(
        _send_email,
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
                  <span style="font-family:{font};font-size:20px;font-weight:700;letter-spacing:-0.3px"><span style="color:#0F1729">Front</span><span style="color:#00CFFF">lix</span></span>
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
            <p style="margin:0;font-family:{font};font-size:12px;color:#B0B8C9">Automatisch gegenereerd door <span style="color:#0F1729;font-weight:500">Front</span><span style="color:#00CFFF;font-weight:500">lix</span></p>
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
            pdf_data = httpx.get(pdf_url, timeout=15.0).content
            attachments.append({
                "filename": f"Offerte-{branche_label}.pdf",
                "data": pdf_data,
                "content_type": "application/pdf",
            })
        except Exception as e:
            print(f"[mail] Failed to download PDF for customer email attachment: {e}")

    # Blocking smtplib draait in een thread zodat de async event-loop niet
    # blokkeert; to_thread re-raiset excepties in deze coroutine.
    await asyncio.to_thread(
        _send_email,
        to=to_email,
        subject=f"Je offerte voor {branche_label}, {voornaam}",
        html_body=html,
        attachments=attachments,
    )


async def send_appointment_confirmation_email(
    to_email: str,
    naam: str,
    branche_label: str,
    appointment_label: str,
    appointment_label_short: str,
    appointment_duration_min: int,
    start_utc: datetime,
    end_utc: datetime,
    tz: ZoneInfo,
    approval_token: str,
) -> None:
    """Stuur bevestigingsmail met Frontlix-gebrande layout en TWEE gelijkwaardige
    agenda-knoppen: Google Agenda (primary, blauwe vulling) → deep-link naar
    calendar.google.com; Apple Agenda (secondary, witte vulling + blauwe rand) →
    /calendar/{token}.ics endpoint dat het .ics-bestand on-the-fly serveert.

    Geen .ics-attachment meer in de mail zelf — één canonical pad: knop →
    endpoint → download. Voorkomt de 'Eén bijlage'-footer in Gmail en is
    minder verwarrend voor de klant.
    """
    font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
    voornaam = naam.split()[0] if naam else "daar"
    logo_url = "https://frontlix.com/logo.png"
    site_url = (get_settings().site_url or "").rstrip("/")
    apple_calendar_url = f"{site_url}/calendar/{approval_token}.ics"

    # Localized labels
    local_start = start_utc.astimezone(tz)
    local_end = end_utc.astimezone(tz)
    dag_naam = NL_WEEKDAYS_FULL[local_start.weekday()].capitalize()
    maand_naam = NL_MONTHS_FULL[local_start.month]
    datum_label = f"{dag_naam} {local_start.day} {maand_naam} {local_start.year}"
    starttijd = local_start.strftime("%H:%M")
    eindtijd = local_end.strftime("%H:%M")

    # Calendar links
    cal_summary = f"Frontlix {appointment_label} ({branche_label})"
    cal_description = (
        f"{appointment_label.capitalize()} van {appointment_duration_min} minuten.\n"
        f"Klant: {naam}\nBranche: {branche_label}\n"
        f"Bevestigd door Frontlix."
    )
    google_url = build_google_calendar_url(
        summary=cal_summary,
        description=cal_description,
        start_utc=start_utc,
        end_utc=end_utc,
    )
    # Geen ics_bytes meer als attachment — Apple-knop linkt naar /calendar/{token}.ics
    # endpoint dat het bestand on-the-fly serveert. Eén canonical pad voor de klant.

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
                  <span style="font-family:{font};font-size:20px;font-weight:700;letter-spacing:-0.3px"><span style="color:#0F1729">Front</span><span style="color:#00CFFF">lix</span></span>
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
              <tr><td style="padding:32px 40px 8px 40px">
                <p style="margin:0 0 4px 0;font-family:{font};font-size:13px;font-weight:700;color:#1A56FF;text-transform:uppercase;letter-spacing:1.2px">Bevestiging afspraak</p>
                <h1 style="margin:0;font-family:{font};font-size:22px;font-weight:700;color:#0F1729">Je afspraak is ingepland</h1>
              </td></tr>

              <!-- Body -->
              <tr><td style="padding:18px 40px 8px 40px">
                <p style="margin:0;font-family:{font};font-size:15px;color:#475569;line-height:1.6">Hoi {escape(voornaam)}, dank voor uw interesse in Frontlix. Hieronder vindt u de details van uw {escape(appointment_label_short)}.</p>
              </td></tr>

              <!-- Demo-notice — duidelijk maken dat dit een demonstratie is -->
              <tr><td style="padding:14px 40px 4px 40px">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px">
                  <tr><td style="padding:14px 18px">
                    <p style="margin:0 0 4px 0;font-family:{font};font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#1A56FF">Demonstratie</p>
                    <p style="margin:0;font-family:{font};font-size:13px;color:#1E3A8A;line-height:1.55">Deze e-mail is een voorbeeld van de automatische bevestiging die Frontlix namens uw bedrijf naar klanten verstuurt zodra zij een afspraak inplannen. De onderstaande afspraakgegevens zijn fictief en uitsluitend ter illustratie van het proces.</p>
                  </td></tr>
                </table>
              </td></tr>

              <!-- Detail-tabel -->
              <tr><td style="padding:18px 40px 0 40px">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:12px 18px 12px 0;font-family:{font};font-size:13px;color:#7A8599;width:38%;border-bottom:1px solid #F0F2F5;vertical-align:top">Soort afspraak</td>
                    <td style="padding:12px 0 12px 4px;font-family:{font};font-size:14px;color:#0F1729;font-weight:500;border-bottom:1px solid #F0F2F5;vertical-align:top">{escape(appointment_label.capitalize())}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 18px 12px 0;font-family:{font};font-size:13px;color:#7A8599;border-bottom:1px solid #F0F2F5;vertical-align:top">Datum</td>
                    <td style="padding:12px 0 12px 4px;font-family:{font};font-size:14px;color:#0F1729;font-weight:500;border-bottom:1px solid #F0F2F5;vertical-align:top">{escape(datum_label)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 18px 12px 0;font-family:{font};font-size:13px;color:#7A8599;border-bottom:1px solid #F0F2F5;vertical-align:top">Tijd</td>
                    <td style="padding:12px 0 12px 4px;font-family:{font};font-size:14px;color:#0F1729;font-weight:500;border-bottom:1px solid #F0F2F5;vertical-align:top">{starttijd} &ndash; {eindtijd}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 18px 12px 0;font-family:{font};font-size:13px;color:#7A8599;border-bottom:1px solid #F0F2F5;vertical-align:top">Duur</td>
                    <td style="padding:12px 0 12px 4px;font-family:{font};font-size:14px;color:#0F1729;font-weight:500;border-bottom:1px solid #F0F2F5;vertical-align:top">{appointment_duration_min} minuten</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 18px 12px 0;font-family:{font};font-size:13px;color:#7A8599;border-bottom:1px solid #F0F2F5;vertical-align:top">Branche</td>
                    <td style="padding:12px 0 12px 4px;font-family:{font};font-size:14px;color:#0F1729;font-weight:500;border-bottom:1px solid #F0F2F5;vertical-align:top">{escape(branche_label)}</td>
                  </tr>
                </table>
              </td></tr>

              <!-- Sectie: Voeg toe aan agenda (2 gelijkwaardige knoppen) -->
              <tr><td style="padding:28px 40px 8px 40px" align="center">
                <p style="margin:0 0 14px 0;font-family:{font};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#1A56FF;text-align:center">Voeg toe aan je agenda</p>
              </td></tr>
              <tr><td style="padding:0 24px" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto">
                  <tr>
                    <td align="center" style="padding:4px 8px">
                      <a href="{escape(google_url)}" target="_blank" style="display:inline-block;background:#1A56FF;color:#ffffff;font-family:{font};font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;letter-spacing:0.3px;min-width:160px;text-align:center;white-space:nowrap">Google Agenda</a>
                    </td>
                    <td align="center" style="padding:4px 8px">
                      <a href="{escape(apple_calendar_url)}" style="display:inline-block;background:#ffffff;color:#1A56FF;font-family:{font};font-size:14px;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:10px;letter-spacing:0.3px;border:2px solid #1A56FF;min-width:160px;text-align:center;white-space:nowrap">Apple Agenda</a>
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:14px 40px 0 40px" align="center">
                <p style="margin:0;font-family:{font};font-size:12px;color:#9CA3AF;line-height:1.5;text-align:center">De Apple-knop werkt ook voor Outlook en andere agenda-apps.</p>
              </td></tr>

              <!-- Afsluiter -->
              <tr><td style="padding:28px 40px 32px 40px">
                <p style="margin:0;font-family:{font};font-size:15px;color:#475569;line-height:1.6">Wij kijken ernaar uit.<br>
                <span style="color:#0F1729;font-weight:700">&mdash; <span style="color:#0F1729">Front</span><span style="color:#00CFFF">lix</span></span></p>
              </td></tr>

            </table>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:24px 0 0 0" align="center">
            <p style="margin:0;font-family:{font};font-size:12px;color:#B0B8C9"><span style="color:#0F1729;font-weight:500">Front</span><span style="color:#00CFFF;font-weight:500">lix</span> &middot; Automatisch verstuurde bevestiging</p>
          </td></tr>

        </table>
      </td></tr>
    </table>
    </body>
    </html>
    """

    # Geen attachments: Apple Agenda knop linkt naar /calendar/{token}.ics endpoint.
    # Blocking smtplib draait in een thread zodat de async event-loop niet
    # blokkeert; to_thread re-raiset excepties in deze coroutine.
    await asyncio.to_thread(
        _send_email,
        to=to_email,
        subject=f"Bevestiging: {appointment_label_short} op {datum_label}",
        html_body=html,
    )
