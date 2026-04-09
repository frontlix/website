from __future__ import annotations

import math

from models.branches import BrancheConfig, BrancheField, PricingLine, PricingResult, CompanyInfo
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


zonnepanelen_config = BrancheConfig(
    id="zonnepanelen",
    label="Zonnepanelen",
    agent_name="Sanne",
    personality="Sanne is a down-to-earth solar energy account manager. Pleasant, technically savvy, straight to the point.",
    company=CompanyInfo(
        name="SolarPower Nederland B.V.",
        address_lines=["Zonneweg 15", "2511 BK Den Haag", "Nederland"],
        phone="+31 70 345 6789",
        email="info@solarpower-nl.nl",
        website="www.solarpower-nl.nl",
        kvk="12345678",
        btw="NL123456789B01",
        iban="NL20 INGB 0001 2345 67",
        contact_person="J. de Groot",
    ),
    intro_offerte="Naar aanleiding van de voorgaande gesprekken sturen wij u graag een zakelijk voorstel voor de hieronder beschreven werkzaamheden.",
    aanbod_beschrijving="Levering en installatie van een compleet zonnepanelensysteem, inclusief panelen, omvormer, montagesysteem en aansluiting op het elektriciteitsnet.",
    actie_kort="Plaatsing inplannen",
    actie_lang="de plaatsing van de zonnepanelen",
    plaatsing_duur_min=480,
    fields=[
        BrancheField(key="jaarverbruik", label="jaarverbruik in kWh", example_question="Hoeveel stroom verbruik je ongeveer per jaar in kWh?", type="number", unit="kWh"),
        BrancheField(key="daktype", label="type dak", example_question="Heb je een schuin of een plat dak?", type="enum", enum_values=["schuin", "plat"]),
        BrancheField(key="dakmateriaal", label="dakmateriaal", example_question="Wat voor dakmateriaal heb je?", type="enum", enum_values=["pannen", "riet", "leisteen", "dakbedekking"]),
        BrancheField(key="dakoppervlakte", label="dakoppervlakte in m²", example_question="Hoe groot is het dakvlak in m²?", type="number", unit="m²"),
        BrancheField(key="orientatie", label="oriëntatie van het dak", example_question="Naar welke kant ligt het dak?", type="enum", enum_values=["noord", "oost", "zuid", "west"]),
        BrancheField(key="schaduw", label="mate van schaduw", example_question="Is er schaduw op het dak?", type="enum", enum_values=["geen", "licht", "veel"]),
        BrancheField(key="aansluiting", label="type aansluiting", example_question="Heb je een 1-fase of 3-fase aansluiting?", type="enum", enum_values=["1-fase", "3-fase"]),
    ],
)
