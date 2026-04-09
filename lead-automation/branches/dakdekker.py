from __future__ import annotations

from models.branches import BrancheConfig, BrancheField, PricingLine, PricingResult, CompanyInfo
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

    if (answers.get("spoed") or "").lower() == "ja":
        spoed_bedrag = round2(subtotaal * 0.25)
        lines.append(PricingLine(
            label="Spoedtoeslag (binnen 5 werkdagen)",
            quantity=1, unit="stuks", unit_price=spoed_bedrag, total=spoed_bedrag,
        ))
        subtotaal += spoed_bedrag

    btw = with_btw(subtotaal)
    return PricingResult(lines=lines, **btw)


dakdekker_config = BrancheConfig(
    id="dakdekker",
    label="Dakdekker",
    agent_name="Bram",
    personality="Bram is a no-nonsense roofer with 20 years of experience. Direct, friendly but blunt.",
    company=CompanyInfo(
        name="Dakwerken Holland B.V.",
        address_lines=["Industrieweg 42", "3542 AD Utrecht", "Nederland"],
        phone="+31 30 234 5678",
        email="info@dakwerken-holland.nl",
        website="www.dakwerken-holland.nl",
        kvk="23456789",
        btw="NL234567890B01",
        iban="NL30 RABO 0123 4567 89",
        contact_person="M. van Dijk",
    ),
    intro_offerte="Naar aanleiding van het voorgaande WhatsApp-gesprek ontvangt u hierbij ons voorstel voor de gewenste werkzaamheden aan uw dak.",
    aanbod_beschrijving="Uitvoering van dakwerkzaamheden inclusief materiaal, arbeid, afvoer en afwerking.",
    actie_kort="Dakwerk inplannen",
    actie_lang="het dakwerk",
    plaatsing_duur_min=480,
    fields=[
        BrancheField(key="type_werk", label="type werkzaamheden", example_question="Wat moet er gebeuren — dak vervangen, repareren of isoleren?", type="enum", enum_values=["vervangen", "repareren", "isoleren"]),
        BrancheField(key="daktype", label="type dak", example_question="Is het een plat of schuin dak?", type="enum", enum_values=["plat", "schuin"]),
        BrancheField(key="huidig_dakmateriaal", label="huidig dakmateriaal", example_question="Wat ligt er nu op het dak?", type="text"),
        BrancheField(key="dakoppervlakte", label="dakoppervlakte in m²", example_question="Hoe groot is het dakvlak in m²?", type="number", unit="m²"),
        BrancheField(key="isolatie", label="isolatie gewenst", example_question="Wil je het dak ook laten isoleren?", type="enum", enum_values=["ja", "nee"]),
        BrancheField(key="spoed", label="spoed", example_question="Is het spoed of kan het binnen een paar weken?", type="enum", enum_values=["ja", "nee"]),
    ],
)
