"""Universal message analyzer — replaces the legacy extract_data flow.

One LLM call per customer message returns:
  - extracted   : new/corrected naam, email, branche-fields (same shape as old extract_data)
  - intent      : 10-way classification (see Intent literal below)
  - answered_current_question : did the customer actually answer the specific field
                                the bot was waiting on?

Branche-specific data (fields, enum-values, units, persona) is injected at runtime
from `BrancheConfig`, so the prompt is one universal English structural template
with Dutch examples — no per-branche prompts.

Model: gpt-4o (structured outputs via response_format=json_schema).
"""
from __future__ import annotations

import json
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from services.openai_client import get_openai
from models.lead import ConversationMessage
from branches import get_branche
from branches.base import normalize_enum
from llm.detect import format_history


Intent = Literal[
    "direct_answer",       # customer answered the asked field with a concrete value
    "doesnt_know",         # customer says "geen idee" / "weet ik niet"
    "will_provide_later",  # customer says "kom ik later op terug" / "moet ik nog opzoeken"
    "price_question",      # customer asks about price / cost mid-flow
    "process_question",    # customer asks how something works ("hoe meet ik m²?")
    "off_topic",           # customer brings up unrelated topic / small talk
    "gibberish",           # message is nonsense / random typing
    "is_bot_question",     # customer asks "ben jij een bot/AI?"
    "acknowledgement",     # "ok", "ja", "thanks" — no new info, no question
    "quote_accepted",      # post-quote: customer accepts the offerte / wants the appointment
    "quote_declines",      # post-quote: customer declines / not interested
    "not_recognized",      # fallback / ambiguous — treat like gibberish
]


class AnalysisResult(BaseModel):
    """Structured analyzer output.

    `extracted` mirrors the legacy extract_data shape so the webhook can apply it
    without translation:
        { "naam": "...", "email": "...", "data": {"<field_key>": "<value>", ...} }
    Only NEW or CORRECTED fields are included; absent keys mean "no change".
    """
    extracted: dict[str, Any] = Field(default_factory=dict)
    intent: Intent = "not_recognized"
    answered_current_question: bool = False


# Per-branche JSON-schema (cached). OpenAI's strict-mode rejects open-ended
# `additionalProperties: <schema>` maps — every key in `data` must be enumerated
# explicitly in both `properties` AND `required`. We therefore build a schema
# with each branche's exact field keys (values nullable so the LLM can leave
# unanswered fields out by setting them null).
_INTENT_VALUES = list(Intent.__args__)  # type: ignore[attr-defined]
_SCHEMA_CACHE: dict[str, dict] = {}


def _build_analysis_schema(branche_id: str) -> dict:
    cached = _SCHEMA_CACHE.get(branche_id)
    if cached is not None:
        return cached

    config = get_branche(branche_id)
    field_keys: list[str] = sorted([f.key for f in config.fields]) if config else []
    data_props = {k: {"type": ["string", "null"]} for k in field_keys}

    schema = {
        "name": "AnalysisResult",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["extracted", "intent", "answered_current_question"],
            "properties": {
                "extracted": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["naam", "email", "data"],
                    "properties": {
                        "naam": {"type": ["string", "null"]},
                        "email": {"type": ["string", "null"]},
                        "data": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": field_keys,
                            "properties": data_props,
                        },
                    },
                },
                "intent": {
                    "type": "string",
                    "enum": _INTENT_VALUES,
                },
                "answered_current_question": {"type": "boolean"},
            },
        },
    }
    _SCHEMA_CACHE[branche_id] = schema
    return schema


_SYSTEM_PROMPT = """## ROLE
You analyze a Dutch WhatsApp conversation between a customer and a branche-specific assistant ({agent_name}, persona: {branche_label}). The customer just sent a new message. Your job is to:

1. Extract any NEW or CORRECTED values the customer just provided (name, email, branche-specific fields).
2. Classify the customer's INTENT — what kind of message they sent.
3. Determine if the customer actually answered the SPECIFIC field the bot was waiting on (the "current question").

## FIELDS YOU CAN EXTRACT
- naam: first name or full name (top-level)
- email: valid email — MUST contain @, MUST have a dot in the domain part, MUST have no whitespace. If malformed (missing dot, typos like "gmialcom"/"gail.com"/".co" instead of ".com", spaces inside): OMIT entirely. NEVER auto-correct.
- Branche-specific fields (see FIELD GUIDE below)

## FIELD GUIDE (branche: {branche_id})
{field_guide}

{branche_extras}

## CURRENT QUESTION
The bot last asked about: **{current_question}**

`answered_current_question` = true only if the customer's latest message provides a usable value for this specific field. "weet ik niet" → false. Answering a DIFFERENT field → false. Asking a question back → false.

## INTENT CLASSIFICATION (pick exactly one)
- direct_answer       : customer gave a concrete answer to the current question (or any other field).
- doesnt_know         : customer says "weet ik niet", "geen idee", "geen flauw idee", or similar uncertainty on THIS field.
- will_provide_later  : customer says they will look it up / come back later ("moet ik nog kijken", "kom ik later op terug").
- price_question      : customer asks about price/cost in the same message.
- process_question    : customer asks HOW to find out / measure / identify ("hoe meet ik dat?", "hoe weet ik wat ik heb?").
- off_topic           : customer brings up unrelated topic, small talk, weather, jokes.
- gibberish           : message is nonsense, random letters, no parseable content.
- is_bot_question     : customer asks if they're talking to a bot/AI ("ben je een bot?", "ben jij AI?").
- acknowledgement     : pure ack ("ok", "ja", "duidelijk", "thanks") with no answer to the current question and no question back.
- not_recognized      : truly ambiguous — fallback.

If the customer simultaneously gives an answer AND asks a question (e.g. "plat dak. wat kost het?"), pick the dominant intent — usually `direct_answer` if a concrete value is given.

## EXTRACTION RULES
- The output schema requires ALL branche-fields to be present in `extracted.data`. Set keys you have NO new value for to `null`. Only set a key to a concrete string when the customer just provided (or corrected) that value.
- Same rule for `naam` and `email`: null = no change, string = new/corrected.
- Enums must match one of the listed enum_values exactly (case-insensitive). If the customer says something ambiguous, set the key to null.
- Numbers (m², kWh): strip units, return digits only as a string ("4000", "200").
- If the customer says "weet niet" / "geen idee" on a field, set that field to null (don't store "weet niet" as the value).

## KNOWN VALUES
{known_values}

## OUTPUT
Return ONLY valid JSON matching the schema. No prose, no markdown.
"""


def _build_field_guide(branche_id: str) -> str:
    """Render the FIELD GUIDE bullet list from BrancheConfig.fields."""
    config = get_branche(branche_id)
    if not config:
        return "(unknown branche)"
    lines = []
    for f in config.fields:
        bits = [f"- **{f.key}**: {f.label}"]
        if f.type == "enum" and f.enum_values:
            bits.append(f"  · ONLY one of: {', '.join(f.enum_values)}")
        elif f.type == "number":
            bits.append(f"  · number{' in ' + f.unit if f.unit else ''}")
        elif f.type == "text":
            bits.append("  · free text")
        if f.example_question:
            bits.append(f"  · example bot-question: \"{f.example_question}\"")
        lines.append("\n".join(bits))
    return "\n".join(lines)


def _build_known_values(branche_id: str, identity: dict, current: dict) -> str:
    config = get_branche(branche_id)
    lines = [
        f"- naam: {identity.get('naam') or 'unknown'}",
        f"- email: {identity.get('email') or 'unknown'}",
    ]
    if config:
        for f in config.fields:
            lines.append(f"- {f.key}: {current.get(f.key) or 'unknown'}")
    return "\n".join(lines)


# ── Branche-specific edge-case knowledge (extras to the universal prompt) ──
# Kept minimal: only the impossible-combinations that the bot must catch.
_BRANCHE_EXTRAS: dict[str, str] = {
    "zonnepanelen": (
        "## TRADE KNOWLEDGE (zonnepanelen)\n"
        "- On a `plat` dak, `dakmateriaal` of pannen/riet/leisteen does NOT occur in practice. "
        "If KNOWN daktype=plat and the customer names a pitched-roof material, OMIT dakmateriaal (do not overwrite).\n"
        "- On a `schuin` dak, bitumen/EPDM is extremely unusual — same rule, OMIT.\n"
        "- For `orientatie`: combinations like \"noord-oost\", \"alle kanten\" → OMIT (don't guess)."
    ),
    "dakdekker": (
        "## TRADE KNOWLEDGE (dakdekker)\n"
        "- On `plat` dak, customer naming dakpannen/riet/leisteen → OMIT huidig_dakmateriaal.\n"
        "- On `schuin` dak, customer naming bitumen/EPDM → OMIT (probably a misunderstanding).\n"
        "- `type_werk`: \"lekkage repareren\" → \"repareren\"; \"nieuw dak\" → \"vervangen\"."
    ),
    "schoonmaak": (
        "## TRADE KNOWLEDGE (schoonmaak)\n"
        "- `frequentie` enum is strict: eenmalig / wekelijks / 2-wekelijks / maandelijks. "
        "\"per week\" → wekelijks; \"om de week\" → 2-wekelijks; \"1 keer per maand\" → maandelijks."
    ),
}


async def analyze_message(
    branche_id: str,
    history: list[ConversationMessage],
    identity: dict,
    current_data: dict,
    current_question_field: str,
) -> AnalysisResult:
    """Single LLM call: extract + classify intent + flag whether the customer
    answered the current field. Returns a default `not_recognized` AnalysisResult
    on parse/API errors so the caller can fall back to re-asking.
    """
    config = get_branche(branche_id)
    if not config:
        return AnalysisResult()

    prompt = _SYSTEM_PROMPT.format(
        agent_name=config.agent_name,
        branche_label=config.label,
        branche_id=branche_id,
        field_guide=_build_field_guide(branche_id),
        branche_extras=_BRANCHE_EXTRAS.get(branche_id, ""),
        current_question=current_question_field,
        known_values=_build_known_values(branche_id, identity, current_data),
    )
    chat_history = format_history(history)

    schema = _build_analysis_schema(branche_id)
    try:
        response = get_openai().chat.completions.create(
            model="gpt-4o",
            temperature=0,
            response_format={"type": "json_schema", "json_schema": schema},
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": chat_history},
            ],
        )
        text = response.choices[0].message.content or "{}"
        raw = json.loads(text)
        result = AnalysisResult.model_validate(raw)
    except Exception as e:
        print(f"[analyze] failed, returning not_recognized: {e}")
        return AnalysisResult()

    # Post-process `extracted` — same hygiene the old extract_data did:
    # drop blanks, enforce enum values, drop malformed emails.
    cleaned: dict[str, Any] = {}

    naam = result.extracted.get("naam")
    if isinstance(naam, str) and naam.strip():
        cleaned["naam"] = naam.strip()

    email = result.extracted.get("email")
    if isinstance(email, str):
        e = email.strip()
        if "@" in e and "." in e.split("@", 1)[1] and " " not in e:
            cleaned["email"] = e

    data_in = result.extracted.get("data") or {}
    if isinstance(data_in, dict):
        data: dict[str, str] = {}
        valid_keys = {f.key for f in config.fields}
        for k, v in data_in.items():
            if k not in valid_keys:
                continue
            if v is None:
                continue
            s = str(v).strip()
            if not s or s.lower() in {"null", "none", "unknown", "n.v.t.", "weet niet", "geen idee"}:
                continue
            data[k] = s
        # Normalize enum values
        for f in config.fields:
            if f.type == "enum" and f.enum_values and f.key in data:
                normalized = normalize_enum(data[f.key], f.enum_values)
                if normalized:
                    data[f.key] = normalized
                else:
                    del data[f.key]
        if data:
            cleaned["data"] = data

    result.extracted = cleaned
    return result


# ── Post-quote classifier ────────────────────────────────────────────────────
# Used by the webhook AFTER the offerte is sent: the customer's reply needs a
# different intent-vocabulary (do they accept? want a meeting? have a question
# about the quote?). Lightweight — no field extraction, just classification.

PostQuoteIntent = Literal[
    "quote_accepted",       # accepts the offerte / wants to proceed
    "quote_declines",       # not interested / explicit no
    "quote_question",       # asks a question about the quote itself (price, scope, ...)
    "process_question",     # asks about WHAT the appointment is for / how it works
    "is_bot_question",      # asks if they're talking to a bot
    "off_topic",            # unrelated chat
    "acknowledgement",      # bare "ok"/"hmm" without commitment either way
    "ambiguous",            # cannot tell — ask explicitly
]

_POST_QUOTE_SCHEMA = {
    "name": "PostQuoteAnalysis",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["intent"],
        "properties": {
            "intent": {
                "type": "string",
                "enum": list(PostQuoteIntent.__args__),  # type: ignore[attr-defined]
            },
        },
    },
}

_POST_QUOTE_PROMPT = """## ROLE
You analyze the LAST customer message in a Dutch WhatsApp conversation that just received an offerte. Your job: pick exactly ONE intent.

## INTENTS
- quote_accepted   : customer agrees / wants to proceed / "ik ga akkoord", "akkoort", "doe maar", "ja graag", "dat wil ik wel", "dat is goed", "perfect", "afspraak inplannen"
- quote_declines   : explicit no / not interested / "nee bedankt", "te duur", "laat maar", "ik zie er vanaf"
- quote_question   : a question about the quote itself — price, scope, materials, levertijd
- process_question : asks WHAT the appointment is for, how the process works, "waarvoor is dat?", "wat gaan jullie doen?"
- is_bot_question  : "ben je een bot", "ben jij AI"
- off_topic        : unrelated chat / small talk
- acknowledgement  : a bare "ok", "hmm", "thanks" with no clear yes/no
- ambiguous        : cannot classify confidently

Bias rules:
- ANY positive verb + offerte/afspraak/voorstel → quote_accepted. ("ik ga akkoord", "ik wil graag", "is goed").
- "ik ga akkoord met de offerte" → quote_accepted (NOT acknowledgement).
- "dat wil ik dus wel" / "dat wil ik graag" → quote_accepted.
- "ja" alone after the bot proposed scheduling → quote_accepted.
- "morgen om 2" / specific time → quote_accepted (they're already past acceptance).

## OUTPUT
Return ONLY valid JSON: {"intent": "<one of the values>"}.
"""


async def classify_post_quote_intent(history: list[ConversationMessage]) -> PostQuoteIntent:
    """Single LLM call to classify the customer's intent AFTER the offerte was sent.
    Returns 'ambiguous' on parse/API errors so the caller can ask explicitly."""
    chat_history = format_history(history)
    try:
        response = get_openai().chat.completions.create(
            model="gpt-4o",
            temperature=0,
            response_format={"type": "json_schema", "json_schema": _POST_QUOTE_SCHEMA},
            messages=[
                {"role": "system", "content": _POST_QUOTE_PROMPT},
                {"role": "user", "content": chat_history},
            ],
        )
        text = response.choices[0].message.content or "{}"
        raw = json.loads(text)
        intent = raw.get("intent")
        if isinstance(intent, str) and intent in PostQuoteIntent.__args__:  # type: ignore[attr-defined]
            return intent  # type: ignore[return-value]
        return "ambiguous"
    except Exception as e:
        print(f"[post-quote] classifier failed, returning ambiguous: {e}")
        return "ambiguous"
