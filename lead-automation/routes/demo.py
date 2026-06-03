"""Demo start endpoint, called by the Next.js website form.

Body unchanged: { "telefoon": "..." }. Behaviour unchanged. The actual lead
creation + template send is delegated to services.lead_intake so the HMAC
external-webhook (Pakket 4a) can reuse the same pipeline.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.lead_intake import intake_lead, IntakeError, IntakePayload

router = APIRouter()


class DemoStartRequest(BaseModel):
    telefoon: str


@router.post("/demo/start")
async def start_demo(req: DemoStartRequest):
    try:
        await intake_lead(IntakePayload(telefoon=req.telefoon))
    except IntakeError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from e
    return {"success": True}
