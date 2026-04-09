from __future__ import annotations

from typing import Optional, Callable, Literal
from pydantic import BaseModel


class CompanyInfo(BaseModel):
    name: str
    address_lines: list[str]
    phone: str
    email: str
    website: str
    kvk: str
    btw: str
    iban: str
    contact_person: str


class BrancheField(BaseModel):
    key: str
    label: str
    example_question: str
    type: Literal["text", "email", "number", "enum"] = "text"
    enum_values: Optional[list[str]] = None
    unit: Optional[str] = None
    hints: Optional[str] = None


class PricingLine(BaseModel):
    label: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    total: float


class PricingResult(BaseModel):
    lines: list[PricingLine]
    subtotaal_excl_btw: float
    btw_bedrag: float
    totaal_incl_btw: float


class BrancheConfig(BaseModel):
    id: str
    label: str
    agent_name: str
    personality: str
    company: CompanyInfo
    intro_offerte: str
    aanbod_beschrijving: str
    fields: list[BrancheField]
    actie_kort: str
    actie_lang: str
    plaatsing_duur_min: int

    class Config:
        arbitrary_types_allowed = True
