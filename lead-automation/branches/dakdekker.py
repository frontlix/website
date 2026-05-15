from __future__ import annotations

from models.branches import PricingLine, PricingResult
from branches.base import parse_number, with_btw, round2


def dakdekker_pricing(answers: dict[str, str]) -> PricingResult:
    m2 = parse_number(answers.get("dakoppervlakte")) or 50
    type_werk = (answers.get("type_werk") or "repareren").lower()

    tarieven = {"vervangen": 120, "repareren": 60, "isoleren": 90}
    tarief = tarieven.get(type_werk, 80)

    lines = [
        PricingLine(
            label=f"Dakwerk: {type_werk}",
            quantity=m2, unit="m²", unit_price=tarief,
            total=round2(m2 * tarief),
        ),
    ]

    if (answers.get("isolatie") or "").lower() == "ja" and type_werk != "isoleren":
        lines.append(PricingLine(
            label="Isolatiepakket (PIR-platen + dampscherm)",
            quantity=1, unit="pakket", unit_price=1500, total=1500,
        ))

    subtotaal = sum(l.total for l in lines)

    btw = with_btw(subtotaal)
    return PricingResult(lines=lines, **btw)
