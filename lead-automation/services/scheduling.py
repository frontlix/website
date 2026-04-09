"""Scheduling agent — proposes free slots and matches customer choice via LLM."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from pydantic import BaseModel

from services.openai_client import get_openai
from services.google_calendar import get_free_slots, TIMEZONE
from models.lead import ConversationMessage


TZ = ZoneInfo(TIMEZONE)


class FreeSlot(BaseModel):
    start_utc: str  # ISO string
    end_utc: str
    label: str
    iso: str


async def propose_slots(klant_naam: str) -> tuple[str, list[FreeSlot]]:
    """Query Google Calendar, select 3 distributed slots, generate friendly WhatsApp message."""
    now = datetime.now(timezone.utc)
    range_end = now + timedelta(days=14)
    all_slots_raw = await get_free_slots(now, range_end, 30)
    all_slots = [FreeSlot(**s) for s in all_slots_raw]

    # Select 3 distributed slots
    if not all_slots:
        proposed: list[FreeSlot] = []
    elif len(all_slots) <= 3:
        proposed = all_slots
    else:
        first = all_slots[0]
        mid = all_slots[len(all_slots) // 2]
        last = all_slots[-1]
        # Spread across different days
        seen: set[str] = set()
        picks = []
        for s in [first, mid, last]:
            day = " ".join(s.label.split()[:3])
            if day not in seen:
                seen.add(day)
                picks.append(s)
        proposed = picks if len(picks) >= 2 else [first, all_slots[1], all_slots[2] if len(all_slots) > 2 else first]

    if not proposed:
        return (
            f"Hoi {klant_naam}, er zijn op dit moment helaas geen vrije slots in mijn agenda voor de komende twee weken. Een collega neemt persoonlijk contact met je op.",
            [],
        )

    # Ask LLM to format slots into a natural WhatsApp message
    slots_text = "\n".join(f"{i+1}. {s.label}" for i, s in enumerate(proposed))

    response = get_openai().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.6,
        messages=[
            {
                "role": "system",
                "content": """You are a friendly scheduling assistant on WhatsApp proposing 3 time slots for a free 30-minute introductory call. The customer just received their quote and wants to schedule.

Rules:
- Write in informal Dutch (je/jij)
- Open warm but brief
- Present the 3 slots as a numbered list (1., 2., 3.)
- Ask the customer to choose by sending the number or typing the time
- Maximum 5-6 sentences total
- No jargon, no sales talk
- Don't start with the customer's name

Return ONLY the WhatsApp message.""",
            },
            {
                "role": "user",
                "content": f"Customer name: {klant_naam}\n\nProposed slots:\n{slots_text}",
            },
        ],
    )

    message = (response.choices[0].message.content or "").strip()
    if not message:
        message = f"Top! Ik heb 3 momenten voor je vrij voor een korte kennismaking van 30 minuten:\n\n{slots_text}\n\nWelke werkt het beste voor je? Stuur het nummer of de tijd terug."

    return message, proposed


async def match_slot(history: list[ConversationMessage], proposed: list[FreeSlot]) -> FreeSlot | None:
    """Match the customer's answer against the proposed slots using LLM."""
    if not proposed:
        return None

    slots_text = "\n".join(f"{i+1}. {s.label} (iso: {s.iso})" for i, s in enumerate(proposed))

    last_user_msg = ""
    for m in reversed(history):
        if m.role == "user":
            last_user_msg = m.content
            break

    response = get_openai().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": f"""You match a customer's choice against 3 proposed appointment slots.

Proposed slots:
{slots_text}

Return ONLY JSON:
- Clear match: {{ "slot_index": <1|2|3>, "iso": "<iso of chosen slot>" }}
- Unclear: {{ "slot_index": null }}

Be generous with recognition:
- "1" / "eerste" / "de bovenste" → first option
- "2" / "tweede" → second option
- "3" / "laatste" → third option
- Time that matches a proposed time → that slot
- Non-matching time → null
- Question or comment → null""",
            },
            {
                "role": "user",
                "content": f"Customer's last message:\n{last_user_msg or '(none)'}",
            },
        ],
    )

    text = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(text)
        idx = parsed.get("slot_index")
        if isinstance(idx, int) and 1 <= idx <= len(proposed):
            return proposed[idx - 1]
        iso = parsed.get("iso")
        if iso:
            for s in proposed:
                if s.iso == iso:
                    return s
        return None
    except json.JSONDecodeError:
        return None


def format_confirmation(slot: FreeSlot, klant_naam: str) -> str:
    """Format a confirmation message for the chosen slot."""
    dt = datetime.fromisoformat(slot.iso).astimezone(TZ)
    datum = dt.strftime("%A %-d %B om %H:%M").capitalize()
    voornaam = klant_naam.split()[0]
    return f"Top, {voornaam}! Je afspraak staat in de agenda voor {datum}. Je krijgt zo een Google Calendar uitnodiging in je mail. Tot snel!"
