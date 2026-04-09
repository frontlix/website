from __future__ import annotations

import json

from services.openai_client import get_openai
from models.lead import ConversationMessage


def format_history(history: list[ConversationMessage]) -> str:
    return "\n".join(
        f"{'Klant' if m.role == 'user' else 'Assistent'}: {m.content}"
        for m in history
    )


async def detect_branche(history: list[ConversationMessage]) -> str | None:
    """Classify the customer's message into one of three industries. Returns branche id or None."""
    chat_history = format_history(history)

    response = get_openai().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": """You classify Dutch WhatsApp messages into one of three industries.

Return ONLY JSON in this format: { "branche": "<value>" }

Allowed values:
- "zonnepanelen" — customer wants solar panels, PV, panels on the roof, energy generation
- "dakdekker" — customer has roof problems, leaks, wants roof replaced, insulated or repaired
- "schoonmaak" — customer wants cleaning services for office/home/hospitality/retail
- "null" — unclear, customer has not mentioned an industry yet

Be generous with recognition — typos and Dutch synonyms are fine. When in doubt: "null".""",
            },
            {"role": "user", "content": chat_history},
        ],
    )

    text = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(text)
        v = parsed.get("branche")
        if v in ("zonnepanelen", "dakdekker", "schoonmaak"):
            return v
        return None
    except json.JSONDecodeError:
        return None
