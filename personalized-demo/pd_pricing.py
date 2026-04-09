"""Pricing functies voor De Designmaker — 4 diensten.

Hergebruikt PricingResult/PricingLine uit lead-automation/models/branches.py
en helpers uit lead-automation/branches/base.py.
"""
from __future__ import annotations

from models.branches import PricingLine, PricingResult  # shared via lead-automation
from branches.base import parse_number, with_btw, round2  # shared via lead-automation


# ── Carwrapping ─────────────────────────────────────────────────────────

def carwrapping_pricing(answers: dict[str, str]) -> PricingResult:
    wrap_type = (answers.get("wrap_type") or "full wrap").lower().strip()

    if "partial" in wrap_type:
        lines = [PricingLine(label="Partial wrap", quantity=1, unit="stuks", unit_price=800, total=800)]
    elif "kleur" in wrap_type:
        lines = [PricingLine(label="Kleurverandering", quantity=1, unit="stuks", unit_price=1800, total=1800)]
    else:
        lines = [PricingLine(label="Full wrap", quantity=1, unit="stuks", unit_price=2500, total=2500)]

    subtotaal = sum(l.total for l in lines)
    return PricingResult(lines=lines, **with_btw(subtotaal))


# ── Keuken & interieur ──────────────────────────────────────────────────

def keuken_interieur_pricing(answers: dict[str, str]) -> PricingResult:
    aantal = max(1, int(parse_number(answers.get("aantal_vlakken")) or 1))
    prijs_per_vlak = 65

    lines = [
        PricingLine(
            label="Interieurwrapping",
            quantity=aantal, unit="vlakken", unit_price=prijs_per_vlak,
            total=round2(aantal * prijs_per_vlak),
        ),
    ]

    subtotaal = sum(l.total for l in lines)
    return PricingResult(lines=lines, **with_btw(subtotaal))


# ── Binnen reclame ──────────────────────────────────────────────────────

def binnen_reclame_pricing(answers: dict[str, str]) -> PricingResult:
    type_reclame = (answers.get("type_reclame") or "muurreclame").lower().strip()

    tarieven = {
        "muurreclame": 45,
        "raamfolie": 60,
        "wandprint": 55,
    }

    if type_reclame == "kantoorsigning":
        lines = [PricingLine(label="Kantoorsigning pakket", quantity=1, unit="stuks", unit_price=500, total=500)]
    else:
        tarief = tarieven.get(type_reclame, 45)
        m2 = parse_number(answers.get("afmetingen")) or 5
        lines = [
            PricingLine(
                label=f"{type_reclame.capitalize()} applicatie",
                quantity=m2, unit="m²", unit_price=tarief,
                total=round2(m2 * tarief),
            ),
        ]

    subtotaal = sum(l.total for l in lines)
    return PricingResult(lines=lines, **with_btw(subtotaal))


# ── Signing & belettering ───────────────────────────────────────────────

def signing_pricing(answers: dict[str, str]) -> PricingResult:
    scope = (answers.get("ontwerp_scope") or "tekst en logo").lower().strip()
    aantal = max(1, int(parse_number(answers.get("aantal")) or 1))

    scope_prijzen = {
        "alleen logo": 350,
        "tekst en logo": 650,
        "full design": 1200,
        "bestaand ontwerp": 350,
    }
    prijs_per_voertuig = scope_prijzen.get(scope, 650)

    lines = [
        PricingLine(
            label=f"Belettering ({scope})",
            quantity=aantal, unit="voertuigen", unit_price=prijs_per_voertuig,
            total=round2(aantal * prijs_per_voertuig),
        ),
    ]

    # Fleet korting bij 3+ voertuigen
    if aantal >= 3:
        korting = round2(sum(l.total for l in lines) * 0.10)
        lines.append(PricingLine(
            label="Fleet korting (10%)",
            quantity=1, unit="stuks", unit_price=-korting,
            total=-korting,
        ))

    subtotaal = sum(l.total for l in lines)
    return PricingResult(lines=lines, **with_btw(subtotaal))


# ── Dispatcher ──────────────────────────────────────────────────────────

PRICING_FUNCS = {
    "carwrapping": carwrapping_pricing,
    "keuken_interieur": keuken_interieur_pricing,
    "binnen_reclame": binnen_reclame_pricing,
    "signing": signing_pricing,
}


def get_designmaker_pricing(type_dienst: str, answers: dict[str, str]) -> PricingResult:
    """Bereken pricing voor de gegeven dienst."""
    func = PRICING_FUNCS.get(type_dienst)
    if not func:
        raise ValueError(f"Onbekende dienst: {type_dienst}")
    return func(answers)
