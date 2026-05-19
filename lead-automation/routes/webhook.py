"""WhatsApp webhook handler — the main inbound message processing loop.

GET  /webhook — Meta verification challenge
POST /webhook — Process inbound WhatsApp messages
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from fastapi import APIRouter, Request, Response

from config import get_settings
from services.supabase import get_supabase
from services.whatsapp import normalize_phone, send_text, get_media_url, download_media
from services.photo_vision import analyze_photo
from services.web_chat_fallback import (
    detect_template_failure_status_event,
    FALLBACK_ERROR_CODES,
    trigger_web_chat_fallback,
)
from llm import detect_branche, analyze_message, generate_reply, classify_post_quote_intent
from llm.reply import _determine_next_tag
from branches import (
    get_branche, get_effective_missing_fields, get_pricing,
    is_photo_step_done, user_skips_photo_step,
    MAX_PHOTOS, PHOTO_WAIT_MS,
)
from models.lead import ConversationMessage


# A channel-agnostic outbound text sender. WhatsApp callers use _whatsapp_sender(phone);
# the web-chat route (Pakket 4b) passes a buffer-sender that captures replies in-process.
Sender = Callable[[str], Awaitable[None]]


def _whatsapp_sender(phone: str) -> Sender:
    async def _send(msg: str) -> None:
        await send_text(phone, msg)
    return _send

router = APIRouter()

RATE_LIMIT_MAX = 30

WELCOME_MESSAGES = {
    "zonnepanelen": "Top, zonnepanelen dus. Ik ben Sanne, ik help je bij het samenstellen van een passende offerte. Ik stel je zo een paar korte vragen. Met wie heb ik trouwens het genoegen?",
    "dakdekker": "Top, dakwerk dus. Ik ben Bram, dakdekker met 20 jaar ervaring. Ik stel je zo wat korte vragen, dan kan ik een offerte voor je opstellen. Met wie heb ik trouwens het genoegen?",
    "schoonmaak": "Hoi! Schoonmaak dus, daar help ik je graag bij. Ik ben Lotte. Ik stel je zo een paar korte vragen, dan stuur ik je een passend voorstel. Met wie heb ik trouwens het genoegen?",
}


# ── Helpers ──────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _save_message(lead_id: str, role: str, content: str, msg_type: str = "text", media_url: str | None = None):
    row: dict[str, Any] = {"lead_id": lead_id, "role": role, "content": content, "message_type": msg_type}
    if media_url:
        row["media_url"] = media_url
    get_supabase().table("conversations").insert(row).execute()


async def _increment_message_count(lead_id: str, current: int):
    get_supabase().table("leads").update({
        "message_count": current + 1,
        "updated_at": _now_iso(),
    }).eq("id", lead_id).execute()


async def _fetch_history(lead_id: str) -> list[ConversationMessage]:
    resp = get_supabase().table("conversations").select("role, content").eq("lead_id", lead_id).order("created_at").execute()
    return [ConversationMessage(role=m["role"], content=m["content"]) for m in (resp.data or [])]


def _map_button_to_branche(title_or_id: str) -> str | None:
    t = (title_or_id or "").lower()
    if not t:
        return None
    if re.search(r"zonnepan|zonne|solar|pv", t):
        return "zonnepanelen"
    if re.search(r"dakdek|dak\b|dakwerk|dakreparatie", t):
        return "dakdekker"
    if re.search(r"schoonm|schoon|reinig|cleaning", t):
        return "schoonmaak"
    return None


# ── Webhook endpoints ────────────────────────────────────────────────────

@router.get("/webhook")
async def verify(request: Request):
    """Meta webhook verification challenge."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == get_settings().whatsapp_verify_token:
        return Response(content=challenge, media_type="text/plain")
    return Response(content="Verification failed", status_code=403)


@router.post("/webhook")
async def receive(request: Request):
    """Process inbound WhatsApp messages. Always returns 200 so Meta doesn't retry."""
    try:
        body = await request.json()
        await _process_webhook(body)
    except Exception as e:
        print(f"Webhook processing error: {e}")
    return {"status": "ok"}


async def _process_webhook(body: dict):
    entry = (body.get("entry") or [{}])[0]
    changes = (entry.get("changes") or [{}])[0]
    value = changes.get("value") or {}

    # Status-event branch (Pakket 4b): Meta sends `statuses` (not `messages`)
    # for delivery / read / failed events. Detect failed-delivery on our opening
    # template and trigger the web-chat fallback. New branch added BEFORE the
    # existing message-handling — does not reorder.
    status_event = detect_template_failure_status_event(value)
    if status_event:
        wa_message_id, error_code = status_event
        print(f"[WEBHOOK] status_event msg_id={wa_message_id} error_code={error_code}")
        if error_code in FALLBACK_ERROR_CODES:
            try:
                resp = (
                    get_supabase().table("leads").select("id")
                    .eq("opening_wa_message_id", wa_message_id).limit(1).execute()
                )
                rows = resp.data or []
                if rows:
                    await trigger_web_chat_fallback(rows[0]["id"], reason=f"meta_error_{error_code}")
                else:
                    print(f"[WEBHOOK] no lead matched opening_wa_message_id={wa_message_id}")
            except Exception as e:
                print(f"[WEBHOOK] fallback trigger failed: {e}")
        return

    messages = value.get("messages") or []
    if not messages:
        return

    message = messages[0]
    msg_type = message.get("type", "")
    phone_from = message.get("from", "")
    if not phone_from:
        return

    phone = normalize_phone(phone_from)
    print(f"[WEBHOOK] type={msg_type} phone={phone}")

    # Look up active lead
    resp = get_supabase().table("leads").select("*").eq("telefoon", phone).neq("status", "appointment_booked").order("created_at", desc=True).limit(1).execute()
    lead = (resp.data or [None])[0]

    if not lead:
        return

    # Route personalized demo leads to their own handler
    if lead.get("demo_type") == "personalized":
        from pd_webhook import handle_personalized_message
        await handle_personalized_message(lead, message, msg_type, phone)
        return

    await _handle_branche_webhook(lead, message, msg_type, phone)


# ── Main router ──────────────────────────────────────────────────────────

async def _handle_branche_webhook(lead: dict, message: dict, msg_type: str, phone: str):
    status = lead.get("status", "")

    # Terminal states
    if status == "appointment_booked":
        await send_text(phone, "Je afspraak staat al ingepland. Een collega neemt vóór die tijd contact met je op als dat nodig is!")
        return
    if status == "pending_approval":
        await send_text(phone, "Je offerte wacht op interne goedkeuring. Je hoort zo van mij via WhatsApp!")
        return

    # Image → photo flow
    if msg_type == "image":
        await _handle_image(lead, message, phone)
        return

    # Interactive / button → branche choice
    if msg_type == "interactive":
        await _handle_interactive(lead, message, phone)
        return
    if msg_type == "button":
        await _handle_button_reply(lead, message, phone)
        return

    # Non-text types
    if msg_type != "text":
        await send_text(phone, "Op dit moment kan ik alleen tekstberichten, knoppen en foto's verwerken. Stuur aub een tekstbericht.")
        return

    text_body = (message.get("text") or {}).get("body", "").strip()
    if not text_body:
        return

    # Save message + increment count
    await _save_message(lead["id"], "user", text_body)
    msg_count = (lead.get("message_count") or 0) + 1
    await _increment_message_count(lead["id"], lead.get("message_count", 0))

    # Rate limit
    if msg_count > RATE_LIMIT_MAX:
        await send_text(phone, "Het lijkt erop dat ik je niet goed kan helpen. Een collega neemt zo snel mogelijk contact met je op!")
        return

    # Status routing
    sender = _whatsapp_sender(phone)
    if status == "awaiting_choice":
        await _handle_choice(lead, text_body, phone)
    elif status == "collecting":
        await _handle_collecting(lead, text_body, sender)
    elif status == "quote_sent":
        await _handle_start_scheduling(lead, text_body, phone)
    elif status == "scheduling":
        await _handle_scheduling(lead, text_body, phone)


# ── Branche choice handlers ─────────────────────────────────────────────

async def _activate_branche(lead: dict, branche_id: str, phone: str):
    """Set branche, send welcome + first question."""
    get_supabase().table("leads").update({
        "demo_type": branche_id,
        "status": "collecting",
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    # Welcome message
    welcome = WELCOME_MESSAGES.get(branche_id, "")
    if welcome:
        await send_text(phone, welcome)
        await _save_message(lead["id"], "assistant", welcome)

    # First question
    updated = {**lead, "demo_type": branche_id, "status": "collecting"}
    history = await _fetch_history(lead["id"])
    await _send_next_question(updated, history, _whatsapp_sender(phone))


async def _handle_button_reply(lead: dict, message: dict, phone: str):
    button = message.get("button") or {}
    text = button.get("text", "")
    payload = button.get("payload", "")
    choice = text or payload

    await _save_message(lead["id"], "user", f"Gekozen: {choice}", "button")
    await _increment_message_count(lead["id"], lead.get("message_count", 0))

    if lead.get("status") != "awaiting_choice":
        await send_text(phone, "Bedankt! Je zit al midden in een gesprek — antwoord gerust op mijn vorige vraag.")
        return

    branche = _map_button_to_branche(text) or _map_button_to_branche(payload)
    if not branche:
        await send_text(phone, 'Sorry, ik kon je keuze niet plaatsen. Stuur "zonnepanelen", "dakdekker" of "schoonmaak" als tekst.')
        return

    await _activate_branche(lead, branche, phone)


async def _handle_interactive(lead: dict, message: dict, phone: str):
    interactive = message.get("interactive") or {}
    reply = interactive.get("button_reply") or interactive.get("list_reply") or {}
    title = reply.get("title", "")
    rid = reply.get("id", "")
    choice = title or rid

    await _save_message(lead["id"], "user", f"Gekozen: {choice}", "interactive")
    await _increment_message_count(lead["id"], lead.get("message_count", 0))

    if lead.get("status") != "awaiting_choice":
        await send_text(phone, "Bedankt! Je zit al midden in een gesprek — antwoord gerust op mijn vorige vraag.")
        return

    branche = _map_button_to_branche(title) or _map_button_to_branche(rid)
    if not branche:
        await send_text(phone, 'Sorry, ik kon je keuze niet plaatsen. Stuur "zonnepanelen", "dakdekker" of "schoonmaak" als tekst.')
        return

    await _activate_branche(lead, branche, phone)


async def _handle_choice(lead: dict, text_body: str, phone: str):
    """Handle text-based branche selection via LLM detection."""
    history = await _fetch_history(lead["id"])
    detected = await detect_branche(history)

    if not detected:
        await send_text(phone, "Sorry, ik kon je keuze niet helemaal plaatsen. Voor welke dienst wil je een offerte zien — zonnepanelen, dakdekker of schoonmaak?")
        return

    await _activate_branche(lead, detected, phone)


# ── Field-workaround map ─────────────────────────────────────────────────
# Fields with a concrete practical tip — customer gets ONE re-ask after
# the first "weet ik niet". Fields not listed here are skipped after the
# very first uncertainty (per persona-prompt rules).
_WORKAROUND_FIELDS: dict[str, set[str]] = {
    "zonnepanelen": {"jaarverbruik", "dakoppervlakte", "aansluiting"},
    "dakdekker": {"dakoppervlakte", "huidig_dakmateriaal"},
    "schoonmaak": {"oppervlakte"},
}


def _canonical_field(tag: str) -> str | None:
    """Convert a NEXT-tag back to the underlying field key.
    Drops the _plat / _schuin suffixes used for differentiated questions."""
    if not tag:
        return None
    if tag in {"naam", "email", "PHOTO_STEP", "COMPLETE"}:
        return tag if tag == "naam" else None  # only `naam` doubles as a field
    if tag.startswith("dakmateriaal_") or tag.startswith("huidig_dakmateriaal_"):
        return tag.rsplit("_", 1)[0]
    return tag


def _unsure_count(collected_data: dict, field_key: str) -> int:
    raw = collected_data.get("_unsure") if isinstance(collected_data, dict) else None
    if isinstance(raw, dict):
        v = raw.get(field_key)
        if isinstance(v, int):
            return v
    return 0


def _bump_unsure(collected_data: dict, field_key: str) -> int:
    """Increment the unsure-counter for a field. Returns the new count."""
    raw = collected_data.get("_unsure")
    if not isinstance(raw, dict):
        raw = {}
        collected_data["_unsure"] = raw
    new = int(raw.get(field_key, 0)) + 1
    raw[field_key] = new
    return new


def _mark_skipped(collected_data: dict, field_key: str) -> None:
    raw = collected_data.get("_skipped")
    if not isinstance(raw, list):
        raw = []
        collected_data["_skipped"] = raw
    if field_key not in raw:
        raw.append(field_key)


# ── Collecting handler ───────────────────────────────────────────────────

async def _handle_collecting(lead: dict, text_body: str, sender: Sender):
    """Channel-agnostic collecting flow. `sender` is the outbound text callable
    — WhatsApp callers pass _whatsapp_sender(phone); the web-chat route passes
    a buffer-sender so replies land in the HTTP response instead of WhatsApp.
    """
    demo_type = lead.get("demo_type")
    if not demo_type:
        get_supabase().table("leads").update({"status": "awaiting_choice"}).eq("id", lead["id"]).execute()
        await sender("Even opnieuw — voor welke dienst wil je een offerte zien? Zonnepanelen, dakdekker of schoonmaak?")
        return

    config = get_branche(demo_type)
    if not config:
        return

    collected = dict(lead.get("collected_data") or {})
    history = await _fetch_history(lead["id"])

    # Photo wait timestamp fallback
    all_regular_filled = bool(lead.get("naam")) and len(get_effective_missing_fields(config, collected, lead.get("demo_type"))) == 0
    photo_wait_until = collected.get("_photo_wait_until")

    if all_regular_filled and not is_photo_step_done(collected) and isinstance(photo_wait_until, (int, float)) and time.time() * 1000 >= photo_wait_until:
        collected["_photo_step_done"] = True
        get_supabase().table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
        if lead.get("email"):
            await _trigger_approval(lead["id"], sender=sender)
            return
        refreshed = {**lead, "collected_data": collected}
        await _send_next_question(refreshed, await _fetch_history(lead["id"]), sender)
        return

    # Photo skip detection
    in_photo_step = all_regular_filled and not is_photo_step_done(collected)
    print(f"[collecting] all_regular_filled={all_regular_filled} in_photo_step={in_photo_step} skip_detected={user_skips_photo_step(text_body) if in_photo_step else 'n/a'}")
    if in_photo_step and user_skips_photo_step(text_body):
        collected["_photo_step_done"] = True
        get_supabase().table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
        if lead.get("email"):
            await _trigger_approval(lead["id"], sender=sender)
            return
        refreshed = {**lead, "collected_data": collected}
        await _send_next_question(refreshed, await _fetch_history(lead["id"]), sender)
        return

    # Determine what the bot was waiting on BEFORE this customer message — feeds the analyzer.
    identity = {"naam": lead.get("naam"), "email": lead.get("email")}
    current_data = {f.key: collected.get(f.key) for f in config.fields if collected.get(f.key)}
    current_tag = _determine_next_tag(demo_type, identity, current_data, collected)
    current_field = _canonical_field(current_tag) or current_tag  # e.g. "jaarverbruik"

    # Single analyzer call: extract + intent + answered_current_question
    analysis = await analyze_message(demo_type, history, identity, current_data, current_field)
    print(f"[collecting] intent={analysis.intent} answered={analysis.answered_current_question} field={current_field} extracted_keys={list(analysis.extracted.keys())}")

    # Intent-driven dispatch — controls whether to APPLY extracted data and whether
    # to mark the current field as unsure/skipped. The reply itself is shaped by
    # generate_reply via the analysis object further down.
    workaround_set = _WORKAROUND_FIELDS.get(demo_type, set())
    has_workaround = current_field in workaround_set
    apply_extracted = True

    if analysis.intent == "doesnt_know":
        # Don't apply extraction for THIS field even if model leaked something.
        # Bump counter; if it's the second time or there's no workaround → skip.
        if current_field and current_field in {f.key for f in config.fields}:
            new_count = _bump_unsure(collected, current_field)
            if new_count >= 2 or not has_workaround:
                _mark_skipped(collected, current_field)
        # Still allow naam/email extraction (could come piggybacked).
        if isinstance(analysis.extracted.get("data"), dict):
            analysis.extracted["data"].pop(current_field, None) if current_field else None
    elif analysis.intent in {"price_question", "process_question", "off_topic",
                              "gibberish", "is_bot_question", "acknowledgement",
                              "not_recognized"}:
        # No new info on the current field — keep state and re-ask same.
        apply_extracted = False
    elif analysis.intent == "will_provide_later":
        # Customer will come back — mark unsure but don't skip; they may answer next turn.
        if current_field and current_field in {f.key for f in config.fields}:
            _bump_unsure(collected, current_field)
        apply_extracted = True
    # direct_answer → apply normally

    # Apply extracted data (subject to apply_extracted flag)
    new_naam = lead.get("naam")
    new_email = lead.get("email")
    if apply_extracted:
        if analysis.extracted.get("naam"):
            new_naam = analysis.extracted["naam"]
        if analysis.extracted.get("email"):
            new_email = analysis.extracted["email"]
        if isinstance(analysis.extracted.get("data"), dict):
            for k, v in analysis.extracted["data"].items():
                if v is not None:
                    collected[k] = v

    # Update lead
    get_supabase().table("leads").update({
        "naam": new_naam,
        "email": new_email,
        "collected_data": collected,
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    # Re-fetch collected_data from DB to get the latest _photo_step_done flag
    # (may have been set by a previous message in the same conversation)
    fresh_resp = get_supabase().table("leads").select("collected_data").eq("id", lead["id"]).execute()
    fresh_collected = dict((fresh_resp.data or [{}])[0].get("collected_data") or {})
    # Merge our extracted data on top
    for k, v in collected.items():
        if k not in fresh_collected or v is not None:
            fresh_collected[k] = v

    # Check if all done
    still_missing = get_effective_missing_fields(config, fresh_collected, lead.get("demo_type"))

    # If all fields + naam + email are filled but photo step was skipped implicitly
    # (user gave email without explicitly skipping photos), mark photos as done
    if bool(new_naam) and bool(new_email) and len(still_missing) == 0 and not is_photo_step_done(fresh_collected):
        print(f"[collecting] auto-marking photo_step_done (all fields + email filled)")
        fresh_collected["_photo_step_done"] = True

    all_done = bool(new_naam) and bool(new_email) and len(still_missing) == 0 and is_photo_step_done(fresh_collected)
    print(f"[collecting] completion: naam={bool(new_naam)} email={bool(new_email)} missing={still_missing} photo_done={is_photo_step_done(fresh_collected)} -> all_done={all_done}")

    if all_done:
        # Save the merged data before triggering approval
        get_supabase().table("leads").update({
            "naam": new_naam,
            "email": new_email,
            "collected_data": fresh_collected,
            "updated_at": _now_iso(),
        }).eq("id", lead["id"]).execute()
        await _trigger_approval(lead["id"], sender=sender)
        return

    # Send next question — pass analysis so the reply prompt picks the right intent-branch
    updated = {**lead, "naam": new_naam, "email": new_email, "collected_data": fresh_collected}
    await _send_next_question(
        updated, history, sender,
        analysis=analysis,
        unsure_count=_unsure_count(fresh_collected, current_field) if current_field else 0,
        has_workaround=has_workaround,
    )


# ── Image handler ────────────────────────────────────────────────────────

async def _handle_image(lead: dict, message: dict, phone: str):
    if lead.get("status") != "collecting" or not lead.get("demo_type"):
        await send_text(phone, "Bedankt voor de foto, maar ik kan deze nu nog niet verwerken. Antwoord eerst op mijn vraag!")
        return

    image_obj = message.get("image") or {}
    media_id = image_obj.get("id")
    if not media_id:
        await send_text(phone, "Sorry, ik kon je foto niet ophalen. Probeer hem nogmaals te sturen!")
        return

    # Download from Meta + upload to Supabase storage
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

    # Vision analysis
    analysis = await analyze_photo(public_url, lead["demo_type"])

    # Re-fetch lead for race protection
    fresh_resp = sb.table("leads").select("collected_data, status").eq("id", lead["id"]).execute()
    fresh = (fresh_resp.data or [None])[0]
    if not fresh or fresh.get("status") != "collecting":
        await send_text(phone, "Bedankt voor de foto, maar ik ben al verder in het proces.")
        return

    collected = dict(fresh.get("collected_data") or {})
    photos = list(collected.get("photos") or [])
    analyses = list(collected.get("photo_analyses") or [])

    if len(photos) >= MAX_PHOTOS:
        await send_text(phone, f"Je hebt al {MAX_PHOTOS} foto's gestuurd — dat is het maximum.")
        return

    photos.append(public_url)
    analyses.append(analysis)
    collected["photos"] = photos
    collected["photo_analyses"] = analyses

    now_ms = int(time.time() * 1000)
    collected["_last_photo_at"] = now_ms
    collected["_photo_wait_until"] = now_ms + PHOTO_WAIT_MS

    # Embed the vision analysis in the saved user message so extraction can read it
    # (e.g. pick up aansluiting=3-fase from a meterkast photo analysis).
    msg_body = f"(foto ontvangen — analyse: {analysis})" if analysis else "(foto ontvangen)"
    await _save_message(lead["id"], "user", msg_body, "image", public_url)

    # Max photos reached → advance immediately
    if len(photos) >= MAX_PHOTOS:
        collected["_photo_step_done"] = True
        sb.table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
        await send_text(phone, "Foto ontvangen, dank je. Dat is het maximum — ik heb genoeg om verder te gaan.")
        wa_sender = _whatsapp_sender(phone)
        if lead.get("email"):
            await _trigger_approval(lead["id"], sender=wa_sender)
        else:
            refreshed = {**lead, "collected_data": collected}
            history = await _fetch_history(lead["id"])
            await _send_next_question(refreshed, history, wa_sender)
        return

    # Save + schedule auto-advance (no separate ack message — next question handles it)
    sb.table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()

    # Auto-advance after PHOTO_WAIT_MS
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

        wa_sender = _whatsapp_sender(fresh["telefoon"])
        if fresh.get("email"):
            await _trigger_approval(lead_id, sender=wa_sender)
        else:
            refreshed = {**fresh, "collected_data": collected}
            history = await _fetch_history(lead_id)
            await _send_next_question(refreshed, history, wa_sender)
    except Exception as e:
        print(f"auto_advance_photo error: {e}")


# ── Reply generation ─────────────────────────────────────────────────────

async def _send_next_question(
    lead: dict,
    history: list[ConversationMessage],
    sender: Sender,
    analysis=None,
    unsure_count: int = 0,
    has_workaround: bool = False,
):
    demo_type = lead.get("demo_type")
    if not demo_type:
        return
    config = get_branche(demo_type)
    if not config:
        return

    identity = {"naam": lead.get("naam"), "email": lead.get("email")}
    collected = dict(lead.get("collected_data") or {})
    current_data = {f.key: collected.get(f.key) for f in config.fields if collected.get(f.key)}

    reply = await generate_reply(
        demo_type, history, identity, current_data, collected,
        analysis=analysis,
        unsure_count=unsure_count,
        has_workaround=has_workaround,
    )

    # [WAIT] guard
    if reply.strip().upper().startswith("[WAIT]"):
        print(f"[reply] [WAIT] token — holding off for lead {lead['id']}")
        return

    await sender(reply)
    await _save_message(lead["id"], "assistant", reply)


# ── Scheduling handlers ─────────────────────────────────────────────────

def _appointment_meta(lead: dict) -> tuple[str, str, int, str, str]:
    """(appointment_label, label_short, duration_min, purpose, branche_label).
    Neutral defaults when branche-config can't be resolved."""
    config = get_branche(lead.get("demo_type") or "") if lead.get("demo_type") else None
    if not config:
        return ("afspraak", "afspraak", 60, "", "demo")
    return (
        config.appointment_label,
        config.appointment_label_short,
        config.appointment_duration_min,
        config.appointment_purpose,
        config.label,
    )


def _schedule_fallback_url(lead: dict) -> str | None:
    """URL the customer can use when the scheduling-agent / Calendar fails —
    points to the same /schedule?token=… page which already exists for the
    klant-quote email. Returns None when token or service_url isn't set."""
    token = lead.get("approval_token")
    if not token:
        return None
    base = (get_settings().service_url or "").rstrip("/")
    if not base:
        return None
    return f"{base}/schedule?token={token}"


async def _handle_start_scheduling(lead: dict, text_body: str, phone: str):
    """Klant antwoordt na ontvangst offerte. We classificeren de intent met
    een lichtgewicht LLM-call ipv brittle regex op woorden.
    """
    history = await _fetch_history(lead["id"])
    appointment_label, appointment_short, duration, purpose, _branche_label = _appointment_meta(lead)
    intent = await classify_post_quote_intent(history)
    print(f"[post-quote] intent={intent} lead={lead['id']}")

    if intent in ("quote_accepted",):
        get_supabase().table("leads").update({
            "status": "scheduling",
            "updated_at": _now_iso(),
        }).eq("id", lead["id"]).execute()
        lead["status"] = "scheduling"
        await _run_scheduling_agent(lead, phone)
        return

    if intent == "quote_declines":
        await send_text(
            phone,
            "Geen probleem, dank voor je tijd! Mocht je later van gedachten veranderen, stuur dan gerust een berichtje.",
        )
        return

    if intent == "process_question":
        # Use the branche-purpose as a direct, honest answer + open the door.
        msg = purpose or f"Het gaat om een {appointment_label} ter plaatse."
        await send_text(phone, f"{msg} Wil je dat we daarvoor een moment inplannen?")
        return

    if intent == "is_bot_question":
        await send_text(
            phone,
            "Klopt, ik ben Frontlix's slimme assistent. Mocht je een moment willen inplannen voor de "
            f"{appointment_short}, laat het weten.",
        )
        return

    if intent == "quote_question":
        # Don't pretend to answer specific pricing questions — hand off to the owner,
        # but offer to schedule so the conversation doesn't dead-end.
        await send_text(
            phone,
            "Goede vraag, daar kijkt een collega graag persoonlijk naar. Wil je een "
            f"{appointment_short} inplannen om alles door te lopen?",
        )
        return

    # off_topic / acknowledgement / ambiguous → ask explicitly without the old "stuur ja"
    await send_text(phone, f"Wil je een {appointment_short} inplannen?")


async def _handle_scheduling(lead: dict, text_body: str, phone: str):
    """Klant stuurt een bericht tijdens het scheduling gesprek."""
    await _save_message(lead["id"], "user", text_body)
    await _run_scheduling_agent(lead, phone)


# ── Scheduling agent (function calling) ──────────────────────────────────

SCHEDULING_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "check_beschikbaarheid",
            "description": "Check welke tijdslots beschikbaar zijn in de agenda van Frontlix. Gebruik dit als de klant vraagt wanneer het kan of als je moet weten welke momenten beschikbaar zijn.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "boek_afspraak",
            "description": "Boek een afspraak op een specifieke datum en tijd. Gebruik dit ALLEEN als de klant akkoord gaat met een tijdstip. De duur en het soort afspraak staan in de system-prompt context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "datum": {
                        "type": "string",
                        "description": "Datum in YYYY-MM-DD formaat",
                    },
                    "tijd": {
                        "type": "string",
                        "description": "Starttijd in HH:MM formaat (24-uurs)",
                    },
                },
                "required": ["datum", "tijd"],
            },
        },
    },
]


def _get_scheduling_system_prompt(
    agent_name: str,
    appointment_label: str,
    appointment_short: str,
    duration: int,
    purpose: str,
) -> str:
    purpose_line = f"\nDoel van de {appointment_short}: {purpose}" if purpose else ""
    return f"""Je bent {agent_name}, een medewerker van Frontlix. De klant heeft een offerte ontvangen en wil een {appointment_label} inplannen.

## CONTEXT (gebruik deze cijfers in je antwoorden, niet andere)
Soort afspraak: {appointment_label}
Korte naam: {appointment_short}
Duur: {duration} minuten{purpose_line}

## REGELS
- Voer een natuurlijk, warm gesprek over het inplannen
- Gebruik de tool `check_beschikbaarheid` om te zien welke tijdslots vrij zijn
- Gebruik de tool `boek_afspraak` zodra de klant een moment bevestigt
- Verwijs naar de afspraak met "{appointment_short}" of "{appointment_label}" — NOOIT als "kennismakingsgesprek" tenzij dat letterlijk in de korte naam staat
- Noem de duur als de klant ernaar vraagt ({duration} minuten); verzin geen andere getallen
- Max 2-3 zinnen per bericht, informeel Nederlands
- Geen streepjes (-) of gedachtestrepen (—) gebruiken
- NOOIT emoji's gebruiken. Geen smileys, geen duimpjes, geen enkele emoji
- Als de klant vaag is ("volgende week", "ergens dinsdag") → check de agenda en stel 2-3 passende tijden voor
- Als de klant een tijd noemt die niet beschikbaar is → leg vriendelijk uit en stel een alternatief voor
- Als de klant vraagt WAAROM/WAARVOOR de afspraak is → leg het kort uit met de "Doel"-zin hierboven, dan vraag wanneer het uitkomt
- Als de klant twijfelt of geen afspraak wil → respecteer dat, geen druk uitoefenen

## VOORBEELDEN (vervang "kennismakingsgesprek" altijd door "{appointment_short}")
Klant: "wanneer kan ik?" → Gebruik check_beschikbaarheid, stel 2-3 tijden voor
Klant: "dinsdag past me goed" → Check of de eerstvolgende dinsdag vrij is, stel tijden voor
Klant: "liever volgende week" → Check beschikbaarheid, stel opties voor die week voor
Klant: "doe maar woensdag om 14:00" → Gebruik boek_afspraak met de eerstvolgende woensdag in YYYY-MM-DD en 14:00"""


async def _execute_scheduling_tool(tool_name: str, tool_args: dict, lead: dict) -> str:
    """Voer een scheduling tool uit en return het resultaat als string."""
    from services.google_calendar import get_free_slots, create_event, TIMEZONE
    from datetime import timedelta
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(TIMEZONE)

    if tool_name == "check_beschikbaarheid":
        now = datetime.now(timezone.utc)
        range_end = now + timedelta(days=14)
        try:
            all_slots = await get_free_slots(now, range_end, 100)
        except Exception as e:
            return f"Fout bij ophalen agenda: {e}"

        if not all_slots:
            return "Er zijn geen vrije tijdslots gevonden in de komende 2 weken."

        # Groepeer per dag met tijden
        NL_WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
        NL_MONTHS = ["", "januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"]

        days: dict[str, list[str]] = {}
        for slot in all_slots:
            dt = datetime.fromisoformat(slot["start_utc"]).astimezone(tz)
            date_key = dt.strftime("%Y-%m-%d")
            label = f"{NL_WEEKDAYS[dt.weekday()]} {dt.day} {NL_MONTHS[dt.month]}"
            time_str = dt.strftime("%H:%M")
            if date_key not in days:
                days[date_key] = []
            days[date_key].append(time_str)

        lines = []
        for date_key in sorted(days.keys()):
            times = days[date_key]
            dt = datetime.fromisoformat(f"{date_key}T00:00:00").astimezone(tz) if "T" in date_key else datetime.strptime(date_key, "%Y-%m-%d").replace(tzinfo=tz)
            label = f"{NL_WEEKDAYS[dt.weekday()]} {dt.day} {NL_MONTHS[dt.month]}"
            times_str = ", ".join(times[:6])  # max 6 tijden tonen per dag
            if len(times) > 6:
                times_str += f" (+{len(times)-6} meer)"
            lines.append(f"- {label} ({date_key}): {times_str}")

        return f"Beschikbare tijdslots (30 min):\n" + "\n".join(lines)

    elif tool_name == "boek_afspraak":
        datum = tool_args.get("datum", "")
        tijd = tool_args.get("tijd", "")
        if not datum or not tijd:
            return "Fout: datum en tijd zijn beide verplicht."

        collected = dict(lead.get("collected_data") or {})
        naam = lead.get("naam") or "klant"
        appointment_label, appointment_short, duration, _purpose, branche_label = _appointment_meta(lead)

        try:
            parts = datum.split("-")
            time_parts = tijd.split(":")
            local_start = datetime(int(parts[0]), int(parts[1]), int(parts[2]),
                                   int(time_parts[0]), int(time_parts[1]), tzinfo=tz)
            local_end = local_start + timedelta(minutes=duration)
            start_utc = local_start.astimezone(timezone.utc)
            end_utc = local_end.astimezone(timezone.utc)

            summary = f"Frontlix {appointment_label} met {naam} ({branche_label})"
            description = (
                f"{appointment_label.capitalize()} van {duration} minuten.\n\n"
                f"Klant: {naam}\n"
                f"Email: {lead.get('email')}\n"
                f"Telefoon: +{lead['telefoon']}\n"
                f"Branche: {branche_label}"
            )

            event_id = await create_event(
                start_utc=start_utc,
                end_utc=end_utc,
                summary=summary,
                description=description,
                attendee_email=lead.get("email"),
            )

            # Update lead status
            collected["_appointment_at"] = f"{datum}T{tijd}"
            collected["_google_event_id"] = event_id
            collected["_appointment_duration_min"] = duration
            get_supabase().table("leads").update({
                "status": "appointment_booked",
                "collected_data": collected,
                "updated_at": _now_iso(),
            }).eq("id", lead["id"]).execute()

            NL_WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
            NL_MONTHS = ["", "januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"]
            dag = NL_WEEKDAYS[local_start.weekday()]
            maand = NL_MONTHS[local_start.month]
            return f"{appointment_label.capitalize()} geboekt op {dag} {local_start.day} {maand} om {tijd} ({duration} min). Google Calendar uitnodiging is verstuurd naar {lead.get('email')}."

        except Exception as e:
            return f"Fout bij het boeken: {e}"

    return f"Onbekende tool: {tool_name}"


async def _run_scheduling_agent(lead: dict, phone: str):
    """AI agent met function calling voor het inplannen van de branche-afspraak."""
    from services.openai_client import get_openai
    import json

    try:
        naam = lead.get("naam") or "daar"
        config = get_branche(lead.get("demo_type")) if lead.get("demo_type") else None
        agent_name = config.agent_name if config else "een collega"
        appointment_label, appointment_short, duration, purpose, branche_label = _appointment_meta(lead)
        history = await _fetch_history(lead["id"])

        system_prompt = _get_scheduling_system_prompt(
            agent_name, appointment_label, appointment_short, duration, purpose,
        )
        system_prompt += f"\n\nKlant: {naam}\nBranche: {branche_label}\nVandaag: {datetime.now(timezone.utc).strftime('%A %d %B %Y')}"

        # Bouw messages array
        messages: list[dict] = [
            {"role": "system", "content": system_prompt},
        ]

        # Voeg conversatie history toe (laatste 15 berichten)
        for m in history[-15:]:
            role = "user" if m.role == "user" else "assistant"
            messages.append({"role": role, "content": m.content})

        # Agent loop — max 3 tool calls per beurt
        client = get_openai()
        for iteration in range(3):
            print(f"[scheduling-agent] Iteration {iteration + 1}, messages: {len(messages)}")

            response = client.chat.completions.create(
                model="gpt-4o",
                temperature=0.5,
                tools=SCHEDULING_TOOLS,
                messages=messages,
            )

            choice = response.choices[0]
            print(f"[scheduling-agent] Finish reason: {choice.finish_reason}")

            # Als de agent een tekst antwoord geeft (geen tool call)
            if choice.finish_reason == "stop" and choice.message.content:
                reply = choice.message.content.strip()
                await send_text(phone, reply)
                await _save_message(lead["id"], "assistant", reply)
                return

            # Als de agent een tool wil aanroepen
            if choice.message.tool_calls:
                tool_calls_data = []
                for tc in choice.message.tool_calls:
                    tool_calls_data.append({
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    })
                messages.append({
                    "role": "assistant",
                    "content": choice.message.content or "",
                    "tool_calls": tool_calls_data,
                })

                for tool_call in choice.message.tool_calls:
                    tool_name = tool_call.function.name
                    try:
                        tool_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        tool_args = {}

                    print(f"[scheduling-agent] Tool call: {tool_name}({tool_args})")

                    result = await _execute_scheduling_tool(tool_name, tool_args, lead)
                    print(f"[scheduling-agent] Tool result: {result[:100]}...")

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result,
                    })

                continue

            # Fallback als er geen content en geen tool_calls zijn
            print(f"[scheduling-agent] Unexpected finish reason: {choice.finish_reason}")
            break

    except Exception as e:
        logging.error("[scheduling-agent] error for lead %s: %s",
                      lead.get("id"), e, exc_info=e)
        # Owner-alert + klikbare /schedule fallback ipv doodlopende "agenda niet bereikbaar"
        appointment_label, appointment_short, _duration, _purpose, branche_label = _appointment_meta(lead)
        fallback_url = _schedule_fallback_url(lead)
        owner_phone = (get_settings().owner_whatsapp_phone or "").strip()
        if owner_phone:
            try:
                await send_text(
                    owner_phone,
                    f"[ALERT] Scheduling-agent faalde voor lead {lead.get('naam')} ({lead.get('telefoon')}, {branche_label}). Fout: {e}",
                )
            except Exception:
                pass
        if fallback_url:
            msg = (
                f"Even gemakkelijker, kies hier een moment voor je {appointment_short}: "
                f"{fallback_url}"
            )
        else:
            msg = (
                "Onze agenda is even niet bereikbaar. Een collega neemt zo contact "
                "met je op om de afspraak in te plannen."
            )
        await send_text(phone, msg)
        await _save_message(lead["id"], "assistant", msg)
        return

    # Als de loop eindigt zonder antwoord — fallback (gebruik branche-copy)
    appointment_label, appointment_short, _duration, _purpose, _branche_label = _appointment_meta(lead)
    fallback_msg = f"Wanneer komt het je uit voor de {appointment_short}?"
    await send_text(phone, fallback_msg)
    await _save_message(lead["id"], "assistant", fallback_msg)


# ── Approval trigger ─────────────────────────────────────────────────────

async def _alert_owner_email_failure(lead: dict, error: Exception) -> None:
    """Notify the business owner via WhatsApp + structured log when an offerte
    mail fails. Silent failure of this notifier is acceptable (it's a safety net
    on top of the python logger) — the log will still surface in journalctl.
    """
    branche_label = "?"
    try:
        config = get_branche(lead.get("demo_type") or "")
        if config:
            branche_label = config.label
    except Exception:
        pass

    naam = lead.get("naam") or "onbekend"
    email = lead.get("email") or "onbekend"
    short_err = str(error)[:140]

    logging.error(
        "[approval] email FAILED lead=%s naam=%s email=%s branche=%s err=%s",
        lead.get("id"), naam, email, branche_label, short_err,
        exc_info=error,
    )

    owner_phone = (get_settings().owner_whatsapp_phone or "").strip()
    if not owner_phone:
        return
    msg = (
        f"[ALERT] Offerte-mail naar {email} faalde voor lead {naam} ({branche_label}).\n"
        f"Fout: {short_err}\n"
        f"Lead-id: {lead.get('id')}"
    )
    try:
        await send_text(owner_phone, msg)
    except Exception as e:
        logging.error("[approval] owner-alert WA send failed: %s", e)


async def _trigger_approval(lead_id: str, sender: Sender | None = None):
    """Calculate pricing, generate approval token, send approval email.

    The customer's WhatsApp confirmation is sent AFTER the email attempt so its
    wording reflects the actual outcome (mail-sent vs. mail-failed-and-collega-
    neemt-contact-op). On failure we ALSO alert the owner via WhatsApp so leads
    don't silently disappear.

    `sender` is optional — if provided (e.g. web-chat path) the confirmation
    message uses it; otherwise it falls back to WhatsApp via lead.telefoon."""
    sb = get_supabase()
    resp = sb.table("leads").select("*").eq("id", lead_id).execute()
    lead = (resp.data or [None])[0]
    if not lead or not lead.get("demo_type"):
        return

    config = get_branche(lead["demo_type"])
    if not config:
        return

    collected = dict(lead.get("collected_data") or {})

    # Calculate pricing
    string_data = {k: str(v) for k, v in collected.items() if isinstance(v, (str, int, float))}
    pricing = get_pricing(lead["demo_type"], string_data)

    # Generate approval token
    approval_token = str(uuid.uuid4())

    # Generate PDF upfront so it can be included in the approval email
    pdf_url = None
    try:
        from services.pdf import generate_quote_pdf
        result = await generate_quote_pdf(
            lead_id=lead_id,
            branche_id=lead["demo_type"],
            klant_naam=lead.get("naam") or "Klant",
            klant_email=lead.get("email") or "",
            collected_data=collected,
        )
        pdf_url = result["url"]
    except Exception as e:
        print(f"[approval] PDF generation failed (continuing without): {e}")

    # Save pricing + token + PDF URL
    sb.table("leads").update({
        "status": "pending_approval",
        "approval_token": approval_token,
        "pricing": pricing.model_dump(),
        "quote_pdf_url": pdf_url,
        "updated_at": _now_iso(),
    }).eq("id", lead_id).execute()

    # Attempt the offerte mail FIRST so the customer-facing confirmation can
    # honestly reflect mail-sent vs. mail-failed.
    email_sent = False
    try:
        from services.mail import send_approval_email

        fields = []
        for f in config.fields:
            v = collected.get(f.key)
            if v is not None and v != "":
                value = f"{v} {f.unit}" if f.unit else str(v)
                fields.append({"label": f.label, "value": value})

        photo_urls = [u for u in (collected.get("photos") or []) if isinstance(u, str)]

        await send_approval_email(
            to_email=lead["email"],
            naam=lead["naam"],
            telefoon=lead["telefoon"],
            email=lead["email"],
            branche_label=config.label,
            fields=fields,
            pricing=pricing,
            approve_url=f"{get_settings().service_url}/approve?token={approval_token}",
            edit_url=f"{get_settings().service_url}/edit?token={approval_token}",
            photo_urls=photo_urls,
            pdf_url=pdf_url,
        )
        email_sent = True
    except Exception as e:
        await _alert_owner_email_failure(lead, e)

    # Outbound confirmation — wording depends on whether the mail actually went out.
    voornaam = (lead.get("naam") or "").split()[0] if lead.get("naam") else ""
    if email_sent:
        confirmation = (
            "Top, ik heb alles wat ik nodig heb! Je krijgt zo een mailtje met de "
            "offerte. Zodra die is goedgekeurd stuur ik je hier de PDF."
        )
    else:
        confirmation = (
            f"Top{(' ' + voornaam) if voornaam else ''}, ik heb alles. "
            "Er gaat iets mis met de mail-verzending, een collega neemt zo "
            "contact met je op."
        )

    if sender is not None:
        await sender(confirmation)
    else:
        await send_text(lead["telefoon"], confirmation)
