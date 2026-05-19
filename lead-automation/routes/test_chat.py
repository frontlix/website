"""Browser-based /test dev-loop for the analyzer + reply pipeline.

Self-contained: serves the HTML/CSS/JS inline, keeps sessions in process memory,
NEVER writes to leads / conversations. Only OPENAI_API_KEY is required.

Endpoints
---------
GET  /test                       → HTML page
POST /test/session/load_preset   → seed a session with a preset history, fire pipeline once
POST /test/message               → append user message, run analyze + reply
POST /test/regenerate            → drop last bot reply, re-run pipeline
GET  /test/session/<sid>         → full session state (used after preset/replay)
POST /test/feedback              → append entry to test-feedback.jsonl
GET  /test/feedback/list         → recent feedback entries (counter modal)
GET  /test/scenario/export       → return session as downloadable JSON
POST /test/scenario/replay       → load session from JSON
"""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse

from branches import get_branche
from llm.analyze import analyze_message, _SYSTEM_PROMPT as ANALYZER_PROMPT_TEMPLATE, _build_field_guide, _build_known_values, _BRANCHE_EXTRAS
from llm.reply import _determine_next_tag, generate_reply, REPLY_PROMPTS
from models.lead import ConversationMessage


router = APIRouter()

# ── In-memory session store ──────────────────────────────────────────────
# Keyed by client-generated session_id (UUID per browser tab). No TTL — this
# is a dev tool. State is lost on server restart, which is fine.
SESSIONS: dict[str, dict[str, Any]] = {}

WELCOME_MESSAGES = {
    "zonnepanelen": "Top, zonnepanelen dus. Ik ben Sanne, ik help je bij het samenstellen van een passende offerte. Ik stel je zo een paar korte vragen.",
    "dakdekker": "Top, dakwerk dus. Ik ben Bram, dakdekker met 20 jaar ervaring. Ik stel je zo wat korte vragen, dan kan ik een offerte voor je opstellen.",
    "schoonmaak": "Hoi! Schoonmaak dus, daar help ik je graag bij. Ik ben Lotte. Ik stel je zo een paar korte vragen, dan stuur ik je een passend voorstel.",
}

NAAM_QUESTION = "Met wie heb ik het genoegen?"

# Mirrors routes/webhook.py:_WORKAROUND_FIELDS — fields with a practical tip get
# one extra re-ask before being marked _skipped.
_WORKAROUND_FIELDS: dict[str, set[str]] = {
    "zonnepanelen": {"jaarverbruik", "dakoppervlakte", "aansluiting"},
    "dakdekker": {"dakoppervlakte", "huidig_dakmateriaal"},
    "schoonmaak": {"oppervlakte"},
}

FEEDBACK_PATH = Path(__file__).resolve().parent.parent / "test-feedback.jsonl"


# ── Preset data ──────────────────────────────────────────────────────────
# Each preset seeds the session with a realistic history that lands the
# conversation right before the critical bot turn we want to inspect.
# `state` is the identity / data / collected_data AT THE END of that history,
# so the next analyze pass starts from a faithful state.

def _h_user(content: str) -> dict:
    return {"role": "user", "content": content}


def _h_assistant(content: str) -> dict:
    return {"role": "assistant", "content": content}


PRESETS: dict[str, dict[str, dict[str, Any]]] = {
    "zonnepanelen": {
        "twee_keer_weet_niet": {
            "label": "2× weet niet op jaarverbruik",
            "history": [
                _h_user("zonnepanelen"),
                _h_assistant(WELCOME_MESSAGES["zonnepanelen"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Mark"),
                _h_assistant("Hoi Mark! Weet je ongeveer hoeveel stroom je per jaar verbruikt? Staat op je jaarnota in kWh."),
                _h_user("geen idee"),
                _h_assistant("Geen stress. Check anders even de app van je energieleverancier, of schat op basis van je huishouden: 2 personen is gemiddeld 2800 kWh, een gezin zo'n 3500. Heb je een idee?"),
                _h_user("nee echt geen idee"),
            ],
            "identity": {"naam": "Mark", "email": None},
            "data": {},
            "collected_data": {"_unsure": {"jaarverbruik": 1}},
        },
        "prijs_mid_flow": {
            "label": "Prijsvraag mid-flow",
            "history": [
                _h_user("zonnepanelen"),
                _h_assistant(WELCOME_MESSAGES["zonnepanelen"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Lisa"),
                _h_assistant("Hoi Lisa! Weet je ongeveer hoeveel stroom je per jaar verbruikt? Staat op je jaarnota in kWh."),
                _h_user("ongeveer 4000 kWh"),
                _h_assistant("4000 kWh, normaal gezin dus. Is het een schuin of een plat dak?"),
                _h_user("wat kost dit eigenlijk?"),
            ],
            "identity": {"naam": "Lisa", "email": None},
            "data": {"jaarverbruik": "4000"},
            "collected_data": {},
        },
        "email_typo": {
            "label": "Email met gmial.com typo",
            "history": [
                _h_user("zonnepanelen"),
                _h_assistant(WELCOME_MESSAGES["zonnepanelen"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Jeroen"),
                _h_assistant("Hoi Jeroen! Weet je ongeveer hoeveel stroom je per jaar verbruikt?"),
                _h_user("3500 kWh"),
                _h_assistant("3500 kWh, helder. Is het een schuin of een plat dak?"),
                _h_user("schuin"),
                _h_assistant("Schuin dak, mooi werkbaar. Wat ligt er nu op, dakpannen, riet of leisteen?"),
                _h_user("dakpannen"),
                _h_assistant("Dakpannen, klassieker. Hoeveel m² is het dak ongeveer?"),
                _h_user("ongeveer 60 m²"),
                _h_assistant("60 m², prima formaat. Welke kant staat het dak op, noord, oost, zuid of west?"),
                _h_user("zuid"),
                _h_assistant("Mooi zuiden, daar heb je geluk mee. Komt er nog schaduw op het dak?"),
                _h_user("geen schaduw"),
                _h_assistant("Heb je een 1-fase of 3-fase aansluiting?"),
                _h_user("1-fase"),
                _h_assistant("Heb je foto's van het dak? Dan kunnen we de offerte nauwkeuriger opstellen."),
                _h_user("nee geen foto's"),
                _h_assistant("Wat is je e-mailadres? Stuur ik de offerte daar naartoe."),
                _h_user("jeroen@gmial.com"),
            ],
            "identity": {"naam": "Jeroen", "email": None},
            "data": {
                "jaarverbruik": "3500", "daktype": "schuin", "dakmateriaal": "pannen",
                "dakoppervlakte": "60", "orientatie": "zuid", "schaduw": "geen", "aansluiting": "1-fase",
            },
            "collected_data": {"_photo_step_done": True},
        },
        "alles_in_een": {
            "label": "Alle info in 1 bericht",
            "history": [
                _h_user("zonnepanelen"),
                _h_assistant(WELCOME_MESSAGES["zonnepanelen"]),
                _h_user("Hoi ik ben Mark, schuin dak met dakpannen, ongeveer 4000 kWh per jaar, dak ligt op het zuiden, geen schaduw, 1-fase aansluiting, dakvlak is zo'n 50 m²"),
            ],
            "identity": {"naam": None, "email": None},
            "data": {},
            "collected_data": {},
        },
        "off_topic_smalltalk": {
            "label": "Small talk over weer mid-flow",
            "history": [
                _h_user("zonnepanelen"),
                _h_assistant(WELCOME_MESSAGES["zonnepanelen"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Mark"),
                _h_assistant("Hoi Mark! Weet je ongeveer hoeveel stroom je per jaar verbruikt? Staat op je jaarnota in kWh."),
                _h_user("lekker weer he vandaag"),
            ],
            "identity": {"naam": "Mark", "email": None},
            "data": {},
            "collected_data": {},
        },
    },
    "dakdekker": {
        "twee_keer_weet_niet": {
            "label": "2× weet niet op dakoppervlakte",
            "history": [
                _h_user("dakdekker"),
                _h_assistant(WELCOME_MESSAGES["dakdekker"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Peter"),
                _h_assistant("Oké Peter. Nieuw dak, reparatie, of isolatie?"),
                _h_user("reparatie"),
                _h_assistant("Reparatie, helder. Plat of schuin dak?"),
                _h_user("plat"),
                _h_assistant("Plat dak. Wat ligt er nu op? Bitumen, EPDM, of iets anders?"),
                _h_user("bitumen"),
                _h_assistant("Bitumen, klassieker. Hoeveel m² is het ongeveer? Schatting is prima."),
                _h_user("geen idee hoeveel m²"),
                _h_assistant("Snap ik, lastig inschatten. Kun je over het dak lopen en stappen tellen? 1 stap is ongeveer 0,7m, dus 10 bij 20 stappen is ongeveer 98 m². Anders: stuur een foto, dan schat ik mee."),
                _h_user("nee echt geen idee"),
            ],
            "identity": {"naam": "Peter", "email": None},
            "data": {"type_werk": "repareren", "daktype": "plat", "huidig_dakmateriaal": "bitumen"},
            "collected_data": {"_unsure": {"dakoppervlakte": 1}},
        },
        "prijs_mid_flow": {
            "label": "Prijsvraag mid-flow",
            "history": [
                _h_user("dakdekker"),
                _h_assistant(WELCOME_MESSAGES["dakdekker"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Sara"),
                _h_assistant("Oké Sara. Nieuw dak, reparatie, of isolatie?"),
                _h_user("vervangen"),
                _h_assistant("Compleet nieuw dak, mooi project. Plat of schuin?"),
                _h_user("wat kost een nieuw dak ongeveer?"),
            ],
            "identity": {"naam": "Sara", "email": None},
            "data": {"type_werk": "vervangen"},
            "collected_data": {},
        },
        "email_typo": {
            "label": "Email met gail.com typo",
            "history": [
                _h_user("dakdekker"),
                _h_assistant(WELCOME_MESSAGES["dakdekker"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Tom"),
                _h_assistant("Oké Tom. Nieuw dak, reparatie, of isolatie?"),
                _h_user("repareren"),
                _h_assistant("Reparatie, helder. Plat of schuin dak?"),
                _h_user("schuin"),
                _h_assistant("Schuin dak. Wat ligt er nu op? Dakpannen, riet, of leisteen?"),
                _h_user("dakpannen"),
                _h_assistant("Dakpannen, prima. Hoeveel m² is het ongeveer?"),
                _h_user("80 m²"),
                _h_assistant("80 m², helder. Wil je isolatie er meteen bij, of niet?"),
                _h_user("nee"),
                _h_assistant("Heb je foto's van het dak? Dan kunnen we de offerte nauwkeuriger opstellen."),
                _h_user("nee"),
                _h_assistant("Wat is je mailadres? Stuur ik de offerte daar heen."),
                _h_user("tom@gail.com"),
            ],
            "identity": {"naam": "Tom", "email": None},
            "data": {
                "type_werk": "repareren", "daktype": "schuin",
                "huidig_dakmateriaal": "dakpannen", "dakoppervlakte": "80", "isolatie": "nee",
            },
            "collected_data": {"_photo_step_done": True},
        },
        "alles_in_een": {
            "label": "Alle info in 1 bericht",
            "history": [
                _h_user("dakdekker"),
                _h_assistant(WELCOME_MESSAGES["dakdekker"]),
                _h_user("Hey ik ben Peter, mijn platte dak lekt, bitumen, ongeveer 90 m², geen isolatie nodig"),
            ],
            "identity": {"naam": None, "email": None},
            "data": {},
            "collected_data": {},
        },
        "off_topic_smalltalk": {
            "label": "Small talk over weer mid-flow",
            "history": [
                _h_user("dakdekker"),
                _h_assistant(WELCOME_MESSAGES["dakdekker"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Peter"),
                _h_assistant("Oké Peter. Nieuw dak, reparatie, of isolatie?"),
                _h_user("pff veel regen vandaag he"),
            ],
            "identity": {"naam": "Peter", "email": None},
            "data": {},
            "collected_data": {},
        },
    },
    "schoonmaak": {
        "twee_keer_weet_niet": {
            "label": "2× weet niet op oppervlakte",
            "history": [
                _h_user("schoonmaak"),
                _h_assistant(WELCOME_MESSAGES["schoonmaak"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Sara"),
                _h_assistant("Hoi Sara! Gaat het om een woning, kantoor, horeca of een winkel?"),
                _h_user("kantoor"),
                _h_assistant("Kantoor, lekker overzichtelijk meestal. Hoeveel m² is het ongeveer?"),
                _h_user("geen idee"),
                _h_assistant("Snap ik, lastig inschatten. Tel je stappen in de grootste ruimte, 1 stap is ongeveer 0,7m. Of pak de plattegrond erbij. Anders stuur een foto, dan schat ik met je mee."),
                _h_user("nee echt geen idee"),
            ],
            "identity": {"naam": "Sara", "email": None},
            "data": {"type_pand": "kantoor"},
            "collected_data": {"_unsure": {"oppervlakte": 1}},
        },
        "prijs_mid_flow": {
            "label": "Prijsvraag mid-flow",
            "history": [
                _h_user("schoonmaak"),
                _h_assistant(WELCOME_MESSAGES["schoonmaak"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Lisa"),
                _h_assistant("Hoi Lisa! Gaat het om een woning, kantoor, horeca of een winkel?"),
                _h_user("horeca"),
                _h_assistant("Horeca, altijd wat met glas en vet. Hoeveel m² is de ruimte ongeveer?"),
                _h_user("ongeveer 150 m², wat kost dat?"),
            ],
            "identity": {"naam": "Lisa", "email": None},
            "data": {"type_pand": "horeca", "oppervlakte": "150"},
            "collected_data": {},
        },
        "email_typo": {
            "label": "Email met gmial.com typo",
            "history": [
                _h_user("schoonmaak"),
                _h_assistant(WELCOME_MESSAGES["schoonmaak"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Ruben"),
                _h_assistant("Hoi Ruben! Gaat het om een woning, kantoor, horeca of een winkel?"),
                _h_user("kantoor"),
                _h_assistant("Kantoor, prima. Hoeveel m² is het ongeveer?"),
                _h_user("120"),
                _h_assistant("120 m², helder. Hoe vaak zou je ons willen laten komen?"),
                _h_user("wekelijks"),
                _h_assistant("Wekelijks, dan blijft het echt fris. Wil je dat we de ramen ook meenemen?"),
                _h_user("nee"),
                _h_assistant("Heb je foto's van de ruimte? Dan kunnen we het voorstel nauwkeuriger opstellen."),
                _h_user("nee"),
                _h_assistant("Wat is je e-mailadres? Stuur ik het voorstel daar naartoe."),
                _h_user("ruben@gmial.com"),
            ],
            "identity": {"naam": "Ruben", "email": None},
            "data": {
                "type_pand": "kantoor", "oppervlakte": "120",
                "frequentie": "wekelijks", "ramen": "nee",
            },
            "collected_data": {"_photo_step_done": True},
        },
        "alles_in_een": {
            "label": "Alle info in 1 bericht",
            "history": [
                _h_user("schoonmaak"),
                _h_assistant(WELCOME_MESSAGES["schoonmaak"]),
                _h_user("Hoi ik ben Sara, kantoor van zo'n 180 m², zou wekelijks willen, geen ramen erbij"),
            ],
            "identity": {"naam": None, "email": None},
            "data": {},
            "collected_data": {},
        },
        "off_topic_smalltalk": {
            "label": "Small talk over weer mid-flow",
            "history": [
                _h_user("schoonmaak"),
                _h_assistant(WELCOME_MESSAGES["schoonmaak"]),
                _h_assistant(NAAM_QUESTION),
                _h_user("Sara"),
                _h_assistant("Hoi Sara! Gaat het om een woning, kantoor, horeca of een winkel?"),
                _h_user("lekker zonnetje he vandaag"),
            ],
            "identity": {"naam": "Sara", "email": None},
            "data": {},
            "collected_data": {},
        },
    },
}


# ── Helpers ──────────────────────────────────────────────────────────────

def _canonical_field(tag: str) -> Optional[str]:
    if not tag or tag in {"PHOTO_STEP", "COMPLETE", "email"}:
        return None
    if tag == "naam":
        return "naam"
    if tag.startswith("dakmateriaal_") or tag.startswith("huidig_dakmateriaal_"):
        return tag.rsplit("_", 1)[0]
    return tag


def _empty_session(branche: str) -> dict[str, Any]:
    return {
        "branche": branche,
        "history": [],
        "identity": {"naam": None, "email": None},
        "data": {},
        "collected_data": {},
        "message_meta": [],  # parallel to history, only assistant entries have meta
    }


def _get_session(session_id: str) -> dict[str, Any]:
    s = SESSIONS.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="session not found")
    return s


def _build_analyzer_prompt(branche_id: str, identity: dict, data: dict, current_question: str) -> str:
    """Reconstruct the analyzer prompt for inspection (mirrors llm/analyze.py)."""
    config = get_branche(branche_id)
    if not config:
        return ""
    return ANALYZER_PROMPT_TEMPLATE.format(
        agent_name=config.agent_name,
        branche_label=config.label,
        branche_id=branche_id,
        field_guide=_build_field_guide(branche_id),
        branche_extras=_BRANCHE_EXTRAS.get(branche_id, ""),
        current_question=current_question,
        known_values=_build_known_values(branche_id, identity, data),
    )


def _serialize_session(s: dict[str, Any]) -> dict[str, Any]:
    """Public shape returned to the browser."""
    return {
        "branche": s["branche"],
        "history": s["history"],
        "message_meta": s["message_meta"],
        "identity": s["identity"],
        "data": s["data"],
        "collected_data": s["collected_data"],
    }


async def _run_pipeline_turn(session: dict[str, Any]) -> None:
    """Run one analyzer + reply turn — mutates session in-place.

    Mirrors routes/webhook.py:_handle_collecting intent-dispatcher behaviour
    but does NOT touch Supabase. The latest history entry must be the
    customer's just-arrived message.
    """
    branche_id = session["branche"]
    if not get_branche(branche_id):
        raise HTTPException(status_code=400, detail=f"unknown branche {branche_id}")

    history = [ConversationMessage(role=m["role"], content=m["content"]) for m in session["history"]]
    identity = dict(session["identity"])
    data = dict(session["data"])
    collected = dict(session["collected_data"])

    # current_question: what was the bot waiting on?
    current_tag = _determine_next_tag(branche_id, identity, data, collected)
    current_field = _canonical_field(current_tag) or current_tag

    t0 = time.time()
    analysis = await analyze_message(branche_id, history, identity, data, current_tag)
    analyzer_latency = round((time.time() - t0) * 1000)

    workaround_set = _WORKAROUND_FIELDS.get(branche_id, set())
    has_workaround = bool(current_field and current_field in workaround_set)
    apply_extracted = True

    config = get_branche(branche_id)
    valid_field_keys = {f.key for f in config.fields} if config else set()

    if analysis.intent == "doesnt_know" and current_field in valid_field_keys:
        unsure_map = collected.setdefault("_unsure", {})
        unsure_map[current_field] = int(unsure_map.get(current_field, 0)) + 1
        if unsure_map[current_field] >= 2 or not has_workaround:
            skipped = collected.setdefault("_skipped", [])
            if current_field not in skipped:
                skipped.append(current_field)
        if isinstance(analysis.extracted.get("data"), dict):
            analysis.extracted["data"].pop(current_field, None)
    elif analysis.intent in {"price_question", "process_question", "off_topic",
                              "gibberish", "is_bot_question", "acknowledgement",
                              "not_recognized"}:
        apply_extracted = False
    elif analysis.intent == "will_provide_later" and current_field in valid_field_keys:
        unsure_map = collected.setdefault("_unsure", {})
        unsure_map[current_field] = int(unsure_map.get(current_field, 0)) + 1

    if apply_extracted:
        if isinstance(analysis.extracted.get("naam"), str):
            identity["naam"] = analysis.extracted["naam"]
        if isinstance(analysis.extracted.get("email"), str):
            identity["email"] = analysis.extracted["email"]
        if isinstance(analysis.extracted.get("data"), dict):
            for k, v in analysis.extracted["data"].items():
                if v is not None:
                    data[k] = v

    unsure_count = 0
    unsure_map = collected.get("_unsure") if isinstance(collected.get("_unsure"), dict) else {}
    if current_field in unsure_map:
        unsure_count = int(unsure_map[current_field])

    t0 = time.time()
    reply_text = await generate_reply(
        branche_id, history, identity, data, collected,
        analysis=analysis, unsure_count=unsure_count, has_workaround=has_workaround,
    )
    reply_latency = round((time.time() - t0) * 1000)

    # Build the analyzer prompt for the inspect modal (after state changes,
    # known_values reflects pre-apply state — so build it BEFORE we mutate
    # session.data. Already done implicitly: identity/data passed in were
    # pre-apply copies.)
    analyzer_prompt = _build_analyzer_prompt(
        branche_id, session["identity"], session["data"], current_tag,
    )
    # The reply prompt is constructed inside generate_reply; reconstruct here
    # for inspection. Keep this in sync with llm/reply.py:generate_reply.
    from llm.reply import _build_known_info
    photo_count = 0  # /test doesn't handle photos
    next_tag_after = _determine_next_tag(branche_id, identity, data, collected)
    intent_guidance_line = ""
    from llm.reply import _intent_guidance
    intent_guidance_line = _intent_guidance(analysis.intent, unsure_count, has_workaround)
    intent_section = (
        f"\n## INTENT CONTEXT (deterministic — follow this branch)\n"
        f"- intent: {analysis.intent}\n"
        f"- answered_current_question: {analysis.answered_current_question}\n"
        f"- unsure_count on current field: {unsure_count}\n"
        f"- guidance: {intent_guidance_line}\n"
    )
    reply_prompt = (
        f"{REPLY_PROMPTS[branche_id]}\n\n"
        f"## NOW\n"
        f"Known info:{_build_known_info(branche_id, identity, data, photo_count)}\n\n"
        f"NEXT: {next_tag_after}\n"
        f"{intent_section}\n"
        f"Write 1 WhatsApp message as {config.agent_name} in Dutch. First check if the customer is waiting, unsure or frustrated. Only the message text — no JSON, no explanation."
    )

    # Commit state
    session["identity"] = identity
    session["data"] = data
    session["collected_data"] = collected

    session["history"].append({"role": "assistant", "content": reply_text})
    session["message_meta"].append(
        {
            "for_history_idx": len(session["history"]) - 1,
            "intent": analysis.intent,
            "answered_current_question": analysis.answered_current_question,
            "extracted": analysis.extracted,
            "current_question": current_tag,
            "next_tag": next_tag_after,
            "unsure_count": unsure_count,
            "has_workaround": has_workaround,
            "analyzer_prompt": analyzer_prompt,
            "reply_prompt": reply_prompt,
            "analyzer_latency_ms": analyzer_latency,
            "reply_latency_ms": reply_latency,
        }
    )


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("/test", response_class=HTMLResponse)
async def get_test_page() -> HTMLResponse:
    return HTMLResponse(content=_HTML_PAGE)


@router.post("/test/session/load_preset")
async def load_preset(req: Request) -> JSONResponse:
    body = await req.json()
    session_id = body.get("session_id") or str(uuid.uuid4())
    branche = body.get("branche")
    preset_key = body.get("preset_key")

    branche_presets = PRESETS.get(branche or "")
    if not branche_presets or preset_key not in branche_presets:
        raise HTTPException(status_code=400, detail=f"unknown preset {branche}/{preset_key}")

    preset = branche_presets[preset_key]
    session = _empty_session(branche)
    session["history"] = [dict(m) for m in preset["history"]]
    session["identity"] = dict(preset["identity"])
    session["data"] = dict(preset["data"])
    session["collected_data"] = json.loads(json.dumps(preset["collected_data"]))  # deep copy
    session["message_meta"] = []

    SESSIONS[session_id] = session

    # If the seeded history ends with a customer message, fire one pipeline turn
    # so the user lands on the critical bot response directly.
    if session["history"] and session["history"][-1]["role"] == "user":
        await _run_pipeline_turn(session)

    return JSONResponse({"session_id": session_id, "session": _serialize_session(session)})


@router.post("/test/message")
async def post_message(req: Request) -> JSONResponse:
    body = await req.json()
    session_id = body.get("session_id") or str(uuid.uuid4())
    text = (body.get("text") or "").strip()
    branche = body.get("branche")

    if not text:
        raise HTTPException(status_code=400, detail="empty message")

    session = SESSIONS.get(session_id)
    if not session:
        if not branche or not get_branche(branche):
            raise HTTPException(status_code=400, detail="branche required for new session")
        session = _empty_session(branche)
        # Seed welcome + ask-naam on first turn so the bot has context
        session["history"].append({"role": "user", "content": branche})
        session["history"].append({"role": "assistant", "content": WELCOME_MESSAGES[branche]})
        SESSIONS[session_id] = session

    session["history"].append({"role": "user", "content": text})
    await _run_pipeline_turn(session)
    return JSONResponse({"session_id": session_id, "session": _serialize_session(session)})


@router.post("/test/regenerate")
async def regenerate(req: Request) -> JSONResponse:
    body = await req.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    session = _get_session(session_id)

    # Drop the last assistant message + its meta. Then re-run the pipeline on
    # the same customer-trailing history.
    while session["history"] and session["history"][-1]["role"] == "assistant":
        session["history"].pop()
        if session["message_meta"]:
            session["message_meta"].pop()

    if not session["history"] or session["history"][-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="no customer message to respond to")

    await _run_pipeline_turn(session)
    return JSONResponse({"session_id": session_id, "session": _serialize_session(session)})


@router.get("/test/session/{session_id}")
async def get_session(session_id: str) -> JSONResponse:
    session = _get_session(session_id)
    return JSONResponse({"session_id": session_id, "session": _serialize_session(session)})


@router.post("/test/feedback")
async def post_feedback(req: Request) -> JSONResponse:
    body = await req.json()
    entry = {
        "ts": int(time.time()),
        "session_id": body.get("session_id"),
        "branche": body.get("branche"),
        "message_idx": body.get("message_idx"),
        "message_text": body.get("message_text"),
        "intent": body.get("intent"),
        "rating": body.get("rating"),  # 'good' | 'bad'
        "notes": (body.get("notes") or "").strip(),
    }
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    with FEEDBACK_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return JSONResponse({"ok": True})


@router.get("/test/feedback/list")
async def list_feedback() -> JSONResponse:
    if not FEEDBACK_PATH.exists():
        return JSONResponse({"entries": []})
    entries = []
    with FEEDBACK_PATH.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return JSONResponse({"entries": entries[-200:]})  # last 200


@router.get("/test/scenario/export")
async def export_scenario(session_id: str) -> JSONResponse:
    session = _get_session(session_id)
    return JSONResponse(_serialize_session(session))


@router.post("/test/scenario/replay")
async def replay_scenario(req: Request) -> JSONResponse:
    body = await req.json()
    blob = body.get("session")
    if not isinstance(blob, dict):
        raise HTTPException(status_code=400, detail="session payload required")
    branche = blob.get("branche")
    if not get_branche(branche or ""):
        raise HTTPException(status_code=400, detail="invalid branche in payload")

    session_id = body.get("session_id") or str(uuid.uuid4())
    session = _empty_session(branche)
    session["history"] = list(blob.get("history") or [])
    session["identity"] = dict(blob.get("identity") or {"naam": None, "email": None})
    session["data"] = dict(blob.get("data") or {})
    session["collected_data"] = dict(blob.get("collected_data") or {})
    session["message_meta"] = []  # rebuild by re-running pipeline through history

    SESSIONS[session_id] = session

    # Replay re-runs the pipeline from the LAST user message so the new prompts
    # are used. Earlier assistant messages stay verbatim.
    if session["history"] and session["history"][-1]["role"] == "user":
        await _run_pipeline_turn(session)

    return JSONResponse({"session_id": session_id, "session": _serialize_session(session)})


# ── Inline HTML/CSS/JS ───────────────────────────────────────────────────

_HTML_PAGE = r"""<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Frontlix /test — analyzer + reply dev-loop</title>
<style>
:root {
  --bg: #fafafa;
  --surface: #ffffff;
  --border: rgba(0,0,0,0.10);
  --text: #1a1a1a;
  --muted: #666;
  --primary: #1A56FF;
  --accent: #00CFFF;
  --user-bubble: #1A56FF;
  --bot-bubble: #f0f0f0;
  --warn: #c54a00;
  --ok: #0a7f3f;
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
}
header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
header h1 { font-size: 14px; font-weight: 600; margin: 0 8px 0 0; }
header .grow { flex: 1; }
header select, header button, header input[type=file] {
  font: inherit;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
header button:hover, header select:hover { background: #f0f0f0; }
header .primary {
  background: var(--primary);
  color: #fff;
  border-color: transparent;
}
header .primary:hover { filter: brightness(0.95); background: var(--primary); }
.thread {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
}
.msg {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  position: relative;
}
.msg.user { justify-content: flex-end; }
.bubble {
  max-width: 75%;
  padding: 8px 12px;
  border-radius: 14px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.msg.user .bubble {
  background: var(--user-bubble);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.msg.assistant .bubble {
  background: var(--bot-bubble);
  border-bottom-left-radius: 4px;
}
.msg.assistant .actions {
  display: flex;
  gap: 4px;
  margin-left: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.msg.assistant:hover .actions { opacity: 1; }
.actions button {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 12px;
}
.actions button:hover { background: var(--surface); }
.meta-badge {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
footer {
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 12px 16px;
}
.input-row {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  gap: 8px;
}
.input-row textarea {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  font: inherit;
  resize: none;
  min-height: 38px;
  max-height: 120px;
}
.input-row button {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0 18px;
  font: inherit;
  cursor: pointer;
}
.input-row button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modal */
.modal-bg {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: none;
  align-items: center; justify-content: center;
  z-index: 50;
}
.modal-bg.open { display: flex; }
.modal {
  background: var(--surface);
  border-radius: 8px;
  max-width: 800px;
  width: 92%;
  max-height: 88vh;
  overflow: auto;
  padding: 18px 20px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.18);
}
.modal h2 { margin: 0 0 12px; font-size: 16px; }
.modal pre {
  background: #f5f5f7;
  border-radius: 6px;
  padding: 10px;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 6px 0 14px;
  max-height: 320px;
  overflow-y: auto;
}
.modal .row { display: flex; gap: 8px; align-items: center; margin: 6px 0; }
.modal .row label { font-weight: 600; min-width: 110px; }
.modal .close {
  float: right;
  background: transparent; border: none;
  font-size: 18px; cursor: pointer;
  color: var(--muted);
}
.modal textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px;
  font: inherit;
  min-height: 90px;
  resize: vertical;
}
.modal .rate-btns { display: flex; gap: 8px; margin: 10px 0; }
.modal .rate-btns button {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  cursor: pointer;
}
.modal .rate-btns button.selected.good { background: #e6f7ed; border-color: var(--ok); }
.modal .rate-btns button.selected.bad { background: #fdecea; border-color: var(--warn); }

.empty {
  text-align: center;
  color: var(--muted);
  margin-top: 40px;
  font-size: 13px;
}

#feedback-list .item {
  border-bottom: 1px solid var(--border);
  padding: 8px 0;
}
#feedback-list .item .head {
  display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--muted);
}
#feedback-list .item .text { margin-top: 4px; }
.tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  background: #eee;
  color: var(--text);
}
.tag.good { background: #e6f7ed; color: var(--ok); }
.tag.bad { background: #fdecea; color: var(--warn); }
</style>
</head>
<body>

<header>
  <h1>Frontlix /test</h1>
  <select id="branche">
    <option value="zonnepanelen">zonnepanelen</option>
    <option value="dakdekker">dakdekker</option>
    <option value="schoonmaak">schoonmaak</option>
  </select>
  <select id="preset">
    <option value="">— preset —</option>
    <option value="twee_keer_weet_niet">twee_keer_weet_niet</option>
    <option value="prijs_mid_flow">prijs_mid_flow</option>
    <option value="email_typo">email_typo</option>
    <option value="alles_in_een">alles_in_een</option>
    <option value="off_topic_smalltalk">off_topic_smalltalk</option>
  </select>
  <button id="btn-start-preset" class="primary">Start preset</button>
  <button id="btn-new">New chat</button>
  <span class="grow"></span>
  <button id="btn-feedback-list">Feedback (<span id="fb-count">0</span>)</button>
  <button id="btn-export">Export</button>
  <input type="file" id="replay-file" accept="application/json" style="display:none">
  <button id="btn-replay">Replay…</button>
</header>

<div class="thread" id="thread">
  <div class="empty">Begin met een preset, of typ een bericht onderaan. Géén DB-writes — pure dev-loop.</div>
</div>

<footer>
  <div class="input-row">
    <textarea id="input" placeholder="Typ als klant…" rows="1"></textarea>
    <button id="btn-send">Verstuur</button>
  </div>
</footer>

<!-- Inspect modal -->
<div class="modal-bg" id="modal-inspect">
  <div class="modal">
    <button class="close" data-close>×</button>
    <h2>Inspect — bot-bericht</h2>
    <div class="row"><label>Intent:</label> <span id="ins-intent" class="tag"></span></div>
    <div class="row"><label>Answered:</label> <span id="ins-answered"></span></div>
    <div class="row"><label>Current Q:</label> <span id="ins-current"></span></div>
    <div class="row"><label>Next tag:</label> <span id="ins-next"></span></div>
    <div class="row"><label>Unsure count:</label> <span id="ins-unsure"></span></div>
    <div class="row"><label>Latency:</label> <span id="ins-latency"></span></div>
    <div><label>Extracted:</label></div>
    <pre id="ins-extracted"></pre>
    <div><label>Analyzer prompt:</label></div>
    <pre id="ins-analyzer"></pre>
    <div><label>Reply prompt:</label></div>
    <pre id="ins-reply"></pre>
  </div>
</div>

<!-- Feedback modal -->
<div class="modal-bg" id="modal-feedback">
  <div class="modal">
    <button class="close" data-close>×</button>
    <h2>Feedback op bot-bericht</h2>
    <pre id="fb-message"></pre>
    <div class="rate-btns">
      <button id="fb-good" data-rate="good">👍 goed</button>
      <button id="fb-bad" data-rate="bad">👎 niet goed</button>
    </div>
    <textarea id="fb-notes" placeholder="Korte toelichting (optioneel)…"></textarea>
    <div class="row" style="margin-top: 10px;">
      <button id="fb-submit" class="close" style="float:none; background: var(--primary); color:#fff; border:none; padding:6px 14px; border-radius:6px;">Verzend feedback</button>
    </div>
  </div>
</div>

<!-- Feedback-list modal -->
<div class="modal-bg" id="modal-feedback-list">
  <div class="modal">
    <button class="close" data-close>×</button>
    <h2>Feedback overzicht</h2>
    <div class="row">
      <button id="fb-copy-claude" style="background: var(--primary); color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">Kopieer als Claude-instructie</button>
    </div>
    <div id="feedback-list"></div>
  </div>
</div>

<script>
const $ = (s) => document.querySelector(s);
const sessionKey = 'frontlix_test_sid';
function getSessionId() {
  let sid = localStorage.getItem(sessionKey);
  if (!sid) { sid = crypto.randomUUID(); localStorage.setItem(sessionKey, sid); }
  return sid;
}
function newSessionId() {
  const sid = crypto.randomUUID();
  localStorage.setItem(sessionKey, sid);
  return sid;
}

let state = { session: null, sessionId: getSessionId() };
let pendingFeedback = null;

async function api(path, body, method = 'POST') {
  const init = { method, headers: {} };
  if (body !== undefined) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(body); }
  const r = await fetch(path, init);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return await r.json();
}

function renderThread() {
  const thread = $('#thread');
  thread.innerHTML = '';
  const s = state.session;
  if (!s || !s.history.length) {
    thread.innerHTML = '<div class="empty">Begin met een preset, of typ een bericht onderaan. Géén DB-writes — pure dev-loop.</div>';
    return;
  }
  s.history.forEach((m, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + m.role;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = m.content;
    if (m.role === 'user') {
      wrap.appendChild(bubble);
    } else {
      wrap.appendChild(bubble);
      const meta = (s.message_meta || []).find(x => x.for_history_idx === idx);
      if (meta) {
        const actions = document.createElement('div');
        actions.className = 'actions';
        actions.innerHTML = `
          <button data-act="inspect" data-idx="${idx}" title="Inspect">🔍</button>
          <button data-act="feedback" data-idx="${idx}" title="Feedback">💬</button>`;
        // Regenerate only on the LAST assistant message
        if (idx === s.history.length - 1) {
          actions.insertAdjacentHTML('afterbegin', `<button data-act="regen" data-idx="${idx}" title="Regenerate">🔁</button>`);
        }
        wrap.appendChild(actions);
        const badge = document.createElement('div');
        badge.className = 'meta-badge';
        const latency = (meta.analyzer_latency_ms || 0) + (meta.reply_latency_ms || 0);
        badge.textContent = `intent=${meta.intent} · ${latency}ms`;
        bubble.parentElement.appendChild(badge);
      }
    }
    thread.appendChild(wrap);
  });
  thread.scrollTop = thread.scrollHeight;
}

function applyResponse(data) {
  state.sessionId = data.session_id;
  localStorage.setItem(sessionKey, data.session_id);
  state.session = data.session;
  renderThread();
}

async function sendMessage() {
  const text = $('#input').value.trim();
  if (!text) return;
  $('#input').value = '';
  $('#input').style.height = '38px';
  const branche = $('#branche').value;
  const btn = $('#btn-send');
  btn.disabled = true;
  try {
    const data = await api('/test/message', { session_id: state.sessionId, text, branche });
    applyResponse(data);
  } catch (e) {
    alert('Fout: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function startPreset() {
  const branche = $('#branche').value;
  const preset_key = $('#preset').value;
  if (!preset_key) { alert('Kies eerst een preset'); return; }
  const sid = newSessionId();
  state.sessionId = sid;
  try {
    const data = await api('/test/session/load_preset', { session_id: sid, branche, preset_key });
    applyResponse(data);
  } catch (e) { alert('Fout: ' + e.message); }
}

async function regenerate(idx) {
  try {
    const data = await api('/test/regenerate', { session_id: state.sessionId });
    applyResponse(data);
  } catch (e) { alert('Fout: ' + e.message); }
}

function openInspect(idx) {
  const meta = (state.session.message_meta || []).find(x => x.for_history_idx === parseInt(idx));
  if (!meta) return;
  $('#ins-intent').textContent = meta.intent;
  $('#ins-intent').className = 'tag';
  $('#ins-answered').textContent = String(meta.answered_current_question);
  $('#ins-current').textContent = meta.current_question;
  $('#ins-next').textContent = meta.next_tag;
  $('#ins-unsure').textContent = meta.unsure_count + (meta.has_workaround ? ' (workaround)' : ' (no workaround)');
  $('#ins-latency').textContent = `analyzer ${meta.analyzer_latency_ms}ms · reply ${meta.reply_latency_ms}ms`;
  $('#ins-extracted').textContent = JSON.stringify(meta.extracted, null, 2);
  $('#ins-analyzer').textContent = meta.analyzer_prompt;
  $('#ins-reply').textContent = meta.reply_prompt;
  $('#modal-inspect').classList.add('open');
}

function openFeedback(idx) {
  const i = parseInt(idx);
  const m = state.session.history[i];
  const meta = (state.session.message_meta || []).find(x => x.for_history_idx === i);
  pendingFeedback = { idx: i, text: m.content, intent: meta ? meta.intent : null, rating: null };
  $('#fb-message').textContent = m.content;
  $('#fb-notes').value = '';
  document.querySelectorAll('#modal-feedback .rate-btns button').forEach(b => b.classList.remove('selected', 'good', 'bad'));
  $('#modal-feedback').classList.add('open');
}

async function submitFeedback() {
  if (!pendingFeedback || !pendingFeedback.rating) { alert('Kies eerst goed of niet goed'); return; }
  try {
    await api('/test/feedback', {
      session_id: state.sessionId,
      branche: state.session.branche,
      message_idx: pendingFeedback.idx,
      message_text: pendingFeedback.text,
      intent: pendingFeedback.intent,
      rating: pendingFeedback.rating,
      notes: $('#fb-notes').value.trim(),
    });
    pendingFeedback = null;
    $('#modal-feedback').classList.remove('open');
    await refreshFeedbackCount();
  } catch (e) { alert('Fout: ' + e.message); }
}

async function refreshFeedbackCount() {
  try {
    const r = await api('/test/feedback/list', undefined, 'GET');
    $('#fb-count').textContent = (r.entries || []).length;
    return r.entries || [];
  } catch (e) { return []; }
}

async function openFeedbackList() {
  const entries = await refreshFeedbackCount();
  const container = $('#feedback-list');
  if (!entries.length) {
    container.innerHTML = '<div class="empty">Nog geen feedback verzameld.</div>';
  } else {
    container.innerHTML = entries.slice().reverse().map(e => {
      const ts = new Date((e.ts || 0) * 1000).toISOString().slice(0, 16).replace('T', ' ');
      return `<div class="item">
        <div class="head">
          <span class="tag ${e.rating || ''}">${e.rating || '?'}</span>
          <span>${e.branche || '?'}</span>
          <span>intent=${e.intent || '?'}</span>
          <span>${ts}</span>
        </div>
        <div class="text"><strong>Bot:</strong> ${escapeHtml(e.message_text || '')}</div>
        ${e.notes ? `<div class="text"><strong>Notitie:</strong> ${escapeHtml(e.notes)}</div>` : ''}
      </div>`;
    }).join('');
  }
  $('#modal-feedback-list').classList.add('open');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function copyClaudeInstruction() {
  const entries = await refreshFeedbackCount();
  if (!entries.length) { alert('Geen feedback om te exporteren'); return; }
  const lines = ['Hier zijn ' + entries.length + ' feedback-items uit /test. Gebruik deze om de analyzer- of reply-prompt te verbeteren:\n'];
  for (const e of entries) {
    lines.push(`- [${e.rating || '?'}] (${e.branche}, intent=${e.intent}) "${(e.message_text || '').slice(0, 200)}"`);
    if (e.notes) lines.push(`    notitie: ${e.notes}`);
  }
  await navigator.clipboard.writeText(lines.join('\n'));
  alert('Gekopieerd naar klembord (' + entries.length + ' items)');
}

async function exportSession() {
  if (!state.session) { alert('Geen actieve sessie'); return; }
  const r = await fetch(`/test/scenario/export?session_id=${state.sessionId}`);
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `frontlix-test-${state.sessionId.slice(0,8)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

async function replaySession(file) {
  const text = await file.text();
  let payload;
  try { payload = JSON.parse(text); } catch (e) { alert('Geen geldig JSON'); return; }
  const sid = newSessionId();
  state.sessionId = sid;
  try {
    const data = await api('/test/scenario/replay', { session_id: sid, session: payload });
    applyResponse(data);
  } catch (e) { alert('Fout: ' + e.message); }
}

function newChat() {
  const sid = newSessionId();
  state.sessionId = sid;
  state.session = null;
  renderThread();
}

// Wire up
$('#btn-send').addEventListener('click', sendMessage);
$('#input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
$('#input').addEventListener('input', (e) => {
  e.target.style.height = '38px';
  e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px';
});
$('#btn-start-preset').addEventListener('click', startPreset);
$('#btn-new').addEventListener('click', newChat);
$('#btn-feedback-list').addEventListener('click', openFeedbackList);
$('#btn-export').addEventListener('click', exportSession);
$('#btn-replay').addEventListener('click', () => $('#replay-file').click());
$('#replay-file').addEventListener('change', (e) => { if (e.target.files[0]) replaySession(e.target.files[0]); });
$('#fb-submit').addEventListener('click', submitFeedback);
$('#fb-copy-claude').addEventListener('click', copyClaudeInstruction);

document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => el.closest('.modal-bg').classList.remove('open'));
});
document.querySelectorAll('.modal-bg').forEach(el => {
  el.addEventListener('click', (e) => { if (e.target === el) el.classList.remove('open'); });
});

$('#thread').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const idx = btn.dataset.idx;
  const act = btn.dataset.act;
  if (act === 'regen') regenerate(idx);
  else if (act === 'inspect') openInspect(idx);
  else if (act === 'feedback') openFeedback(idx);
});

$('#modal-feedback').addEventListener('click', (e) => {
  const b = e.target.closest('.rate-btns button');
  if (!b) return;
  document.querySelectorAll('#modal-feedback .rate-btns button').forEach(x => x.classList.remove('selected', 'good', 'bad'));
  b.classList.add('selected', b.dataset.rate);
  if (pendingFeedback) pendingFeedback.rating = b.dataset.rate;
});

refreshFeedbackCount();
</script>
</body>
</html>
"""
