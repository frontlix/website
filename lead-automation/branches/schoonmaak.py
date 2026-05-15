from __future__ import annotations

from models.branches import PricingLine, PricingResult
from branches.base import parse_number, with_btw, round2


def schoonmaak_pricing(answers: dict[str, str]) -> PricingResult:
    m2 = parse_number(answers.get("oppervlakte")) or 80
    frequentie = (answers.get("frequentie") or "eenmalig").lower()

    tarieven = {"eenmalig": 1.2, "wekelijks": 0.8, "2-wekelijks": 0.95, "maandelijks": 1.1}
    tarief = tarieven.get(frequentie, 1.0)

    lines = [
        PricingLine(
            label=f"Schoonmaak {frequentie} (per beurt)",
            quantity=m2, unit="m²", unit_price=tarief,
            total=round2(m2 * tarief),
        ),
    ]

    if (answers.get("ramen") or "").lower() == "ja":
        lines.append(PricingLine(
            label="Ramen meenemen",
            quantity=m2, unit="m²", unit_price=0.5,
            total=round2(m2 * 0.5),
        ))

    subtotaal = sum(l.total for l in lines)
    btw = with_btw(subtotaal)
    return PricingResult(lines=lines, **btw)
