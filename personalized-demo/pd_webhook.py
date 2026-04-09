"""Personalized demo webhook handler — apart van de branche webhook.

Wordt aangeroepen vanuit de hoofdwebhook wanneer demo_type == "personalized".
Gebruikt eigen LLM prompts specifiek voor De Designmaker.

1 extractie-LLM (herkent categorie + haalt velden op)
4 reply-LLMs (elk met eigen vragen per dienst)
"""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Any

from services.supabase import get_supabase  # shared via lead-automation
from services.whatsapp import send_text, get_media_url, download_media  # shared
from services.photo_vision import analyze_photo  # shared
from models.lead import ConversationMessage  # shared

from pd_llm import extract_data, generate_reply
from pd_config import FIELDS_PER_DIENST, ALL_FIELDS, RATE_LIMIT_MAX, MAX_PHOTOS, PHOTO_WAIT_MS


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


def _get_active_fields(collected: dict) -> list[str]:
    """Geef de velden voor de huidige dienst (of lege lijst)."""
    type_dienst = collected.get("type_dienst")
    if not type_dienst:
        return []
    return FIELDS_PER_DIENST.get(type_dienst, [])


def _all_fields_done(lead: dict, collected: dict) -> bool:
    """Check of alle velden voor de huidige dienst zijn ingevuld."""
    fields = _get_active_fields(collected)
    if not fields:
        return False
    return bool(lead.get("naam")) and all(collected.get(f) for f in fields)


# ── Main entry point ────────────────────────────────────────────────────

async def handle_personalized_message(lead: dict, message: dict, msg_type: str, phone: str):
    """Handle an inbound message for a personalized demo lead."""
    status = lead.get("status", "")

    if status == "appointment_booked":
        await send_text(phone, "Je afspraak staat al ingepland. We nemen contact met je op!")
        return
    if status == "pending_approval":
        await send_text(phone, "Je gegevens worden bekeken door ons team. Je hoort snel van ons!")
        return
    if status == "needs_handoff":
        await send_text(phone, "Een collega neemt zo snel mogelijk contact met je op!")
        return

    if msg_type == "image":
        await _handle_image(lead, message, phone)
        return

    if msg_type != "text":
        await send_text(phone, "Op dit moment kan ik alleen tekst en foto's verwerken. Stuur gerust een bericht!")
        return

    text_body = (message.get("text") or {}).get("body", "").strip()
    if not text_body:
        return

    await _save_message(lead["id"], "user", text_body)
    msg_count = (lead.get("message_count") or 0) + 1
    get_supabase().table("leads").update({
        "message_count": msg_count,
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    if msg_count > RATE_LIMIT_MAX:
        await send_text(phone, "Bedankt voor je interesse! Een collega neemt persoonlijk contact met je op.")
        return

    if status == "collecting":
        await _handle_collecting(lead, text_body, phone)
    elif status == "quote_sent":
        await _handle_start_scheduling(lead, text_body, phone)
    elif status == "scheduling":
        await _handle_scheduling(lead, phone)


# ── Collecting handler ───────────────────────────────────────────────────

async def _handle_collecting(lead: dict, text_body: str, phone: str):
    collected = dict(lead.get("collected_data") or {})
    history = await _fetch_history(lead["id"])

    # Photo skip detection
    if _all_fields_done(lead, collected) and not _is_photo_step_done(collected) and _user_skips_photo(text_body):
        collected["_photo_step_done"] = True
        get_supabase().table("leads").update({
            "collected_data": collected, "updated_at": _now_iso(),
        }).eq("id", lead["id"]).execute()

        if lead.get("email"):
            await _trigger_completion(lead["id"])
            return

        refreshed = {**lead, "collected_data": collected}
        await _send_next_question(refreshed, await _fetch_history(lead["id"]), phone)
        return

    # LLM 1: Extract klantgegevens (1 LLM voor alle categorieën)
    identity = {"naam": lead.get("naam"), "email": lead.get("email")}
    current_data = {k: collected.get(k) for k in ALL_FIELDS + ["type_dienst"] if collected.get(k)}

    extracted = await extract_data(history, identity, current_data)

    # Track opeenvolgende lege extracties voor escalatie
    has_new_data = bool(extracted.get("naam") or extracted.get("email") or extracted.get("data"))
    empty_streak = int(collected.get("_empty_extraction_streak") or 0)
    if has_new_data:
        collected["_empty_extraction_streak"] = 0
    else:
        empty_streak += 1
        collected["_empty_extraction_streak"] = empty_streak

    if empty_streak >= 5:
        get_supabase().table("leads").update({
            "status": "needs_handoff",
            "collected_data": collected,
            "updated_at": _now_iso(),
        }).eq("id", lead["id"]).execute()
        handoff_msg = "Ik merk dat ik je niet helemaal goed kan helpen via chat. Een collega neemt persoonlijk contact met je op!"
        await send_text(phone, handoff_msg)
        await _save_message(lead["id"], "assistant", handoff_msg)
        return

    # Apply extracted data
    new_naam = extracted.get("naam") or lead.get("naam")
    new_email = extracted.get("email") or lead.get("email")
    if extracted.get("data"):
        # Dienst-switch: verwijder velden van de oude dienst
        new_dienst = extracted["data"].get("type_dienst")
        old_dienst = collected.get("type_dienst")
        if new_dienst and old_dienst and new_dienst != old_dienst:
            old_fields = set(FIELDS_PER_DIENST.get(old_dienst, []))
            new_fields = set(FIELDS_PER_DIENST.get(new_dienst, []))
            for stale_key in old_fields - new_fields:
                collected.pop(stale_key, None)

        for k, v in extracted["data"].items():
            if v is not None:
                collected[k] = v

    get_supabase().table("leads").update({
        "naam": new_naam,
        "email": new_email,
        "collected_data": collected,
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    # Check if all done (dienst-specifieke velden + email + foto)
    fields = _get_active_fields(collected)
    still_missing = [f for f in fields if not collected.get(f)] if fields else ["type_dienst"]

    # Als alle velden + email er zijn maar foto stap nog niet gedaan,
    # markeer foto stap als gedaan (klant heeft het overgeslagen)
    if len(still_missing) == 0 and bool(new_naam) and bool(new_email) and not _is_photo_step_done(collected):
        collected["_photo_step_done"] = True
        get_supabase().table("leads").update({
            "collected_data": collected, "updated_at": _now_iso(),
        }).eq("id", lead["id"]).execute()

    all_done = bool(new_naam) and bool(new_email) and len(still_missing) == 0 and _is_photo_step_done(collected)

    if all_done:
        await _trigger_completion(lead["id"])
        return

    # LLM 2: Genereer antwoord (kiest automatisch de juiste reply-prompt)
    updated = {**lead, "naam": new_naam, "email": new_email, "collected_data": collected}
    await _send_next_question(updated, history, phone)


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
            refreshed = {**lead, "collected_data": collected}
            await _send_next_question(refreshed, await _fetch_history(lead["id"]), lead["telefoon"])
        return

    sb.table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()
    await send_text(phone, "Foto ontvangen, dank je!")

    asyncio.get_event_loop().call_later(
        PHOTO_WAIT_MS / 1000,
        lambda: asyncio.ensure_future(_auto_advance_photo(lead["id"], now_ms)),
    )


async def _auto_advance_photo(lead_id: str, photo_timestamp: int):
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
            refreshed = {**fresh, "collected_data": collected}
            history = await _fetch_history(lead_id)
            await _send_next_question(refreshed, history, fresh["telefoon"])
    except Exception as e:
        print(f"[personalized] auto_advance_photo error: {e}")


# ── Reply generation ─────────────────────────────────────────────────────

async def _send_next_question(lead: dict, history: list[ConversationMessage], phone: str):
    identity = {"naam": lead.get("naam"), "email": lead.get("email")}
    collected = dict(lead.get("collected_data") or {})
    current_data = {k: collected.get(k) for k in ALL_FIELDS + ["type_dienst"] if collected.get(k)}

    reply = await generate_reply(history, identity, current_data, collected)

    reply_upper = reply.strip().upper()

    if reply_upper.startswith("[WAIT]"):
        print(f"[personalized] [WAIT] token — holding off for lead {lead['id']}")
        await send_text(phone, "Geen probleem, neem je tijd!")
        await _save_message(lead["id"], "assistant", "Geen probleem, neem je tijd!")
        return

    if reply_upper.startswith("[HANDOFF]"):
        print(f"[personalized] [HANDOFF] token — handing off lead {lead['id']}")
        get_supabase().table("leads").update({
            "status": "needs_handoff",
            "updated_at": _now_iso(),
        }).eq("id", lead["id"]).execute()
        handoff_msg = "Snap ik helemaal! Ik laat een collega persoonlijk contact met je opnemen. Je hoort snel van ons!"
        await send_text(phone, handoff_msg)
        await _save_message(lead["id"], "assistant", handoff_msg)
        return

    await send_text(phone, reply)
    await _save_message(lead["id"], "assistant", reply)


# ── Completion trigger ───────────────────────────────────────────────────

async def _trigger_completion(lead_id: str):
    """Bereken pricing, genereer PDF, maak approval token, stuur approval email."""
    import uuid
    from html import escape as esc
    from services.mail import _send_email
    from pd_pricing import get_designmaker_pricing
    from pd_pdf import generate_designmaker_pdf, DIENST_LABELS
    from config import get_settings

    sb = get_supabase()
    resp = sb.table("leads").select("*").eq("id", lead_id).execute()
    lead = (resp.data or [None])[0]
    if not lead:
        return

    collected = dict(lead.get("collected_data") or {})
    type_dienst = collected.get("type_dienst", "carwrapping")
    naam = lead.get("naam") or "Klant"
    email = lead.get("email") or ""

    # Pricing berekenen
    string_data = {k: str(v) for k, v in collected.items() if v is not None and not isinstance(v, (dict, list))}
    pricing = get_designmaker_pricing(type_dienst, string_data)

    # Approval token aanmaken
    approval_token = str(uuid.uuid4())

    # PDF genereren
    pdf_url = None
    try:
        result = await generate_designmaker_pdf(
            lead_id=lead_id,
            type_dienst=type_dienst,
            klant_naam=naam,
            klant_email=email,
            collected_data=collected,
        )
        pdf_url = result["url"]
    except Exception as e:
        print(f"[personalized] PDF generation failed (continuing without): {e}")

    # Opslaan in leads tabel
    sb.table("leads").update({
        "status": "pending_approval",
        "approval_token": approval_token,
        "pricing": pricing.model_dump(),
        "quote_pdf_url": pdf_url,
        "updated_at": _now_iso(),
    }).eq("id", lead_id).execute()

    # WhatsApp bevestiging naar klant
    await send_text(
        lead["telefoon"],
        "Top, ik heb alles wat ik nodig heb! Je ontvangt zo een offerte per mail."
    )

    # Approval email sturen (naar het klant-emailadres)
    try:
        service_url = get_settings().service_url
        branche_label = DIENST_LABELS.get(type_dienst, "Wrapping")
        fields_for_dienst = FIELDS_PER_DIENST.get(type_dienst, [])

        # Velden tabel
        rows = []
        if type_dienst:
            rows.append(("Dienst", branche_label))
        for key in fields_for_dienst:
            v = collected.get(key)
            if v:
                rows.append((key.replace("_", " ").capitalize(), str(v)))

        fields_rows = "".join(
            f'<tr><td style="padding:10px 16px 10px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6">{esc(label)}</td>'
            f'<td style="padding:10px 0;font-size:14px;font-weight:500;border-bottom:1px solid #F3F4F6">{esc(value)}</td></tr>'
            for label, value in rows
        )

        # Pricing regels
        price_rows = "".join(
            f'<tr><td style="padding:10px 0;font-size:14px;border-bottom:1px solid #F3F4F6">{esc(line.label)}</td>'
            f'<td style="padding:10px 0;text-align:right;font-size:14px;font-weight:500;border-bottom:1px solid #F3F4F6">\u20AC {line.total:,.2f}</td></tr>'
            for line in pricing.lines
        )

        # Foto thumbnails
        photos_section = ""
        photo_urls = [u for u in (collected.get("photos") or []) if isinstance(u, str)]
        if photo_urls:
            thumbs = "".join(
                f'<img src="{esc(url)}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;margin:3px" />'
                for url in photo_urls[:6]
            )
            photos_section = f'''
            <div style="margin:20px 0">
              <p style="font-size:12px;font-weight:700;color:#1A1A1A;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">Foto\'s</p>
              {thumbs}
            </div>'''

        approve_url = f"{service_url}/personalized/approve?token={approval_token}"
        edit_url = f"{service_url}/personalized/edit?token={approval_token}"

        html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F3F4F6">
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">

          <!-- Header -->
          <div style="background:#111111;padding:28px 36px">
            <table style="width:100%"><tr>
              <td><span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">De Designmaker</span></td>
              <td style="text-align:right"><span style="background:#f97316;color:#fff;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px">Ter beoordeling</span></td>
            </tr></table>
          </div>

          <!-- Content -->
          <div style="padding:32px 36px">

            <!-- Dienst badge -->
            <div style="margin-bottom:24px">
              <span style="background:#F0F9FF;color:#0369A1;font-size:13px;font-weight:600;padding:6px 16px;border-radius:8px">{esc(branche_label)}</span>
            </div>

            <!-- Klantgegevens -->
            <p style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px">Klantgegevens</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr><td style="padding:10px 16px 10px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6">Naam</td><td style="padding:10px 0;font-size:15px;font-weight:600;border-bottom:1px solid #F3F4F6">{esc(naam)}</td></tr>
              <tr><td style="padding:10px 16px 10px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6">Telefoon</td><td style="padding:10px 0;font-size:14px;border-bottom:1px solid #F3F4F6">+{esc(lead['telefoon'])}</td></tr>
              <tr><td style="padding:10px 16px 10px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6">Email</td><td style="padding:10px 0;font-size:14px;border-bottom:1px solid #F3F4F6">{esc(email)}</td></tr>
              {fields_rows}
            </table>

            {photos_section}

            <!-- Prijsoverzicht -->
            <p style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:24px 0 10px">Prijsoverzicht</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              {price_rows}
            </table>

            <!-- Totalen blok -->
            <div style="background:#F9FAFB;border-radius:12px;padding:20px 24px">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280">Subtotaal excl. BTW</td><td style="padding:4px 0;text-align:right;font-size:14px;color:#6B7280">\u20AC {pricing.subtotaal_excl_btw:,.2f}</td></tr>
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280">BTW 21%</td><td style="padding:4px 0;text-align:right;font-size:14px;color:#6B7280">\u20AC {pricing.btw_bedrag:,.2f}</td></tr>
                <tr><td colspan="2" style="padding:0"><div style="border-top:2px solid #E5E7EB;margin:10px 0"></div></td></tr>
                <tr><td style="padding:4px 0;font-size:18px;font-weight:800;color:#111">Totaal incl. BTW</td><td style="padding:4px 0;text-align:right;font-size:18px;font-weight:800;color:#111">\u20AC {pricing.totaal_incl_btw:,.2f}</td></tr>
              </table>
            </div>

            <!-- Knoppen -->
            <div style="text-align:center;margin:32px 0 16px">
              <a href="{esc(approve_url)}" style="background:#16a34a;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;margin:6px">Goedkeuren &amp; versturen</a>
              <a href="{esc(edit_url)}" style="background:#f97316;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;margin:6px">Bewerken</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#F9FAFB;padding:20px 36px;text-align:center;border-top:1px solid #F3F4F6">
            <p style="color:#9CA3AF;font-size:11px;margin:0;line-height:1.6">
              De Designmaker — Windmolenboschweg 14, Haelen — lars@dedesignmaker.nl<br>
              Automatisch gegenereerd door het demo-systeem
            </p>
          </div>
        </div>
        </body></html>"""

        # PDF als bijlage downloaden
        attachments = []
        if pdf_url:
            try:
                import httpx
                pdf_data = httpx.get(pdf_url).content
                attachments.append({
                    "filename": f"Offerte-{branche_label}.pdf",
                    "data": pdf_data,
                    "content_type": "application/pdf",
                })
            except Exception as pdf_err:
                print(f"[personalized] PDF download for attachment failed: {pdf_err}")

        _send_email(
            to=email,
            subject=f"Offerte ter goedkeuring \u2014 {naam} ({branche_label})",
            html_body=html,
            attachments=attachments,
        )
    except Exception as e:
        import traceback
        print(f"[personalized] approval email failed:")
        traceback.print_exc()


# ── Scheduling handlers (hergebruikt Google Calendar uit lead-automation) ──

async def _handle_start_scheduling(lead: dict, text_body: str, phone: str):
    """Klant antwoordt na ontvangst offerte — LLM bepaalt of ze een afspraak willen."""
    # LLM interpreteert of de klant een afspraak wil
    wants_appointment = await _detect_appointment_intent(text_body)

    if not wants_appointment:
        await send_text(phone, "Helder! Als je later toch een afspraak wilt inplannen, laat het gerust weten. We staan voor je klaar.")
        await _save_message(lead["id"], "assistant", "Helder! Als je later toch een afspraak wilt inplannen, laat het gerust weten. We staan voor je klaar.")
        return

    from services.scheduling import propose_slots

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


async def _detect_appointment_intent(text: str) -> bool:
    """LLM bepaalt of de klant een afspraak wil inplannen."""
    from services.openai_client import get_openai
    import json

    response = get_openai().chat.completions.create(
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": """Je bent een intent-detector voor een WhatsApp gesprek met een klant van De Designmaker.
De klant heeft net een offerte ontvangen. Bepaal of de klant een afspraak wil inplannen.

Return ALLEEN JSON: { "wants_appointment": true } of { "wants_appointment": false }

Positief (true):
- "ja", "graag", "prima", "doe maar", "klinkt goed", "wanneer kan ik langskomen"
- "ik wil een afspraak", "plan maar in", "wanneer heb je tijd"
- Elke vorm van bevestiging of interesse in een afspraak

Negatief (false):
- "nee", "later", "ik denk erover na", "nog niet"
- Vragen over de offerte, prijs, of andere onderwerpen
- "bedankt", "dank je" (zonder afspraak-intentie)

Bij twijfel: false.""",
            },
            {"role": "user", "content": text},
        ],
    )

    try:
        parsed = json.loads(response.choices[0].message.content or "{}")
        return parsed.get("wants_appointment", False) is True
    except json.JSONDecodeError:
        return False


async def _handle_scheduling(lead: dict, phone: str):
    """Klant kiest een tijdslot."""
    from services.scheduling import match_slot, format_confirmation, FreeSlot, propose_slots
    from services.google_calendar import create_event

    collected = dict(lead.get("collected_data") or {})
    proposed_raw = collected.get("_proposed_slots") or []

    if not proposed_raw:
        klant_naam = lead.get("naam") or "daar"
        message, slots = await propose_slots(klant_naam)
        collected["_proposed_slots"] = [s.model_dump() for s in slots] if slots else []
        get_supabase().table("leads").update({"collected_data": collected}).eq("id", lead["id"]).execute()
        await send_text(phone, message)
        return

    proposed = [FreeSlot(**s) for s in proposed_raw]

    history = await _fetch_history(lead["id"])
    matched = await match_slot(history, proposed)

    if not matched:
        await send_text(phone, "Sorry, ik kon je keuze niet helemaal plaatsen. Kun je het nummer (1, 2 of 3) sturen?")
        return

    # Google Calendar event aanmaken
    try:
        type_dienst = collected.get("type_dienst", "wrapping")
        summary = f"De Designmaker — afspraak met {lead.get('naam') or 'klant'} ({type_dienst})"
        description = f"Afspraak via WhatsApp demo.\n\nKlant: {lead.get('naam')}\nEmail: {lead.get('email')}\nTelefoon: +{lead['telefoon']}\nDienst: {type_dienst}"

        event_id = await create_event(
            start_utc=matched.start_utc,
            end_utc=matched.end_utc,
            summary=summary,
            description=description,
            attendee_email=lead.get("email"),
        )
    except Exception as e:
        print(f"[personalized] Google Calendar failed: {e}")
        await send_text(phone, "Hmm, er ging iets mis bij het inplannen. Een collega neemt persoonlijk contact met je op.")
        return

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
