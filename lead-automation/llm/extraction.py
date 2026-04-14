"""Branche-specific data extraction from WhatsApp conversations.

Each branche has its own system prompt with field definitions and examples.
Instructions are in English, field names and examples stay in Dutch.
"""
from __future__ import annotations

import json
from typing import Any

from services.openai_client import get_openai
from models.lead import ConversationMessage
from branches.base import normalize_enum
from branches import get_branche

from llm.detect import format_history


# ── Extraction prompts per branche ──────────────────────────────────────

EXTRACTION_PROMPTS: dict[str, str] = {
    "zonnepanelen": """## ROLE
You are a data extractor for a solar panel installer. Read the Dutch WhatsApp conversation and return **ONLY** newly found or corrected fields as JSON.

## FIELDS
- naam: first name or full name (top-level)
- email: valid email address. MUST contain @, MUST have a dot in the domain part, MUST have no whitespace. If malformed (missing dot, whitespace, typos like "gmialcom", "gail.com", ".co" instead of ".com"): OMIT the field entirely. Do NOT auto-correct.
- jaarverbruik: number in kWh/year ("4000", "ongeveer 5000 kWh", "3.500" → 3500). Vague words → omit.
- daktype: ONLY "schuin" or "plat". "hellend" → "schuin". "flat" → "plat".
- dakmateriaal: ONLY "pannen", "riet", "leisteen" or "dakbedekking".
  · "dakpannen", "keramische pannen" → "pannen"
  · "bitumen", "EPDM", "roofing" → "dakbedekking"
  · "lei", "leien" → "leisteen"
- dakoppervlakte: number in m²
- orientatie: ONLY "noord", "oost", "zuid" or "west". Combinations like "noord-oost" → do NOT return.
- schaduw: ONLY "geen", "licht" or "veel".
- aansluiting: ONLY "1-fase" or "3-fase". "krachtstroom" → "3-fase". If unsure → omit.

## OUTPUT FORMAT
Only fields that are **NEW** or **CORRECTED**:
{{ "naam": "...", "email": "...", "data": {{ "jaarverbruik": "4000", "daktype": "schuin" }} }}

If nothing new: return {{}}. No explanation, only JSON.

## EXAMPLES
Conversation: "Klant: ik ben Mark, schuin dak met dakpannen, ongeveer 4000 kWh per jaar"
→ {{ "naam": "Mark", "data": {{ "jaarverbruik": "4000", "daktype": "schuin", "dakmateriaal": "pannen" }} }}

Conversation: "Klant: het staat op het zuidwesten"
→ {{}} (combination orientation is not accepted)

Conversation: "Klant: mark@gmialcom"
→ {{}} (malformed email, domain lacks a dot — omit)""",

    "dakdekker": """## ROLE
You are a data extractor for a roofing company. Read the Dutch WhatsApp conversation and return **ONLY** newly found or corrected fields as JSON.

## FIELDS
- naam: first name or full name (top-level)
- email: valid email address. MUST contain @, MUST have a dot in the domain part, MUST have no whitespace. If malformed (missing dot, whitespace in the string, typos like "gmialcom", "gail.com", ".co" instead of ".com"): OMIT the field entirely. Do NOT auto-correct.
- type_werk: ONLY "vervangen", "repareren" or "isoleren".
- daktype: "plat" or "schuin"
- huidig_dakmateriaal: free text — "dakpannen", "bitumen", "EPDM", etc.
- dakoppervlakte: number in m²
- isolatie: "ja" or "nee". If unsure → omit.

## OUTPUT FORMAT
Only fields that are **NEW** or **CORRECTED**:
{{ "naam": "...", "email": "...", "data": {{ "type_werk": "vervangen", "daktype": "plat" }} }}

If nothing new: return {{}}. No explanation, only JSON.

## EXAMPLES
Conversation: "Klant: hoi ik ben Peter, mijn dak lekt, plat dak met bitumen"
→ {{ "naam": "Peter", "data": {{ "type_werk": "repareren", "daktype": "plat", "huidig_dakmateriaal": "bitumen" }} }}

Conversation: "Klant: weet ik niet zeker of ik isolatie wil"
→ {{}} (doubt = no value for isolatie)

Conversation: "Klant: peter@gmialcom"
→ {{}} (malformed email, domain lacks a dot — omit)

Conversation: "Klant: c.c.trom pje@gmialcom"
→ {{}} (whitespace + malformed domain — omit)""",

    "schoonmaak": """## ROLE
You are a data extractor for a cleaning company. Read the Dutch WhatsApp conversation and return **ONLY** newly found or corrected fields as JSON.

## FIELDS
- naam: first name or full name (top-level)
- email: valid email address. MUST contain @, MUST have a dot in the domain part, MUST have no whitespace. If malformed (missing dot, whitespace, typos like "gmialcom", "gail.com", ".co" instead of ".com"): OMIT the field entirely. Do NOT auto-correct.
- type_pand: ONLY "woning", "kantoor", "horeca" or "winkel".
- oppervlakte: number in m². "weet niet" → omit.
- frequentie: ONLY "eenmalig", "wekelijks", "2-wekelijks" or "maandelijks".
- ramen: "ja" or "nee". If unsure → omit.

## OUTPUT FORMAT
Only fields that are **NEW** or **CORRECTED**:
{{ "naam": "...", "email": "...", "data": {{ "type_pand": "kantoor", "oppervlakte": "120" }} }}

If nothing new: return {{}}. No explanation, only JSON.

## EXAMPLES
Conversation: "Klant: hoi ik ben Sara, ik zoek iemand voor ons restaurant, zo'n 200 m2"
→ {{ "naam": "Sara", "data": {{ "type_pand": "horeca", "oppervlakte": "200" }} }}

Conversation: "Klant: wat kost dat per maand?"
→ {{}}

Conversation: "Klant: sara@gmialcom"
→ {{}} (malformed email, domain lacks a dot — omit)""",
}


def _build_known_values(branche_id: str, identity: dict, current: dict) -> str:
    """Build the KNOWN VALUES section for the extraction prompt."""
    config = get_branche(branche_id)
    lines = [
        f"- naam: {identity.get('naam') or 'unknown'}",
        f"- email: {identity.get('email') or 'unknown'}",
    ]
    if config:
        for f in config.fields:
            lines.append(f"- {f.key}: {current.get(f.key) or 'unknown'}")
    return "\n".join(lines)


async def extract_data(
    branche_id: str,
    history: list[ConversationMessage],
    identity: dict,
    current_data: dict,
) -> dict[str, Any]:
    """Extract new/corrected data from the conversation. Returns dict with optional naam, email, data keys."""
    base_prompt = EXTRACTION_PROMPTS.get(branche_id)
    if not base_prompt:
        return {}

    known = _build_known_values(branche_id, identity, current_data)
    full_prompt = f"{base_prompt}\n\n## KNOWN VALUES (return NOTHING if already correct)\n{known}"

    chat_history = format_history(history)

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

    # Top-level naam + email
    if isinstance(parsed.get("naam"), str) and parsed["naam"]:
        result["naam"] = parsed["naam"]
    if isinstance(parsed.get("email"), str) and "@" in parsed.get("email", ""):
        result["email"] = parsed["email"]

    # Branche data fields — accept both top-level and nested in "data"
    config = get_branche(branche_id)
    if config:
        data_keys = [f.key for f in config.fields]
        data: dict[str, str] = {}

        # Top-level keys
        for k in data_keys:
            v = parsed.get(k)
            if v is not None and v != "" and str(v) != "null":
                data[k] = str(v)

        # Nested "data" object (overrides)
        if isinstance(parsed.get("data"), dict):
            for k in data_keys:
                v = parsed["data"].get(k)
                if v is not None and v != "" and str(v) != "null":
                    data[k] = str(v)

        # Normalize enum fields
        for f in config.fields:
            if f.type == "enum" and f.enum_values and f.key in data:
                normalized = normalize_enum(data[f.key], f.enum_values)
                if normalized:
                    data[f.key] = normalized
                else:
                    del data[f.key]

        if data:
            result["data"] = data

    return result
