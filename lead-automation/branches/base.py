from __future__ import annotations

import math
import re
from typing import Callable

from models.branches import BrancheConfig, BrancheField, PricingLine, PricingResult, CompanyInfo


def with_btw(subtotaal: float) -> dict:
    """Calculate 21% VAT on a subtotal."""
    s = round2(subtotaal)
    btw = round2(subtotaal * 0.21)
    return {"subtotaal_excl_btw": s, "btw_bedrag": btw, "totaal_incl_btw": round2(s + btw)}


def round2(n: float) -> float:
    """Round to 2 decimal places (euro-safe)."""
    return round(n * 100) / 100


def parse_number(value: str | None) -> float:
    """Parse a free-form number field (e.g. '4000', '4.000', '4000 kWh')."""
    if not value:
        return 0.0
    cleaned = re.sub(r"[^0-9.,]", "", str(value)).replace(".", "").replace(",", ".")
    try:
        n = float(cleaned)
        return n if math.isfinite(n) else 0.0
    except ValueError:
        return 0.0


def normalize_enum(value: str | None, allowed: list[str]) -> str | None:
    """Normalize a free LLM output to one of the allowed enum values (case-insensitive)."""
    if not value:
        return None
    v = str(value).strip().lower()
    for a in allowed:
        if a.lower() == v:
            return a
    return None


def get_missing_fields(config: BrancheConfig, collected_data: dict) -> list[str]:
    """Return keys of fields that are still missing from collected_data."""
    missing = []
    for f in config.fields:
        v = collected_data.get(f.key)
        if v is None or v == "" or v == "null":
            missing.append(f.key)
    return missing


def get_effective_missing_fields(config: BrancheConfig, collected_data: dict, branche_id: str | None = None) -> list[str]:
    """Like get_missing_fields, but applies architectural skips (e.g. orientatie is irrelevant
    for flat roofs in the zonnepanelen branche — panels can be mounted in any direction)."""
    missing = get_missing_fields(config, collected_data)
    if branche_id == "zonnepanelen" and (collected_data.get("daktype") or "").lower() == "plat":
        missing = [f for f in missing if f != "orientatie"]
    return missing


def get_photo_count(collected_data: dict) -> int:
    photos = collected_data.get("photos")
    if not isinstance(photos, list):
        return 0
    return len(photos)


MAX_PHOTOS = 12
PHOTO_WAIT_MS = 30_000


def is_photo_step_done(collected_data: dict) -> bool:
    return collected_data.get("_photo_step_done") is True


def get_last_photo_at(collected_data: dict) -> int:
    v = collected_data.get("_last_photo_at")
    return v if isinstance(v, (int, float)) else 0


def user_skips_photo_step(text: str) -> bool:
    """Soft keyword detection for 'no photo / skip / that's all'."""
    # Normalize curly quotes from WhatsApp to straight quotes
    t = text.lower().strip().replace("\u2018", "'").replace("\u2019", "'")
    if not t:
        return False
    if re.match(r"^(nee|nope|geen|klaar|skip|stop|niets|niks|geen foto)$", t, re.IGNORECASE):
        return True
    if re.search(
        r"\b(geen foto|geen fotos|geen foto's|heb geen|heb er geen|sla over|overslaan|dat (is|was) alles|ben klaar|niks meer|niets meer|zonder foto|liever niet)\b",
        t, re.IGNORECASE,
    ):
        return True
    return False
