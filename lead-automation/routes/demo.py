"""Demo start endpoint — called by the Next.js website form."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.supabase import get_supabase
from services.whatsapp import normalize_phone, send_demo_start_template

router = APIRouter()


class DemoStartRequest(BaseModel):
    telefoon: str


@router.post("/demo/start")
async def start_demo(req: DemoStartRequest):
    """Create a new lead and send the WhatsApp demo template."""
    phone = normalize_phone(req.telefoon)

    # Check for existing active lead
    existing = get_supabase().table("leads").select("id, status").eq("telefoon", phone).neq("status", "appointment_booked").limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Er loopt al een demo voor dit nummer. Check je WhatsApp!")

    # Create lead
    result = get_supabase().table("leads").insert({
        "telefoon": phone,
        "status": "awaiting_choice",
        "collected_data": {},
        "photo_urls": [],
        "photo_analyses": [],
        "message_count": 0,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Er ging iets mis bij het opslaan.")

    # Send WhatsApp template
    try:
        await send_demo_start_template(phone, "daar")
    except Exception as e:
        print(f"WhatsApp template failed: {e}")

    return {"success": True}
