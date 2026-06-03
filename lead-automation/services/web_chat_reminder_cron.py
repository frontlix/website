"""Web-chat reminder cron (Pakket 4b).

Every hour, find leads where the magic-link mail was sent >24h ago, the customer
has not engaged (`updated_at` close to `web_chat_link_sent_at`), and no reminder
has been sent yet. Send one polite reminder email, then never again.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from html import escape

from config import get_settings
from services.mail import _send_email
from services.supabase import get_supabase


DEFAULT_INTERVAL_S = 3600  # 1 hour
REMINDER_AGE_HOURS = 24


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _reminder_html(naam: str, link: str) -> str:
    font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
    return f"""\
<div style="font-family:{font};max-width:560px;margin:0 auto;padding:24px;color:#1A1A1A">
  <h2 style="margin:0 0 12px;font-size:18px">Hoi {escape(naam) or 'daar'},</h2>
  <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
    Gisteren stuurden we je een chat-link omdat WhatsApp niet werkte voor je nummer.
    Je kunt de demo nog altijd in je browser afmaken via:
  </p>
  <p style="margin:20px 0">
    <a href="{escape(link)}" style="display:inline-block;background:#1A56FF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">Open chat</a>
  </p>
  <p style="margin:12px 0;font-size:12px;color:#666">Geen interesse meer? Dan kun je deze mail negeren, we sturen niets meer.</p>
</div>
"""


async def _scan_once() -> int:
    if not get_settings().web_chat_fallback_enabled:
        return 0

    sb = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=REMINDER_AGE_HOURS)).isoformat()
    try:
        resp = (
            sb.table("leads").select("id, naam, email, web_chat_token, web_chat_link_sent_at, web_chat_last_reminder_at")
            .lt("web_chat_link_sent_at", cutoff)
            .is_("web_chat_last_reminder_at", "null")
            .not_.is_("web_chat_token", "null")
            .neq("status", "appointment_booked")
            .limit(50)
            .execute()
        )
    except Exception as e:
        print(f"[web-chat-reminder-cron] query failed: {e}")
        return 0

    rows = resp.data or []
    if not rows:
        return 0
    print(f"[web-chat-reminder-cron] {len(rows)} reminder-eligible lead(s)")

    base = get_settings().site_url.rstrip("/")
    sent = 0
    for lead in rows:
        if not lead.get("email") or not lead.get("web_chat_token"):
            continue
        link = f"{base}/chat/{lead['web_chat_token']}"
        try:
            # Blocking smtplib-send offloaden naar een worker-thread zodat de
            # async cron-loop niet blokkeert tijdens TLS-handshake + SMTP.
            await asyncio.to_thread(
                _send_email,
                to=lead["email"],
                subject="Reminder: maak je Frontlix demo af",
                html_body=_reminder_html(lead.get("naam") or "", link),
            )
            sb.table("leads").update({
                "web_chat_last_reminder_at": _now_iso(),
                "updated_at": _now_iso(),
            }).eq("id", lead["id"]).execute()
            sent += 1
        except Exception as e:
            print(f"[web-chat-reminder-cron] mail failed for lead {lead['id']}: {e}")
    return sent


async def start(interval_seconds: int = DEFAULT_INTERVAL_S) -> None:
    print(f"[web-chat-reminder-cron] starting (interval={interval_seconds}s, age={REMINDER_AGE_HOURS}h)")
    while True:
        try:
            await _scan_once()
        except asyncio.CancelledError:
            print("[web-chat-reminder-cron] cancelled")
            raise
        except Exception as e:
            print(f"[web-chat-reminder-cron] iteration error: {e}")
        await asyncio.sleep(interval_seconds)
