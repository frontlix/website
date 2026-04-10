"""Personalized demo webhook handler — apart van de branche webhook.

Wordt aangeroepen vanuit de hoofdwebhook wanneer demo_type == "personalized".
Gebruikt eigen LLM prompts specifiek voor De Designmaker.

1 extractie-LLM (herkent categorie + haalt velden op)
4 reply-LLMs (elk met eigen vragen per dienst)
"""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, timedelta, timezone
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
    if re.match(r"^(nee|nope|geen|klaar|skip|stop|niets|niks|later|overslaan)$", t):
        return True
    if re.search(
        r"\b(geen foto|geen fotos|geen foto's|heb geen|sla over|dat (is|was) alles|ben klaar"
        r"|niet bij de hand|heb er geen|foto volgt|nu niet|later misschien|kan nu niet"
        r"|heb nu geen|zonder foto|liever niet|doe maar zonder)\b", t
    ):
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
        await _save_message(lead["id"], "user", text_body)
        await _handle_scheduling(lead, text_body, phone)


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
        # Als het gesprek maar 1-2 berichten had, laat de reply-LLM een persoonlijk
        # COMPLETE-bericht genereren zodat de klant een warme begroeting krijgt
        if (lead.get("message_count") or 0) <= 2:
            updated = {**lead, "naam": new_naam, "email": new_email, "collected_data": collected}
            await _send_next_question(updated, history, phone)
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
        # Ga direct door met de volgende vraag
        if lead.get("email"):
            await _trigger_completion(lead["id"])
        else:
            refreshed = {**lead, "collected_data": collected}
            await _send_next_question(refreshed, await _fetch_history(lead["id"]), lead["telefoon"])
        return

    sb.table("leads").update({"collected_data": collected, "updated_at": _now_iso()}).eq("id", lead["id"]).execute()

    # Geen bevestigingsbericht — wacht 30 sec op meer foto's, ga dan door
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

    # Demo opmerking
    await send_text(
        lead["telefoon"],
        "Opmerking: check je email, er is nu een email naar je toe gestuurd met daarin een opmaak voor de offerte. Die kan je nu goedkeuren of wijzigen."
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

        html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#F3F4F6">
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">

          <!-- Header -->
          <div style="background:#111111;padding:20px 24px">
            <table style="width:100%;border-collapse:collapse"><tr>
              <td><span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.3px">De Designmaker</span></td>
              <td style="text-align:right"><span style="background:#f97316;color:#fff;font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px">Ter beoordeling</span></td>
            </tr></table>
          </div>

          <!-- Content -->
          <div style="padding:24px">

            <!-- Dienst badge -->
            <div style="margin-bottom:20px">
              <span style="background:#F0F9FF;color:#0369A1;font-size:13px;font-weight:600;padding:5px 14px;border-radius:8px">{esc(branche_label)}</span>
            </div>

            <!-- Klantgegevens -->
            <p style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Klantgegevens</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px 12px 8px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6;white-space:nowrap">Naam</td><td style="padding:8px 0;font-size:14px;font-weight:600;border-bottom:1px solid #F3F4F6">{esc(naam)}</td></tr>
              <tr><td style="padding:8px 12px 8px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6;white-space:nowrap">Telefoon</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #F3F4F6">+{esc(lead['telefoon'])}</td></tr>
              <tr><td style="padding:8px 12px 8px 0;color:#6B7280;font-size:13px;border-bottom:1px solid #F3F4F6;white-space:nowrap">Email</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #F3F4F6;word-break:break-all">{esc(email)}</td></tr>
              {fields_rows}
            </table>

            {photos_section}

            <!-- Prijsoverzicht -->
            <p style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:20px 0 8px">Prijsoverzicht</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
              {price_rows}
            </table>

            <!-- Totalen blok -->
            <div style="background:#F9FAFB;border-radius:10px;padding:16px">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:3px 0;font-size:13px;color:#6B7280">Subtotaal excl. BTW</td><td style="padding:3px 0;text-align:right;font-size:13px;color:#6B7280">\u20AC {pricing.subtotaal_excl_btw:,.2f}</td></tr>
                <tr><td style="padding:3px 0;font-size:13px;color:#6B7280">BTW 21%</td><td style="padding:3px 0;text-align:right;font-size:13px;color:#6B7280">\u20AC {pricing.btw_bedrag:,.2f}</td></tr>
                <tr><td colspan="2" style="padding:0"><div style="border-top:2px solid #E5E7EB;margin:8px 0"></div></td></tr>
                <tr><td style="padding:3px 0;font-size:16px;font-weight:800;color:#111">Totaal incl. BTW</td><td style="padding:3px 0;text-align:right;font-size:16px;font-weight:800;color:#111">\u20AC {pricing.totaal_incl_btw:,.2f}</td></tr>
              </table>
            </div>

            <!-- Knoppen — gestapeld voor mobiel -->
            <div style="margin:24px 0 12px">
              <a href="{esc(approve_url)}" style="background:#16a34a;color:#ffffff;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:block;text-align:center;margin-bottom:10px">Goedkeuren &amp; versturen</a>
              <a href="{esc(edit_url)}" style="background:#f97316;color:#ffffff;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:block;text-align:center">Bewerken</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#F9FAFB;padding:16px 24px;text-align:center;border-top:1px solid #F3F4F6">
            <p style="color:#9CA3AF;font-size:11px;margin:0;line-height:1.5">
              De Designmaker — Windmolenboschweg 14, Haelen<br>lars@dedesignmaker.nl
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
    """Klant antwoordt na ontvangst offerte — start de scheduling agent."""
    await _save_message(lead["id"], "user", text_body)

    get_supabase().table("leads").update({
        "status": "scheduling",
        "updated_at": _now_iso(),
    }).eq("id", lead["id"]).execute()

    lead["status"] = "scheduling"
    await _run_scheduling_agent(lead, phone)


async def _handle_scheduling(lead: dict, text_body: str, phone: str):
    """Klant stuurt een bericht tijdens het scheduling gesprek."""
    await _run_scheduling_agent(lead, phone)


# ── Scheduling agent (function calling) ──────────────────────────────────

SCHEDULING_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "check_beschikbaarheid",
            "description": "Check welke dagen vrij zijn in de agenda van De Designmaker. Gebruik dit als de klant vraagt wanneer het kan of als je moet weten welke dagen beschikbaar zijn.",
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
            "description": "Boek een afspraak op een specifieke datum. Het voertuig wordt de hele dag verwacht (inleveren voor 10:00). Gebruik dit ALLEEN als de klant akkoord gaat met een datum.",
            "parameters": {
                "type": "object",
                "properties": {
                    "datum": {
                        "type": "string",
                        "description": "Datum in YYYY-MM-DD formaat",
                    },
                },
                "required": ["datum"],
            },
        },
    },
]

SCHEDULING_SYSTEM_PROMPT = """Je bent Nick, een vriendelijke wrapping specialist bij De Designmaker in Haelen.
De klant heeft een offerte ontvangen en wil een afspraak inplannen om het voertuig te brengen.

## REGELS
- Voer een natuurlijk, warm gesprek over het inplannen
- Gebruik de tool `check_beschikbaarheid` om te zien welke dagen vrij zijn
- Gebruik de tool `boek_afspraak` zodra de klant een datum bevestigt
- Het voertuig wordt een HELE DAG verwacht (inleveren voor 10:00 uur)
- Max 2-3 zinnen per bericht, informeel Nederlands
- Geen streepjes (-) of gedachtestrepen (—) gebruiken
- NOOIT emoji's gebruiken. Geen smileys, geen duimpjes, geen enkele emoji
- Als de klant vaag is ("volgende week", "ergens in mei") → check de agenda en stel 2-3 passende dagen voor
- Als de klant een dag noemt die niet beschikbaar is → leg vriendelijk uit en stel een alternatief voor
- Als de klant twijfelt of geen afspraak wil → respecteer dat, geen druk uitoefenen

## VOORBEELDEN
Klant: "wanneer kan ik langskomen?" → Gebruik check_beschikbaarheid, stel 2-3 dagen voor
Klant: "dinsdag past me goed" → Check of de eerstvolgende dinsdag vrij is, zo ja bevestig
Klant: "liever volgende week" → Check beschikbaarheid, stel opties voor die week voor
Klant: "doe maar woensdag 16 april" → Gebruik boek_afspraak met 2026-04-16"""


async def _execute_tool(tool_name: str, tool_args: dict, lead: dict) -> str:
    """Voer een scheduling tool uit en return het resultaat als string."""
    from services.google_calendar import get_free_slots, create_event, TIMEZONE
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(TIMEZONE)

    if tool_name == "check_beschikbaarheid":
        now = datetime.now(timezone.utc)
        range_end = now + timedelta(days=60)
        try:
            all_slots = await get_free_slots(now, range_end, 500)
        except Exception as e:
            return f"Fout bij ophalen agenda: {e}"

        # Groepeer per dag
        NL_WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
        NL_MONTHS = ["", "januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"]

        free_days: dict[str, str] = {}
        for slot in all_slots:
            dt = datetime.fromisoformat(slot["start_utc"]).astimezone(tz)
            date_key = dt.strftime("%Y-%m-%d")
            if date_key not in free_days:
                label = f"{NL_WEEKDAYS[dt.weekday()]} {dt.day} {NL_MONTHS[dt.month]}"
                free_days[date_key] = label

        if not free_days:
            return "Er zijn geen vrije dagen gevonden in de komende 2 maanden."

        days_list = "\n".join(f"- {label} ({key})" for key, label in sorted(free_days.items()))
        return f"Vrije dagen in de agenda:\n{days_list}"

    elif tool_name == "boek_afspraak":
        datum = tool_args.get("datum", "")
        if not datum:
            return "Fout: geen datum opgegeven."

        collected = dict(lead.get("collected_data") or {})
        naam = lead.get("naam") or "klant"
        type_dienst = collected.get("type_dienst", "wrapping")

        try:
            parts = datum.split("-")
            local_start = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 10, 0, tzinfo=tz)
            local_end = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 17, 0, tzinfo=tz)
            start_utc = local_start.astimezone(timezone.utc)
            end_utc = local_end.astimezone(timezone.utc)

            event_id = await create_event(
                start_utc=start_utc,
                end_utc=end_utc,
                summary=f"De Designmaker — {type_dienst} voor {naam}",
                description=f"Voertuig inleveren voor 10:00.\n\nKlant: {naam}\nEmail: {lead.get('email')}\nTelefoon: +{lead['telefoon']}\nDienst: {type_dienst}",
                attendee_email=lead.get("email"),
            )

            # Update lead status
            collected["_appointment_at"] = datum
            collected["_google_event_id"] = event_id
            get_supabase().table("leads").update({
                "status": "appointment_booked",
                "collected_data": collected,
                "updated_at": _now_iso(),
            }).eq("id", lead["id"]).execute()

            NL_WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
            NL_MONTHS = ["", "januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"]
            dag = NL_WEEKDAYS[local_start.weekday()]
            maand = NL_MONTHS[local_start.month]
            return f"Afspraak geboekt op {dag} {local_start.day} {maand}. Google Calendar uitnodiging is verstuurd naar {lead.get('email')}."

        except Exception as e:
            return f"Fout bij het boeken: {e}"

    return f"Onbekende tool: {tool_name}"


async def _run_scheduling_agent(lead: dict, phone: str):
    """AI agent met function calling voor het inplannen van een afspraak."""
    from services.openai_client import get_openai
    import json

    try:
        collected = dict(lead.get("collected_data") or {})
        naam = lead.get("naam") or "daar"
        type_dienst = collected.get("type_dienst", "wrapping")
        history = await _fetch_history(lead["id"])

        # Bouw messages array
        messages: list[dict] = [
            {"role": "system", "content": SCHEDULING_SYSTEM_PROMPT + f"\n\nKlant: {naam}\nDienst: {type_dienst}\nVandaag: {datetime.now(timezone.utc).strftime('%A %d %B %Y')}"},
        ]

        # Voeg conversatie history toe
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
                # Voeg de assistant message toe als dict (niet als Pydantic object)
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

                    # Voer de tool uit
                    result = await _execute_tool(tool_name, tool_args, lead)
                    print(f"[scheduling-agent] Tool result: {result[:100]}...")

                    # Voeg tool result toe aan messages
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
        import traceback
        print(f"[scheduling-agent] ERROR:")
        traceback.print_exc()

    # Als de loop eindigt zonder antwoord
    await send_text(phone, "Welke dag zou je het voertuig willen brengen?")
    await _save_message(lead["id"], "assistant", "Welke dag zou je het voertuig willen brengen?")
