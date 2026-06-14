from __future__ import annotations

import difflib
import math
import re
from typing import Callable

from models.branches import BrancheConfig, BrancheField, PricingLine, PricingResult, CompanyInfo


def with_btw(subtotaal: float, btw_pct: float = 21.0) -> dict:
    """Calculate VAT on a subtotal. btw_pct uit tenant_settings (default 21%)."""
    s = round2(subtotaal)
    btw = round2(subtotaal * (btw_pct / 100))
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
    """Normalize a free LLM output to one of the allowed enum values.

    Exact case-insensitive match first, then fuzzy fallback (cutoff 0.8) zodat
    een klant-typo als "schijn" alsnog naar "schuin" resolved als het analyzer-LLM
    de typo doorliet. Cutoff is bewust streng om distincte enum-waarden niet
    per ongeluk op elkaar te mappen."""
    if not value:
        return None
    v = str(value).strip().lower()
    lowered = [a.lower() for a in allowed]
    for i, a in enumerate(lowered):
        if a == v:
            return allowed[i]
    matches = difflib.get_close_matches(v, lowered, n=1, cutoff=0.8)
    if matches:
        return allowed[lowered.index(matches[0])]
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
    for flat roofs in the zonnepanelen branche) AND user-driven skips recorded in
    collected_data["_skipped"] (customer was unsure twice, or uploaded photos with fields
    still unfilled, so we move on without re-asking)."""
    missing = get_missing_fields(config, collected_data)
    # Plat dak → orientatie is irrelevant. Panels are mounted on angled frames
    # regardless of flat-roof direction. Use startswith so "plat", "Plat", "plat dak" all match.
    if branche_id == "zonnepanelen" and (collected_data.get("daktype") or "").strip().lower().startswith("plat"):
        missing = [f for f in missing if f != "orientatie"]
    # Dakdekker: when the customer chose 'isoleren' as type_werk, asking "wil je isolatie er
    # meteen bij" is redundant, the job itself IS isolating. Pricing uses the isoleren-rate
    # (€90/m²) which already covers it, so we also don't need the separate isolatie-pakket line.
    if branche_id == "dakdekker" and (collected_data.get("type_werk") or "").strip().lower() == "isoleren":
        missing = [f for f in missing if f != "isolatie"]
    # User-driven skips: fields the customer was unsure about twice, OR fields auto-skipped
    # when photos arrived with data still unfilled (photo evidence is "good enough" to move on).
    skipped_raw = collected_data.get("_skipped")
    if isinstance(skipped_raw, list) and skipped_raw:
        skipped = {str(x) for x in skipped_raw}
        missing = [f for f in missing if f not in skipped]
    return missing


def get_photo_count(collected_data: dict) -> int:
    photos = collected_data.get("photos")
    if not isinstance(photos, list):
        return 0
    return len(photos)


MAX_PHOTOS = 12
PHOTO_WAIT_MS = 20_000


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
