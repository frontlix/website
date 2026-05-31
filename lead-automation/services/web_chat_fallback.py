"""Web-chat fallback — when the WhatsApp opening template fails to deliver.

Generates a one-time token for the lead, persists it, and (if enabled) emails
the customer a magic-link to /chat/<token> so they can continue the same
conversation in the browser without WhatsApp.

WEB_CHAT_FALLBACK_ENABLED=false → token still generated + logged, but no mail
sent. Lets you trial the detection logic in production without spamming.
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from html import escape
from typing import Optional

from config import get_settings
from services.mail import _send_email


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _magic_link(token: str) -> str:
    base = get_settings().site_url.rstrip("/")
    return f"{base}/chat/{token}"


def _email_html(naam: str, link: str) -> str:
    font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
    return f"""\
<div style="font-family:{font};max-width:560px;margin:0 auto;padding:24px;color:#1A1A1A">
  <h2 style="margin:0 0 12px;font-size:18px">Hoi {escape(naam) or 'daar'},</h2>
  <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
    Het lijkt erop dat WhatsApp je niet bereikt op het door jou opgegeven nummer.
    Geen probleem — je kunt de demo gewoon in je browser afmaken via onderstaande link.
    De link werkt 1x en is persoonlijk voor jou.
  </p>
  <p style="margin:20px 0">
    <a href="{escape(link)}" style="display:inline-block;background:#1A56FF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">Open chat</a>
  </p>
  <p style="margin:12px 0;font-size:12px;color:#666">Werkt de knop niet? Plak deze URL in je browser:<br>{escape(link)}</p>
</div>
"""


async def trigger_web_chat_fallback(lead_id: str, *, reason: str = "delivery_failed") -> Optional[str]:
    """Generate a token + (if enabled) send the magic-link mail.

    Idempotent: if `web_chat_token` is already set on the lead, returns it
    without re-sending the mail. Returns the token, or None if the lead is
    unknown / has no email.
    """
    from services.supabase import get_supabase
    sb = get_supabase()
    resp = sb.table("leads").select("*").eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        print(f"[web-chat-fallback] lead {lead_id} not found")
        return None
    lead = rows[0]

    if lead.get("web_chat_token"):
        print(f"[web-chat-fallback] lead {lead_id} already has token (idempotent)")
        return lead["web_chat_token"]

    if not lead.get("email"):
        print(f"[web-chat-fallback] lead {lead_id} has no email — cannot fallback (reason={reason})")
        return None

    token = uuid.uuid4().hex
    sb.table("leads").update({
        "web_chat_token": token,
        "web_chat_link_sent_at": _now_iso(),
        "kanaal": "web_chat",
        "updated_at": _now_iso(),
    }).eq("id", lead_id).execute()

    enabled = get_settings().web_chat_fallback_enabled
    link = _magic_link(token)
    print(f"[web-chat-fallback] lead {lead_id} token={token[:8]}… link={link} reason={reason} mail_enabled={enabled}")

    if enabled:
        try:
            # Blocking smtplib-send offloaden naar een worker-thread zodat de
            # async event-loop niet blokkeert tijdens TLS-handshake + SMTP.
            await asyncio.to_thread(
                _send_email,
                to=lead["email"],
                subject="Maak je Frontlix demo af in je browser",
                html_body=_email_html(lead.get("naam") or "", link),
            )
        except Exception as e:
            print(f"[web-chat-fallback] mail send failed for lead {lead_id}: {e}")

    return token


def detect_template_failure_status_event(value: dict) -> Optional[tuple[str, str]]:
    """Extract (wa_message_id, error_code_str) from a Meta status webhook payload
    when it represents a failed delivery. Returns None for non-status payloads or
    for successful deliveries."""
    statuses = value.get("statuses") or []
    if not statuses:
        return None
    s = statuses[0]
    if s.get("status") != "failed":
        return None
    msg_id = s.get("id")
    errors = s.get("errors") or []
    if not msg_id or not errors:
        return None
    code = errors[0].get("code")
    return str(msg_id), str(code) if code is not None else ""


# Error codes that signal "customer can't receive WhatsApp" → trigger fallback.
# 131026 is the canonical Meta error for "Message Undeliverable" (recipient not on WA).
FALLBACK_ERROR_CODES = {"131026"}
