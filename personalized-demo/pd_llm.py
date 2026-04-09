"""Personalized demo LLM — extraction and reply using the briefing from Supabase.

Unlike the branche LLMs, these prompts are dynamic: they adapt to each prospect's
briefing, company name, and industry. The persona is always "een medewerker van Frontlix"
who personalizes the conversation for the specific prospect.
"""
from __future__ import annotations

import json
import os
from typing import Any

from services.openai_client import get_openai  # shared via lead-automation
from models.lead import ConversationMessage  # shared via lead-automation
from pd_config import PERSONALIZED_FIELDS


def _format_history(history: list[ConversationMessage]) -> str:
    return "\n".join(
        f"{'Klant' if m.role == 'user' else 'Assistent'}: {m.content}"
        for m in history
    )


# ── Extraction ──────────────────────────────────────────────────────────


def _build_extraction_prompt(
    naam_prospect: str,
    bedrijf: str,
    branche: str,
    briefing: str,
) -> str:
    """Build a dynamic extraction prompt based on the personalized demo briefing."""
    return f"""## ROLE
You are a data extractor for a personalized sales demo. Read the Dutch WhatsApp
conversation and return **ONLY** newly found or corrected fields as JSON.

## CONTEXT
This is a personalized demo for {naam_prospect} from {bedrijf} ({branche}).
Briefing: {briefing}

## FIELDS
- naam: first name or full name of the person chatting (top-level)
- email: valid email address containing @ (top-level)
- interesse: what specific service or product they're most interested in (free text)
- situatie: their current situation or pain point (free text)
- wensen: specific wishes, requirements, or goals (free text)
- tijdlijn: when they want to start or how urgent it is (free text)
- budget: budget indication if mentioned (free text)

## OUTPUT FORMAT
Only fields that are **NEW** or **CORRECTED**:
{{ "naam": "...", "email": "...", "data": {{ "interesse": "...", "situatie": "..." }} }}

If nothing new: return {{}}. No explanation, only JSON.

## EXAMPLES
Conversation: "Klant: hoi ik ben Lars, ik zoek iemand die onze bedrijfswagens kan wrappen"
→ {{ "naam": "Lars", "data": {{ "interesse": "bedrijfswagens wrappen" }} }}

Conversation: "Klant: we willen eigenlijk binnen 2 weken starten"
→ {{ "data": {{ "tijdlijn": "binnen 2 weken" }} }}

Conversation: "Klant: wat kost dat?"
→ {{}}"""


async def extract_personalized_data(
    history: list[ConversationMessage],
    identity: dict,
    current_data: dict,
    demo_info: dict,
) -> dict[str, Any]:
    """Extract new/corrected data from a personalized demo conversation.

    demo_info should contain: naam, bedrijf, branche, briefing from the
    personalized_demos Supabase table.
    """
    prompt = _build_extraction_prompt(
        naam_prospect=demo_info.get("naam", ""),
        bedrijf=demo_info.get("bedrijf", ""),
        branche=demo_info.get("branche", ""),
        briefing=demo_info.get("briefing", ""),
    )

    # Add known values context
    known_lines = [
        f"- naam: {identity.get('naam') or 'unknown'}",
        f"- email: {identity.get('email') or 'unknown'}",
    ]
    for key in ["interesse", "situatie", "wensen", "tijdlijn", "budget"]:
        known_lines.append(f"- {key}: {current_data.get(key) or 'unknown'}")

    full_prompt = f"{prompt}\n\n## KNOWN VALUES (return NOTHING if already correct)\n" + "\n".join(known_lines)
    chat_history = _format_history(history)

    response = get_openai().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": full_prompt},
            {"role": "user", "content": chat_history},
        ],
    )

    text = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {}

    result: dict[str, Any] = {}

    if isinstance(parsed.get("naam"), str) and parsed["naam"]:
        result["naam"] = parsed["naam"]
    if isinstance(parsed.get("email"), str) and "@" in parsed.get("email", ""):
        result["email"] = parsed["email"]

    # Data fields
    data_keys = ["interesse", "situatie", "wensen", "tijdlijn", "budget"]
    data: dict[str, str] = {}

    for k in data_keys:
        v = parsed.get(k)
        if v is not None and v != "" and str(v) != "null":
            data[k] = str(v)

    if isinstance(parsed.get("data"), dict):
        for k in data_keys:
            v = parsed["data"].get(k)
            if v is not None and v != "" and str(v) != "null":
                data[k] = str(v)

    if data:
        result["data"] = data

    return result


# ── Reply generation ────────────────────────────────────────────────────


def _determine_next_tag(identity: dict, data: dict, collected_data: dict) -> str:
    """Determine the next field to ask about."""
    if not identity.get("naam"):
        return "naam"

    for field in PERSONALIZED_FIELDS:
        if not data.get(field):
            return field

    if not collected_data.get("_photo_step_done"):
        return "PHOTO_STEP"

    if not identity.get("email"):
        return "email"

    return "COMPLETE"


def _build_reply_prompt(
    naam_prospect: str,
    bedrijf: str,
    branche: str,
    briefing: str,
) -> str:
    """Build a dynamic reply prompt based on the personalized demo briefing."""
    return f"""## YOU
You are a friendly Frontlix consultant having a personalized WhatsApp demo conversation.
You're showing {naam_prospect} from {bedrijf} how automated lead follow-up works.
This is a WARM lead — they already know about Frontlix. Be personal and knowledgeable.

## BRIEFING (use this to tailor your conversation)
{briefing}

## PROSPECT INFO
- Naam: {naam_prospect}
- Bedrijf: {bedrijf}
- Branche: {branche}

## YOUR VOICE
- Short sentences, max 2-3 per message. Warm, professioneel, enthousiast maar niet overdreven
- Always reply in informal Dutch using "je/jij"
- Use words like: "gaaf", "helder", "top", "snap ik", "mooi"
- Always capitalize the first word. Write flowing short sentences, never bullet lists
- Match the customer's message length
- Never use dashes (-) or em-dashes (—) in your reply. Use a comma instead

## HOW YOU WORK
- Ask exactly 1 question per message — the NEXT field below
- When the customer gives their name, greet them warmly ONCE with their name
- After that, do NOT use the customer's name until the final COMPLETE message
- If the customer asks about Frontlix services or pricing, give a brief helpful answer, then continue
- If off-topic, acknowledge in 1 sentence, then continue
- If unsure ("weet niet"), offer an easy alternative, then move on
- If waiting ("moment", "even") → reply ONLY with "[WAIT]"
- If frustrated → acknowledge warmly, stop asking, wait
- Never prefix your reply with your name — just write the message

## FIELD GUIDE (use these as inspiration, adapt to the prospect's branche)
- naam → "Hoi! Met wie spreek ik?"
- interesse → Ask what specific service or challenge they're looking at (relate to their branche: {branche})
- situatie → Ask about their current situation: how they handle leads now, what works, what doesn't
- wensen → Ask what their ideal outcome would look like
- tijdlijn → Ask when they'd like to get started or how urgent it is
- PHOTO_STEP → "Als je wilt mag je een screenshot of foto sturen van je huidige werkwijze. Geen foto? Geen probleem"
- email → "Wat is je mailadres? Dan stuur ik je een samenvatting met een concreet voorstel"
- COMPLETE → Warmly confirm you have everything, explain that a Frontlix team member will personally follow up with a tailored proposal

## EXAMPLES

Klant: "hoi"
→ Hoi! Leuk dat je de demo probeert. Met wie spreek ik?

Klant: "Lars"
→ Hoi Lars! Gaaf dat je kijkt. Waar ben je het meest in geïnteresseerd voor {bedrijf}?

Klant: "we missen te veel leads"
→ Snap ik, dat horen we vaker. Hoe pakken jullie het nu aan als er een aanvraag binnenkomt?

Klant: "moment"
→ [WAIT]

Klant: "dit duurt lang"
→ Sorry, ging te snel. Laat maar weten wanneer je er weer bent."""


async def generate_personalized_reply(
    history: list[ConversationMessage],
    identity: dict,
    data: dict,
    collected_data: dict,
    demo_info: dict,
) -> str:
    """Generate the next WhatsApp message for a personalized demo conversation."""
    prompt = _build_reply_prompt(
        naam_prospect=demo_info.get("naam", ""),
        bedrijf=demo_info.get("bedrijf", ""),
        branche=demo_info.get("branche", ""),
        briefing=demo_info.get("briefing", ""),
    )

    next_tag = _determine_next_tag(identity, data, collected_data)

    # Build known info section
    parts = [
        f"Naam: {identity.get('naam') or 'unknown'}",
        f"E-mail: {identity.get('email') or 'unknown'}",
    ]
    for field in PERSONALIZED_FIELDS:
        parts.append(f"{field}: {data.get(field) or 'unknown'}")

    photo_count = len(collected_data.get("photos", []))
    parts.append(f"Photos: {photo_count}")
    known_info = "\n- " + "\n- ".join(parts)

    full_prompt = f"""{prompt}

## NOW
Known info:{known_info}

NEXT: {next_tag}

Write 1 WhatsApp message in Dutch. First check if the customer is waiting, unsure or frustrated. Only the message text — no JSON, no explanation."""

    chat_history = _format_history(history)
    model = os.environ.get("PERSONALIZED_REPLY_MODEL", "gpt-4o")

    response = get_openai().chat.completions.create(
        model=model,
        temperature=0.6,
        messages=[
            {"role": "system", "content": full_prompt},
            {"role": "user", "content": f"Conversation history:\n{chat_history}\n\nWrite the next message."},
        ],
    )

    return (response.choices[0].message.content or "").strip() or "Sorry, er ging iets mis. Probeer het opnieuw."
