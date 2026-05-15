from __future__ import annotations

from typing import Callable

from models.branches import BrancheConfig, PricingResult
from branches.zonnepanelen import zonnepanelen_pricing
from branches.dakdekker import dakdekker_pricing
from branches.schoonmaak import schoonmaak_pricing
from branches.base import (
    get_missing_fields,
    get_effective_missing_fields,
    get_photo_count,
    is_photo_step_done,
    get_last_photo_at,
    user_skips_photo_step,
    normalize_enum,
    parse_number,
    MAX_PHOTOS,
    PHOTO_WAIT_MS,
)

BrancheId = str  # "zonnepanelen" | "dakdekker" | "schoonmaak"

# BRANCHES start leeg en wordt expliciet gevuld door loader.hydrate_all()
# in FastAPI's @app.on_event("startup"). Geen verborgen file/DB-I/O bij import.
# Tests gebruiken een conftest fixture die hydrate_all() aanroept.
BRANCHES: dict[str, BrancheConfig] = {}

PRICING_FUNCS: dict[str, Callable[[dict[str, str]], PricingResult]] = {
    "zonnepanelen": zonnepanelen_pricing,
    "dakdekker": dakdekker_pricing,
    "schoonmaak": schoonmaak_pricing,
}

# Hardcoded zodat callers BRANCHE_IDS kunnen lezen vóór hydrate_all() heeft gelopen
# (bv. loader zelf moet dit weten om iterator-input te hebben).
BRANCHE_IDS: list[str] = ["zonnepanelen", "dakdekker", "schoonmaak"]


def get_branche(branche_id: str | None) -> BrancheConfig | None:
    if not branche_id:
        return None
    return BRANCHES.get(branche_id)


def get_pricing(branche_id: str, answers: dict[str, str]) -> PricingResult:
    func = PRICING_FUNCS.get(branche_id)
    if not func:
        raise ValueError(f"Unknown branche: {branche_id}")
    return func(answers)
