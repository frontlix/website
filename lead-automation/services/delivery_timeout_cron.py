"""Delivery-timeout cron (Pakket 4b).

Every minute, find leads where the WhatsApp opening template was sent >5 min
ago and no status event has arrived (web_chat_token still NULL, lead still
in awaiting_choice/collecting). Trigger the web-chat fallback so the customer
gets a magic-link instead of waiting forever for WhatsApp.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from services.supabase import get_supabase
from services.web_chat_fallback import trigger_web_chat_fallback


DEFAULT_INTERVAL_S = 60
TIMEOUT_MINUTES = 5


async def _scan_once() -> int:
    sb = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=TIMEOUT_MINUTES)).isoformat()
    try:
        resp = (
            sb.table("leads").select("id, telefoon, opening_template_sent_at, status, web_chat_token, message_count")
            .lt("opening_template_sent_at", cutoff)
            .is_("web_chat_token", "null")
            .in_("status", ["awaiting_choice", "collecting"])
            .limit(50)
            .execute()
        )
    except Exception as e:
        print(f"[delivery-timeout-cron] query failed: {e}")
        return 0

    raw_rows = resp.data or []
    # An engaged lead (message_count > 0) has clearly received the opening template
    # AND replied, so WhatsApp delivery is working, never fallback on them, even
    # if Meta's status webhook was missed. Filter them out here so we don't spam
    # the "your WhatsApp isn't reaching you" mail once they finally drop their email.
    rows = [r for r in raw_rows if (r.get("message_count") or 0) == 0]
    if not rows:
        return 0
    print(f"[delivery-timeout-cron] {len(rows)} stale lead(s) detected (filtered {len(raw_rows) - len(rows)} engaged)")
    triggered = 0
    for lead in rows:
        try:
            token = await trigger_web_chat_fallback(lead["id"], reason="delivery_timeout")
            if token:
                triggered += 1
        except Exception as e:
            print(f"[delivery-timeout-cron] trigger failed for lead {lead['id']}: {e}")
    return triggered


async def start(interval_seconds: int = DEFAULT_INTERVAL_S) -> None:
    print(f"[delivery-timeout-cron] starting (interval={interval_seconds}s, timeout={TIMEOUT_MINUTES}min)")
    while True:
        try:
            await _scan_once()
        except asyncio.CancelledError:
            print("[delivery-timeout-cron] cancelled")
            raise
        except Exception as e:
            print(f"[delivery-timeout-cron] iteration error: {e}")
        await asyncio.sleep(interval_seconds)
