"""Multi-tenant branche-config loader.

Source-of-truth keuze via `get_settings().config_source`:
  - "json" (default): leest `lead-automation/clients/<id>/config.json`
  - "db": leest `branche_settings` + `branche_fields` via `get_supabase()`

Mutatie-strategie: bestaande BRANCHES[id]-instances worden IN-PLACE bijgewerkt
zodat eerder-uitgedeelde refs (vanuit `get_branche(id)`) altijd actuele waarden
zien zonder re-import. Pendant van applyClientConfigSnapshot() uit Schoon Straatje.
"""
from __future__ import annotations

import asyncio
import json
import threading
from pathlib import Path
from typing import Any

from models.branches import BrancheConfig
from config import get_settings


_CLIENTS_DIR = Path(__file__).resolve().parent.parent / "clients"
_apply_lock = threading.Lock()


def load_from_json(branche_id: str) -> BrancheConfig:
    """Load a single branche config from clients/<id>/config.json.

    Wraps Pydantic validation errors with branche-id context, raw v2 errors
    are otherwise cryptic.
    """
    path = _CLIENTS_DIR / branche_id / "config.json"
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return BrancheConfig.model_validate(raw)
    except Exception as e:
        raise ValueError(f"Failed to load branche '{branche_id}' from {path}: {e}") from e


def load_from_db(branche_id: str) -> BrancheConfig:
    """Load a single branche config from Supabase (branche_settings + branche_fields).

    Uses the shared `get_supabase()` factory, no separate client.
    """
    # Import lazily so this module can be imported without Supabase env-vars set.
    from services.supabase import get_supabase

    sb = get_supabase()

    settings_res = (
        sb.table("branche_settings").select("*").eq("id", branche_id).limit(1).execute()
    )
    rows = settings_res.data or []
    if not rows:
        raise ValueError(f"Branche '{branche_id}' not found in branche_settings")
    row = rows[0]

    fields_res = (
        sb.table("branche_fields")
        .select("*")
        .eq("branche_id", branche_id)
        .order("sort_order")
        .execute()
    )
    field_rows = fields_res.data or []
    fields_payload = [
        {
            "key": f["key"],
            "label": f["label"],
            "example_question": f["example_question"],
            "type": f.get("type") or "text",
            "enum_values": f.get("enum_values"),
            "unit": f.get("unit"),
            "hints": f.get("hints"),
        }
        for f in field_rows
    ]

    payload: dict[str, Any] = {
        "id": row["id"],
        "label": row["label"],
        "agent_name": row["agent_name"],
        "personality": row["personality"],
        "company": row["company"],
        "intro_offerte": row["intro_offerte"],
        "aanbod_beschrijving": row["aanbod_beschrijving"],
        "actie_kort": row["actie_kort"],
        "actie_lang": row["actie_lang"],
        "plaatsing_duur_min": row["plaatsing_duur_min"],
        "appointment_label": row.get("appointment_label") or "afspraak",
        "appointment_label_short": row.get("appointment_label_short") or "afspraak",
        "appointment_duration_min": row.get("appointment_duration_min") or 60,
        "appointment_purpose": row.get("appointment_purpose") or "",
        "fields": fields_payload,
    }
    try:
        return BrancheConfig.model_validate(payload)
    except Exception as e:
        raise ValueError(f"Failed to validate branche '{branche_id}' from DB: {e}") from e


def _apply_snapshot(snapshot: dict[str, BrancheConfig]) -> None:
    """Adds new branches and updates fields on existing ones in-place.

    Does NOT remove branches absent from the snapshot, `get_branche()` refs
    remain valid across reloads. Relevant once the dashboard exposes delete.
    """
    # Avoid a circular import at module load time.
    from branches import BRANCHES

    field_names = list(BrancheConfig.model_fields.keys())
    with _apply_lock:
        for bid, new_cfg in snapshot.items():
            existing = BRANCHES.get(bid)
            if existing is None:
                BRANCHES[bid] = new_cfg
            else:
                for field in field_names:
                    setattr(existing, field, getattr(new_cfg, field))


def hydrate_all() -> None:
    """Build a full snapshot of all branche-configs and apply it in-place.

    Synchronous, called from FastAPI startup and from the dashboard reload
    endpoint. The async background-refresh wraps this with asyncio.sleep.
    """
    from branches import BRANCHE_IDS

    source = get_settings().config_source
    loader = load_from_db if source == "db" else load_from_json

    snapshot: dict[str, BrancheConfig] = {}
    for bid in BRANCHE_IDS:
        snapshot[bid] = loader(bid)

    _apply_snapshot(snapshot)
    print(f"[config] hydrated {len(snapshot)} branches from {source}")


async def start_background_refresh(interval_seconds: int = 60) -> None:
    """Refresh BRANCHES every `interval_seconds`. Failures are logged and
    swallowed, the previous snapshot stays in place (resilience)."""
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            hydrate_all()
        except Exception as e:
            print(f"[config] refresh failed (keeping cache): {e}")
