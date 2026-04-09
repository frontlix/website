from __future__ import annotations

from models.branches import BrancheConfig, BrancheField, PricingLine, PricingResult, CompanyInfo
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


schoonmaak_config = BrancheConfig(
    id="schoonmaak",
    label="Schoonmaak",
    agent_name="Lotte",
    personality="Lotte is a warm, efficient customer contact person at a cleaning company. Never over the top.",
    company=CompanyInfo(
        name="Glanz Schoonmaak B.V.",
        address_lines=["Bloemstraat 88", "1016 ML Amsterdam", "Nederland"],
        phone="+31 20 456 7890",
        email="info@glanz-schoonmaak.nl",
        website="www.glanz-schoonmaak.nl",
        kvk="34567890",
        btw="NL345678901B01",
        iban="NL40 ABNA 0234 5678 90",
        contact_person="S. Bakker",
    ),
    intro_offerte="Bedankt voor je interesse in onze schoonmaakdiensten. Hieronder vind je het voorstel op basis van het WhatsApp-gesprek dat we hadden.",
    aanbod_beschrijving="Professionele schoonmaakdienst inclusief alle benodigde materialen, milieuvriendelijke producten en aansprakelijkheidsverzekering.",
    actie_kort="Schoonmaak inplannen",
    actie_lang="de eerste schoonmaak",
    plaatsing_duur_min=120,
    fields=[
        BrancheField(key="type_pand", label="type pand", example_question="Wat voor pand is het?", type="enum", enum_values=["woning", "kantoor", "horeca", "winkel"]),
        BrancheField(key="oppervlakte", label="oppervlakte in m²", example_question="Hoeveel m² moet er schoongemaakt worden?", type="number", unit="m²"),
        BrancheField(key="frequentie", label="frequentie", example_question="Hoe vaak wil je het laten doen?", type="enum", enum_values=["eenmalig", "wekelijks", "2-wekelijks", "maandelijks"]),
        BrancheField(key="ramen", label="ramen meedoen", example_question="Wil je dat we de ramen ook meenemen?", type="enum", enum_values=["ja", "nee"]),
    ],
)
