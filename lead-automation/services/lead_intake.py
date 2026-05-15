"""Shared lead-intake pipeline.

Used by both:
  - routes/demo.py (existing /demo/start endpoint — phone-only, sends template)
  - routes/external_webhook.py (Pakket 4a — full form payload, optional photos)

Side-effects: inserts a `leads` row, optionally downloads + uploads photos to the
shared `photos` storage bucket, and sends the WhatsApp opening template.

Stores `opening_template_sent_at` so the delivery-timeout cron can detect
template-send failures (errorcode 131026 etc.) and trigger the web-chat fallback.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from services.whatsapp import normalize_phone, send_demo_start_template

MAX_DEMOS_PER_NUMBER = 5
PHOTO_TIMEOUT_S = 15
PHOTO_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class IntakePayload:
    """Normalized intake input. Matches the HMAC-webhook form-submission schema."""
    naam: Optional[str] = None
    email: Optional[str] = None
    telefoon: str = ""
    branche: Optional[str] = None  # zonnepanelen | dakdekker | schoonmaak | None
    fotos: list[str] = field(default_factory=list)  # max 10 URLs
    # Branche-specific fields land in `collected_data` as-is.
    fields: dict[str, Any] = field(default_factory=dict)


class IntakeError(Exception):
    """Raised for caller-correctable issues (existing-lead conflict, rate-limit, etc.)."""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


async def _download_photo(url: str) -> Optional[tuple[bytes, str]]:
    """Fetch a photo URL with timeout + size cap + content-type check."""
    try:
        async with httpx.AsyncClient(timeout=PHOTO_TIMEOUT_S, follow_redirects=True) as client:
            r = await client.get(url)
        if r.status_code != 200:
            print(f"[intake] photo {url} → HTTP {r.status_code}")
            return None
        ct = r.headers.get("content-type", "")
        if not ct.startswith("image/"):
            print(f"[intake] photo {url} → non-image content-type {ct!r}")
            return None
        data = r.content
        if len(data) > PHOTO_MAX_BYTES:
            print(f"[intake] photo {url} → too large ({len(data)} bytes)")
            return None
        return data, ct
    except Exception as e:
        print(f"[intake] photo {url} failed: {e}")
        return None


async def _upload_photos_to_storage(lead_id: str, urls: list[str]) -> list[str]:
    """Download + upload photos in parallel. Failures are logged, not aborting."""
    from services.supabase import get_supabase
    sb = get_supabase()
    public_urls: list[str] = []

    async def one(idx: int, url: str) -> Optional[str]:
        dl = await _download_photo(url)
        if not dl:
            return None
        data, ct = dl
        ext = "jpg" if "jpeg" in ct or "jpg" in ct else (ct.split("/", 1)[1] if "/" in ct else "bin")
        path = f"lead-photos/{lead_id}/{int(time.time() * 1000)}-{idx}.{ext}"
        try:
            sb.storage.from_("photos").upload(path, data, {"content-type": ct, "upsert": "false"})
            return sb.storage.from_("photos").get_public_url(path)
        except Exception as e:
            print(f"[intake] storage upload {path} failed: {e}")
            return None

    results = await asyncio.gather(*[one(i, u) for i, u in enumerate(urls[:10])])
    for r in results:
        if r:
            public_urls.append(r)
    return public_urls


async def intake_lead(payload: IntakePayload, *, send_opening_template: bool = True) -> dict[str, Any]:
    """Create a lead and (optionally) send the opening WhatsApp template.

    Returns the inserted lead row (as dict). Raises IntakeError on conflict or rate-limit.
    """
    phone = normalize_phone(payload.telefoon)
    if not phone:
        raise IntakeError(400, "Telefoonnummer ontbreekt of is ongeldig.")

    from services.supabase import get_supabase
    sb = get_supabase()

    # Existing-active-lead guard — same rule as /demo/start.
    existing = (
        sb.table("leads").select("id, status").eq("telefoon", phone)
        .neq("status", "appointment_booked").limit(1).execute()
    )
    if existing.data:
        raise IntakeError(409, "Er loopt al een demo voor dit nummer. Check je WhatsApp!")

    # Rate-limit per number.
    all_leads = sb.table("leads").select("id", count="exact").eq("telefoon", phone).execute()
    if (all_leads.count or 0) >= MAX_DEMOS_PER_NUMBER:
        raise IntakeError(429, "Maximaal aantal demo-pogingen bereikt voor dit nummer.")

    # Initial collected_data: branche-fields land here so the bot doesn't ask them again.
    collected: dict[str, Any] = dict(payload.fields or {})

    # Awaiting_choice when no branche is given; collecting when branche is pre-selected
    # (matches the WhatsApp `_activate_branche` transition).
    status = "collecting" if payload.branche else "awaiting_choice"

    row: dict[str, Any] = {
        "telefoon": phone,
        "status": status,
        "collected_data": collected,
        "photo_urls": [],
        "photo_analyses": [],
        "message_count": 0,
        "kanaal": "whatsapp",
    }
    if payload.naam:
        row["naam"] = payload.naam
    if payload.email:
        row["email"] = payload.email
    if payload.branche:
        row["demo_type"] = payload.branche

    result = sb.table("leads").insert(row).execute()
    if not result.data:
        raise IntakeError(500, "Er ging iets mis bij het opslaan.")
    lead = result.data[0]

    # Photos: download + upload in parallel; tolerate individual failures.
    if payload.fotos:
        public_urls = await _upload_photos_to_storage(lead["id"], payload.fotos)
        if public_urls:
            # Persist URL list; vision-analysis happens later in the WhatsApp flow.
            sb.table("leads").update({
                "collected_data": {**collected, "photos": public_urls},
                "photo_urls": public_urls,
                "updated_at": _now_iso(),
            }).eq("id", lead["id"]).execute()
            lead["collected_data"] = {**collected, "photos": public_urls}
            lead["photo_urls"] = public_urls

    # Opening WhatsApp template.
    if send_opening_template:
        try:
            await send_demo_start_template(phone, payload.naam or "daar")
            sb.table("leads").update({
                "opening_template_sent_at": _now_iso(),
                "updated_at": _now_iso(),
            }).eq("id", lead["id"]).execute()
            lead["opening_template_sent_at"] = _now_iso()
        except Exception as e:
            print(f"[intake] opening template failed for {phone}: {e}")
            # Don't raise — delivery-timeout cron will pick this up and trigger
            # the web-chat fallback if WEB_CHAT_FALLBACK_ENABLED.

    return lead
