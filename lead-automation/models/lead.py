from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel


class BrancheStatus(str, Enum):
    AWAITING_CHOICE = "awaiting_choice"
    COLLECTING = "collecting"
    PENDING_APPROVAL = "pending_approval"
    QUOTE_PROCESSING = "quote_processing"
    QUOTE_SENT = "quote_sent"
    SCHEDULING = "scheduling"
    APPOINTMENT_BOOKED = "appointment_booked"


class Lead(BaseModel):
    id: str
    telefoon: str
    naam: Optional[str] = None
    email: Optional[str] = None
    demo_type: Optional[str] = None
    status: BrancheStatus = BrancheStatus.AWAITING_CHOICE
    collected_data: dict = {}
    photo_urls: list[str] = []
    photo_analyses: list[str] = []
    approval_token: Optional[str] = None
    quote_pdf_url: Optional[str] = None
    pricing: Optional[dict] = None
    message_count: int = 0
    proposed_slots: Optional[list[dict]] = None


class Conversation(BaseModel):
    id: Optional[str] = None
    lead_id: str
    role: str  # "user" or "assistant"
    content: str
    message_type: str = "text"
    media_url: Optional[str] = None


class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
