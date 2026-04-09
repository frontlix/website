from __future__ import annotations

from typing import Callable

from models.branches import BrancheConfig, PricingResult
from branches.zonnepanelen import zonnepanelen_config, zonnepanelen_pricing
from branches.dakdekker import dakdekker_config, dakdekker_pricing
from branches.schoonmaak import schoonmaak_config, schoonmaak_pricing
from branches.base import (
    get_missing_fields,
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

BRANCHES: dict[str, BrancheConfig] = {
    "zonnepanelen": zonnepanelen_config,
    "dakdekker": dakdekker_config,
    "schoonmaak": schoonmaak_config,
}

PRICING_FUNCS: dict[str, Callable[[dict[str, str]], PricingResult]] = {
    "zonnepanelen": zonnepanelen_pricing,
    "dakdekker": dakdekker_pricing,
    "schoonmaak": schoonmaak_pricing,
}

BRANCHE_IDS = list(BRANCHES.keys())


def get_branche(branche_id: str | None) -> BrancheConfig | None:
    if not branche_id:
        return None
    return BRANCHES.get(branche_id)


def get_pricing(branche_id: str, answers: dict[str, str]) -> PricingResult:
    func = PRICING_FUNCS.get(branche_id)
    if not func:
        raise ValueError(f"Unknown branche: {branche_id}")
    return func(answers)
