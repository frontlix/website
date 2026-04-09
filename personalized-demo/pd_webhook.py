"""Personalized demo webhook handler — apart van de branche webhook.

Wordt aangeroepen vanuit de hoofdwebhook wanneer demo_type == "personalized".
Gebruikt eigen LLM prompts die de briefing uit personalized_demos meenemen.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from services.supabase import get_supabase  # shared via lead-automation
from services.whatsapp import normalize_phone, send_text, get_media_url, download_media  # shared
from services.photo_vision import analyze_photo  # shared
from models.lead import ConversationMessage  # shared

from pd_llm import extract_personalized_data, generate_personalized_reply
from pd_config import PERSONALIZED_FIELDS, RATE_LIMIT_MAX, MAX_PHOTOS, PHOTO_WAIT_MS


# ── Helpers ──────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _save_message(lead_id: str, role: str, content: str, msg_type: str = "text", media_url: str | None = None):
    row: dict[str, Any] = {"lead_id": lead_id, "role": role, "content": content, "message_type": msg_type}
    if media_url:
        row["media_url"] = media_url
    get_supabase().table("conversations").insert(row).execute()


async def _fetch_history(lead_id: str) -> list[ConversationMessage]:
    resp = get_supabase().table("conversations").select("role, content").eq("lead_id", lead_id).order("created_at").execute()
    return [ConversationMessage(role=m["role"], content=m["content"]) for m in (resp.data or [])]


def _fetch_demo_info(demo_id: str) -> dict | None:
    """Fetch the personalized demo briefing from Supabase."""
    resp = get_supabase().table("personalized_demos").select(
        "id, naam, bedrijf, branche, briefing"
    ).eq("id", demo_id).single().execute()
    return resp.data if resp.data else None


def _is_photo_step_done(collected: dict) -> bool:
    return collected.get("_photo_step_done") is True


def _user_skips_photo(text: str) -> bool:
    import re
    t = text.lower().strip()
    if not t:
        return False
    if re.match(r"^(nee|nope|geen|klaar|skip|stop|niets|niks)$", t):
        return True
    if re.search(r"\b(geen foto|geen fotos|geen foto's|heb geen|sla over|dat (is|was) alles|ben klaar)\b", t):
        return True
    return False


# ── Main entry point (called from the main webhook router) ──────────────

async def handle_personalized_message(lead: dict, message: dict, msg_type: str, phone: str):
    """Handle an inbound message for a personalized demo lead."""
    status = lead.get("status", "")

    # Terminal states
    if status == "appointment_booked":
        await send_text(phone, "Je afspraak staat al ingepland. We nemen contact met je op!")
        return
    if status == "pending_approval":
        await send_text(phone, "Je gegevens worden bekeken door ons team. Je hoort snel van ons!")
        return

    # Image handling
    if msg_type == "image":
        await _handle_image(lead, message, phone)
        return

    # Non-text types
    if msg_type not in ("text",):
        await send_text(phone, "Op dit moment kan ik alleen tekst en foto's verwerken. Stuur gerust een bericht!")
        return

    text_body = (message.get("text") or {}).get("body", "").strip()
    if not text_body:
        return

    # Save message + increment count
    await _save_message(lead["id"], "user", text_body)
    msg_count = (lead.get("message_count") or 0) + 1
    get_supabase().table("leads").update({
        "message_count": msg_count,
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    # Rate limit
    if msg_count > RATE_LIMIT_MAX:
        await send_text(phone, "Bedankt voor je interesse! Een collega neemt persoonlijk contact met je op.")
        return

    # Handle based on status
    if status == "collecting":
        await _handle_collecting(lead, text_body, phone)
    elif status == "quote_sent":
        await _handle_followup(lead, text_body, phone)


# ── Collecting handler ───────────────────────────────────────────────────

async def _handle_collecting(lead: dict, text_body: str, phone: str):
    collected = dict(lead.get("collected_data") or {})
    demo_id = collected.get("_personalized_demo_id")
    if not demo_id:
        await send_text(phone, "Er ging iets mis met deze demo. Neem contact op met Frontlix.")
        return

    demo_info = _fetch_demo_info(demo_id)
    if not demo_info:
        await send_text(phone, "Er ging iets mis met deze demo. Neem contact op met Frontlix.")
        return

    history = await _fetch_history(lead["id"])

    # Photo skip detection
    all_fields_done = bool(lead.get("naam")) and all(collected.get(f) for f in PERSONALIZED_FIELDS)
    in_photo_step = all_fields_done and not _is_photo_step_done(collected)

    if in_photo_step and _user_skips_photo(text_body):
        collected["_photo_step_done"] = True
        get_supabase().table("leads").update({
            "collected_data": collected, "updated_at": _now_iso(),
        }).eq("id", lead["id"]).execute()

        if lead.get("email"):
            await _trigger_completion(lead["id"])
            return

        refreshed = {**lead, "collected_data": collected}
        await _send_next_question(refreshed, await _fetch_history(lead["id"]), phone, demo_info)
        return

    # Run extraction LLM
    identity = {"naam": lead.get("naam"), "email": lead.get("email")}
    current_data = {k: collected.get(k) for k in PERSONALIZED_FIELDS if collected.get(k)}

    extracted = await extract_personalized_data(history, identity, current_data, demo_info)

    # Apply extracted data
    new_naam = extracted.get("naam") or lead.get("naam")
    new_email = extracted.get("email") or lead.get("email")
    if extracted.get("data"):
        for k, v in extracted["data"].items():
            if v is not None:
                collected[k] = v

    # Update lead
    get_supabase().table("leads").update({
        "naam": new_naam,
        "email": new_email,
        "collected_data": collected,
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    # Check if all done
    still_missing = [f for f in PERSONALIZED_FIELDS if not collected.get(f)]
    all_done = bool(new_naam) and bool(new_email) and len(still_missing) == 0 and _is_photo_step_done(collected)

    if all_done:
        await _trigger_completion(lead["id"])
        return

    # Send next question
    updated = {**lead, "naam": new_naam, "email": new_email, "collected_data": collected}
    await _send_next_question(updated, history, phone, demo_info)


# ── Image handler ────────────────────────────────────────────────────────

async def _handle_image(lead: dict, message: dict, phone: str):
    if lead.get("status") != "collecting":
        await send_text(phone, "Bedankt voor de foto, maar ik kan deze nu nog niet verwerken.")
        return

    image_obj = message.get("image") or {}
    media_id = image_obj.get("id")
    if not media_id:
        await send_text(phone, "Sorry, ik kon je foto niet ophalen. Probeer het opnieuw!")
        return

    media_url = await get_media_url(media_id)
    if not media_url:
        return
    dl = await download_media(media_url)
    if not dl:
        return

    file_bytes, content_type = dl
    filename = f"{int(time.time() * 1000)}-{media_id[:8]}.jpg"
    storage_path = f"lead-photos/{lead['id']}/{filename}"

    sb = get_supabase()
    sb.storage.from_("photos").upload(storage_path, file_bytes, {"content-type": content_type, "upsert": "false"})
    public_url = sb.storage.from_("photos").get_public_url(storage_path)

    analysis = await analyze_photo(public_url, "personalized")

    # Re-fetch lead for race protection
    fresh_resp = sb.table("leads").select("collected_data, status").eq("id", lead["id"]).execute()
    fresh = (fresh_resp.data or [None])[0]
    if not fresh or fresh.get("status") != "collecting":
        return

    collected = dict(fresh.get("collected_data") or {})
    photos = list(collected.get("photos") or [])
    analyses = list(collected.get("photo_analyses") or [])

    if len(photos) >= MAX_PHOTOS:
        await send_text(phone, f"Je hebt al {MAX_PHOTOS} foto's gestuurd, dat is het maximum.")
        return

    photos.append(public_url)
    analyses.append(analysis)
    collected["photos"] = photos
    collected["photo_analyses"] = analyses

    now_ms = int(time.time() * 1000)
    collected["_last_photo_at"] = now_ms
    collected["_photo_wait_until"] = now_ms + PHOTO_WAIT_MS

    await _save_message(lead["id"], "user", "(foto ontvangen)", "image", public_url)

    if len(photos) >= MAX_PHOTOS:
        collected["_photo_step_done"] = True
        sb.table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
        await send_text(phone, "Foto ontvangen, dank je! Ik heb genoeg om verder te gaan.")
        if lead.get("email"):
            await _trigger_completion(lead["id"])
        else:
            demo_id = collected.get("_personalized_demo_id")
            demo_info = _fetch_demo_info(demo_id) if demo_id else None
            if demo_info:
                refreshed = {**lead, "collected_data": collected}
                await _send_next_question(refreshed, await _fetch_history(lead["id"]), lead["telefoon"], demo_info)
        return

    sb.table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
    await send_text(phone, "Foto ontvangen, dank je!")

    asyncio.get_event_loop().call_later(
        PHOTO_WAIT_MS / 1000,
        lambda: asyncio.ensure_future(_auto_advance_photo(lead["id"], now_ms)),
    )


async def _auto_advance_photo(lead_id: str, photo_timestamp: int):
    """Auto-advance after photo wait period if no new photos arrived."""
    try:
        sb = get_supabase()
        resp = sb.table("leads").select("*").eq("id", lead_id).execute()
        fresh = (resp.data or [None])[0]
        if not fresh:
            return

        collected = dict(fresh.get("collected_data") or {})
        if collected.get("_last_photo_at") != photo_timestamp:
            return
        if collected.get("_photo_step_done") is True:
            return
        if fresh.get("status") != "collecting":
            return

        collected["_photo_step_done"] = True
        sb.table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead_id).execute()

        if fresh.get("email"):
            await _trigger_completion(lead_id)
        else:
            demo_id = collected.get("_personalized_demo_id")
            demo_info = _fetch_demo_info(demo_id) if demo_id else None
            if demo_info:
                refreshed = {**fresh, "collected_data": collected}
                history = await _fetch_history(lead_id)
                await _send_next_question(refreshed, history, fresh["telefoon"], demo_info)
    except Exception as e:
        print(f"[personalized] auto_advance_photo error: {e}")


# ── Reply generation ─────────────────────────────────────────────────────

async def _send_next_question(lead: dict, history: list[ConversationMessage], phone: str, demo_info: dict):
    identity = {"naam": lead.get("naam"), "email": lead.get("email")}
    collected = dict(lead.get("collected_data") or {})
    current_data = {k: collected.get(k) for k in PERSONALIZED_FIELDS if collected.get(k)}

    reply = await generate_personalized_reply(history, identity, current_data, collected, demo_info)

    if reply.strip().upper().startswith("[WAIT]"):
        print(f"[personalized] [WAIT] token — holding off for lead {lead['id']}")
        return

    await send_text(phone, reply)
    await _save_message(lead["id"], "assistant", reply)


# ── Completion trigger ───────────────────────────────────────────────────

async def _trigger_completion(lead_id: str):
    """Mark the personalized demo as complete and notify the Frontlix team."""
    sb = get_supabase()
    resp = sb.table("leads").select("*").eq("id", lead_id).execute()
    lead = (resp.data or [None])[0]
    if not lead:
        return

    collected = dict(lead.get("collected_data") or {})

    # Update status
    sb.table("leads").update({
        "status": "pending_approval",
        "updated_at": _now_iso(),
    }).eq("id", lead_id).execute()

    # Send WhatsApp confirmation to the prospect
    await send_text(
        lead["telefoon"],
        "Top, ik heb alles wat ik nodig heb! Een collega van Frontlix neemt persoonlijk contact met je op met een voorstel op maat."
    )

    # Send notification email to Frontlix team
    try:
        from services.mail import send_approval_email

        demo_id = collected.get("_personalized_demo_id")
        demo_info = _fetch_demo_info(demo_id) if demo_id else {}

        fields = []
        for key in PERSONALIZED_FIELDS + ["budget"]:
            v = collected.get(key)
            if v:
                fields.append({"label": key.capitalize(), "value": str(v)})

        photo_urls = [u for u in (collected.get("photos") or []) if isinstance(u, str)]

        await send_approval_email(
            to_email=lead.get("email") or "",
            naam=lead.get("naam") or "Onbekend",
            telefoon=lead["telefoon"],
            email=lead.get("email") or "",
            branche_label=f"Persoonlijke demo — {demo_info.get('bedrijf', 'Onbekend')}",
            fields=fields,
            pricing=None,
            approve_url=None,
            edit_url=None,
            photo_urls=photo_urls,
            pdf_url=None,
        )
    except Exception as e:
        print(f"[personalized] notification email failed: {e}")


# ── Follow-up after completion ───────────────────────────────────────────

async def _handle_followup(lead: dict, text_body: str, phone: str):
    """Handle messages after the demo is complete — just acknowledge."""
    await send_text(
        phone,
        "Bedankt voor je bericht! Een collega van Frontlix heeft je gegevens en neemt snel contact op."
    )
