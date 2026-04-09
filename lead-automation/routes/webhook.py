"""WhatsApp webhook handler — the main inbound message processing loop.

GET  /webhook — Meta verification challenge
POST /webhook — Process inbound WhatsApp messages
"""
from __future__ import annotations

import asyncio
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Request, Response

from config import get_settings
from services.supabase import get_supabase
from services.whatsapp import normalize_phone, send_text, get_media_url, download_media
from services.photo_vision import analyze_photo
from llm import detect_branche, extract_data, generate_reply
from branches import (
    get_branche, get_missing_fields, get_pricing,
    is_photo_step_done, user_skips_photo_step,
    MAX_PHOTOS, PHOTO_WAIT_MS,
)
from models.lead import ConversationMessage

router = APIRouter()

RATE_LIMIT_MAX = 30

WELCOME_MESSAGES = {
    "zonnepanelen": "Oké, zonnepanelen. Ik ben Sanne. Even wat korte vragen dan maak ik een offerte voor je.",
    "dakdekker": "Oké, dakwerk. Ik ben Bram. Even wat vragen dan kan ik een offerte maken.",
    "schoonmaak": "Oké, schoonmaak. Ik ben Lotte. Even een paar korte vragen dan heb ik genoeg voor een offerte.",
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
    if status == "awaiting_choice":
        await _handle_choice(lead, text_body, phone)
    elif status == "collecting":
        await _handle_collecting(lead, text_body, phone)
    elif status == "quote_sent":
        await _handle_start_scheduling(lead, text_body, phone)
    elif status == "scheduling":
        await _handle_scheduling(lead, phone)


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
    await _send_next_question(updated, history, phone)


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


# ── Collecting handler ───────────────────────────────────────────────────

async def _handle_collecting(lead: dict, text_body: str, phone: str):
    demo_type = lead.get("demo_type")
    if not demo_type:
        get_supabase().table("leads").update({"status": "awaiting_choice"}).eq("id", lead["id"]).execute()
        await send_text(phone, "Even opnieuw — voor welke dienst wil je een offerte zien? Zonnepanelen, dakdekker of schoonmaak?")
        return

    config = get_branche(demo_type)
    if not config:
        return

    collected = dict(lead.get("collected_data") or {})
    history = await _fetch_history(lead["id"])

    # Photo wait timestamp fallback
    all_regular_filled = bool(lead.get("naam")) and len(get_missing_fields(config, collected)) == 0
    photo_wait_until = collected.get("_photo_wait_until")

    if all_regular_filled and not is_photo_step_done(collected) and isinstance(photo_wait_until, (int, float)) and time.time() * 1000 >= photo_wait_until:
        collected["_photo_step_done"] = True
        get_supabase().table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
        if lead.get("email"):
            await _trigger_approval(lead["id"])
            return
        refreshed = {**lead, "collected_data": collected}
        await _send_next_question(refreshed, await _fetch_history(lead["id"]), phone)
        return

    # Photo skip detection
    in_photo_step = all_regular_filled and not is_photo_step_done(collected)
    if in_photo_step and user_skips_photo_step(text_body):
        collected["_photo_step_done"] = True
        get_supabase().table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
        if lead.get("email"):
            await _trigger_approval(lead["id"])
            return
        refreshed = {**lead, "collected_data": collected}
        await _send_next_question(refreshed, await _fetch_history(lead["id"]), phone)
        return

    # Run extraction LLM
    identity = {"naam": lead.get("naam"), "email": lead.get("email")}
    current_data = {f.key: collected.get(f.key) for f in config.fields if collected.get(f.key)}

    extracted = await extract_data(demo_type, history, identity, current_data)

    # Apply extracted data
    new_naam = lead.get("naam")
    new_email = lead.get("email")
    if extracted.get("naam"):
        new_naam = extracted["naam"]
    if extracted.get("email"):
        new_email = extracted["email"]
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
    still_missing = get_missing_fields(config, collected)
    all_done = bool(new_naam) and bool(new_email) and len(still_missing) == 0 and is_photo_step_done(collected)

    if all_done:
        await _trigger_approval(lead["id"])
        return

    # Send next question
    updated = {**lead, "naam": new_naam, "email": new_email, "collected_data": collected}
    await _send_next_question(updated, history, phone)


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

    await _save_message(lead["id"], "user", "(foto ontvangen)", "image", public_url)

    # Max photos reached → advance immediately
    if len(photos) >= MAX_PHOTOS:
        collected["_photo_step_done"] = True
        sb.table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
        await send_text(phone, "Foto ontvangen, dank je. Dat is het maximum — ik heb genoeg om verder te gaan.")
        if lead.get("email"):
            await _trigger_approval(lead["id"])
        else:
            refreshed = {**lead, "collected_data": collected}
            history = await _fetch_history(lead["id"])
            await _send_next_question(refreshed, history, phone)
        return

    # Save + ack + schedule auto-advance
    sb.table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
    await send_text(phone, "Foto ontvangen, dank je.")

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

        if fresh.get("email"):
            await _trigger_approval(lead_id)
        else:
            refreshed = {**fresh, "collected_data": collected}
            history = await _fetch_history(lead_id)
            await _send_next_question(refreshed, history, fresh["telefoon"])
    except Exception as e:
        print(f"auto_advance_photo error: {e}")


# ── Reply generation ─────────────────────────────────────────────────────

async def _send_next_question(lead: dict, history: list[ConversationMessage], phone: str):
    demo_type = lead.get("demo_type")
    if not demo_type:
        return
    config = get_branche(demo_type)
    if not config:
        return

    identity = {"naam": lead.get("naam"), "email": lead.get("email")}
    collected = dict(lead.get("collected_data") or {})
    current_data = {f.key: collected.get(f.key) for f in config.fields if collected.get(f.key)}

    reply = await generate_reply(demo_type, history, identity, current_data, collected)

    # [WAIT] guard
    if reply.strip().upper().startswith("[WAIT]"):
        print(f"[reply] [WAIT] token — holding off for lead {lead['id']}")
        return

    await send_text(phone, reply)
    await _save_message(lead["id"], "assistant", reply)


# ── Scheduling handlers ─────────────────────────────────────────────────

async def _handle_start_scheduling(lead: dict, text_body: str, phone: str):
    positive = bool(re.search(r"\b(ja|jazeker|graag|prima|ok|oké|okee|akkoord|klinkt goed|doe maar|yes)\b", text_body, re.IGNORECASE))
    if not positive:
        await send_text(phone, 'Geen probleem! Wil je later toch nog een gesprek inplannen? Stuur dan "ja" en dan stel ik wat tijden voor.')
        return

    # Import here to avoid circular dependency (scheduling uses google_calendar)
    from services.scheduling import propose_slots, format_confirmation

    klant_naam = lead.get("naam") or "daar"
    message, slots = await propose_slots(klant_naam)

    collected = dict(lead.get("collected_data") or {})
    collected["_proposed_slots"] = [s.model_dump() for s in slots] if slots else []

    get_supabase().table("leads").update({
        "status": "scheduling",
        "collected_data": collected,
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    await send_text(phone, message)
    await _save_message(lead["id"], "assistant", message)


async def _handle_scheduling(lead: dict, phone: str):
    from services.scheduling import match_slot, format_confirmation, FreeSlot
    from services.google_calendar import create_event

    collected = dict(lead.get("collected_data") or {})
    proposed_raw = collected.get("_proposed_slots") or []

    if not proposed_raw:
        from services.scheduling import propose_slots
        klant_naam = lead.get("naam") or "daar"
        message, slots = await propose_slots(klant_naam)
        collected["_proposed_slots"] = [s.model_dump() for s in slots] if slots else []
        get_supabase().table("leads").update({"collected_data": collected}).eq("id", lead["id"]).execute()
        await send_text(phone, message)
        return

    # Reconstruct FreeSlot objects
    proposed = [FreeSlot(**s) for s in proposed_raw]

    history = await _fetch_history(lead["id"])
    matched = await match_slot(history, proposed)

    if not matched:
        await send_text(phone, "Sorry, ik kon je keuze niet helemaal plaatsen. Kun je het nummer (1, 2 of 3) sturen?")
        return

    # Create Google Calendar event
    try:
        config = get_branche(lead.get("demo_type")) if lead.get("demo_type") else None
        summary = f"Frontlix demo gesprek met {lead.get('naam') or 'klant'}"
        if config:
            summary += f" ({config.label})"
        description = f"Demo afspraak via WhatsApp.\n\nKlant: {lead.get('naam')}\nEmail: {lead.get('email')}\nTelefoon: +{lead['telefoon']}"

        event_id = await create_event(
            start_utc=matched.start_utc,
            end_utc=matched.end_utc,
            summary=summary,
            description=description,
            attendee_email=lead.get("email"),
        )
    except Exception as e:
        print(f"Google Calendar createEvent failed: {e}")
        await send_text(phone, "Hmm, er ging iets mis bij het inplannen. Een collega neemt persoonlijk contact met je op.")
        return

    # Update lead
    collected["_appointment_at"] = matched.iso
    collected["_google_event_id"] = event_id
    get_supabase().table("leads").update({
        "status": "appointment_booked",
        "collected_data": collected,
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    confirmation = format_confirmation(matched, lead.get("naam") or "daar")
    await send_text(phone, confirmation)
    await _save_message(lead["id"], "assistant", confirmation)


# ── Approval trigger ─────────────────────────────────────────────────────

async def _trigger_approval(lead_id: str):
    """Calculate pricing, generate approval token, send approval email."""
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

    # Save pricing + token
    sb.table("leads").update({
        "status": "pending_approval",
        "approval_token": approval_token,
        "pricing": pricing.model_dump(),
        "updated_at": _now_iso(),
    }).eq("id", lead_id).execute()

    # Send WhatsApp confirmation
    await send_text(
        lead["telefoon"],
        "Top, ik heb alles wat ik nodig heb! Je krijgt zo een mailtje met de offerte ter goedkeuring. Zodra die is goedgekeurd stuur ik je hier de PDF."
    )

    # Send approval email
    try:
        from services.mail import send_approval_email

        site_url = get_settings().site_url
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
            approve_url=f"{site_url}/api/demo-approve?token={approval_token}",
            edit_url=f"{site_url}/api/demo-edit?token={approval_token}",
            photo_urls=photo_urls,
        )
    except Exception as e:
        print(f"[approval] email failed: {e}")
