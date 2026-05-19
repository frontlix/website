"""Seed-script: leest clients/<id>/config.json en upsert in Supabase.

Idempotent — herrun overschrijft alleen bestaande rijen, dubbele inserts worden
voorkomen door de PK's (id voor branche_settings, (branche_id, key) voor branche_fields).

Run vanuit lead-automation/:
    python scripts/migrate_config_to_db.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Make lead-automation/ importable as the script's package root
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from services.supabase import get_supabase  # noqa: E402
from branches import BRANCHE_IDS  # noqa: E402


def _load_json(branche_id: str) -> dict:
    path = _ROOT / "clients" / branche_id / "config.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _upsert_settings(sb, cfg: dict) -> None:
    row = {
        "id": cfg["id"],
        "label": cfg["label"],
        "agent_name": cfg["agent_name"],
        "personality": cfg["personality"],
        "company": cfg["company"],
        "intro_offerte": cfg["intro_offerte"],
        "aanbod_beschrijving": cfg["aanbod_beschrijving"],
        "actie_kort": cfg["actie_kort"],
        "actie_lang": cfg["actie_lang"],
        "plaatsing_duur_min": cfg["plaatsing_duur_min"],
        "appointment_label": cfg.get("appointment_label", "afspraak"),
        "appointment_label_short": cfg.get("appointment_label_short", "afspraak"),
        "appointment_duration_min": cfg.get("appointment_duration_min", 60),
        "appointment_purpose": cfg.get("appointment_purpose", ""),
    }
    sb.table("branche_settings").upsert(row, on_conflict="id").execute()


def _upsert_fields(sb, cfg: dict) -> None:
    rows = []
    for idx, f in enumerate(cfg["fields"]):
        rows.append(
            {
                "branche_id": cfg["id"],
                "key": f["key"],
                "label": f["label"],
                "example_question": f["example_question"],
                "type": f.get("type") or "text",
                "enum_values": f.get("enum_values"),
                "unit": f.get("unit"),
                "hints": f.get("hints"),
                "sort_order": idx,
            }
        )
    if rows:
        sb.table("branche_fields").upsert(rows, on_conflict="branche_id,key").execute()


def main() -> int:
    sb = get_supabase()
    for bid in BRANCHE_IDS:
        cfg = _load_json(bid)
        _upsert_settings(sb, cfg)
        _upsert_fields(sb, cfg)
        print(f"[seed] upserted '{bid}' ({len(cfg['fields'])} fields)")
    print("[seed] done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
