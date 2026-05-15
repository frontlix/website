from __future__ import annotations

import math

from models.branches import PricingLine, PricingResult
from branches.base import parse_number, with_btw, round2


def zonnepanelen_pricing(answers: dict[str, str]) -> PricingResult:
    jaarverbruik = parse_number(answers.get("jaarverbruik")) or 4000
    aantal_panelen = max(1, math.ceil(jaarverbruik / 380))

    lines = [
        PricingLine(
            label="Zonnepanelen levering",
            quantity=aantal_panelen, unit="stuks", unit_price=175,
            total=round2(aantal_panelen * 175),
        ),
        PricingLine(
            label="Montage en installatie",
            quantity=aantal_panelen, unit="stuks", unit_price=40,
            total=round2(aantal_panelen * 40),
        ),
        PricingLine(
            label="Omvormer levering en installatie",
            quantity=1, unit="stuks", unit_price=1100, total=1100,
        ),
    ]

    if (answers.get("daktype") or "").lower() == "schuin":
        lines.append(PricingLine(
            label="Steiger plaatsen en verwijderen",
            quantity=1, unit="stuks", unit_price=450, total=450,
        ))

    if (answers.get("dakmateriaal") or "").lower() == "riet":
        lines.append(PricingLine(
            label="Toeslag rietdak montage",
            quantity=1, unit="stuks", unit_price=3300, total=3300,
        ))

    subtotaal = sum(l.total for l in lines)
    btw = with_btw(subtotaal)
    return PricingResult(lines=lines, **btw)
