"""Personalized demo routes — gescheiden van de lead-automation branche-flow.

POST /demo/personalized/start  — Start een persoonlijke demo (vanuit Next.js)
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.supabase import get_supabase  # shared via lead-automation
from services.whatsapp import normalize_phone, send_personalized_demo_template  # shared

router = APIRouter()


class PersonalizedDemoStartRequest(BaseModel):
    telefoon: str
    personalized_demo_id: str


def _fetch_demo_info(demo_id: str) -> dict | None:
    """Fetch the personalized demo config from Supabase."""
    resp = get_supabase().table("personalized_demos").select(
        "id, slug, naam, bedrijf, branche, briefing, is_active, expires_at"
    ).eq("id", demo_id).single().execute()
    return resp.data if resp.data else None


@router.post("/demo/personalized/start")
async def start_personalized_demo(req: PersonalizedDemoStartRequest):
    """Create a lead for a personalized demo and send the WhatsApp template."""
    phone = normalize_phone(req.telefoon)

    # Fetch demo info
    demo_info = _fetch_demo_info(req.personalized_demo_id)
    if not demo_info:
        raise HTTPException(status_code=404, detail="Demo niet gevonden.")

    if not demo_info.get("is_active"):
        raise HTTPException(status_code=410, detail="Deze demo is niet meer actief.")

    # Check expiry
    if demo_info.get("expires_at"):
        from datetime import datetime, timezone
        expires = datetime.fromisoformat(demo_info["expires_at"].replace("Z", "+00:00"))
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Deze demo is verlopen.")

    # Verwijder bestaande personalized leads voor dit nummer (zodat je de demo opnieuw kunt testen)
    existing = (
        get_supabase()
        .table("leads")
        .select("id")
        .eq("telefoon", phone)
        .eq("demo_type", "personalized")
        .execute()
    )
    for old_lead in (existing.data or []):
        get_supabase().table("conversations").delete().eq("lead_id", old_lead["id"]).execute()
        get_supabase().table("leads").delete().eq("id", old_lead["id"]).execute()

    # Create lead with demo_type="personalized" and store the demo_id in collected_data
    result = get_supabase().table("leads").insert({
        "telefoon": phone,
        "status": "collecting",  # Skip awaiting_choice — no branche selection needed
        "demo_type": "personalized",
        "collected_data": {
            "_personalized_demo_id": req.personalized_demo_id,
        },
        "photo_urls": [],
        "photo_analyses": [],
        "message_count": 0,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Er ging iets mis bij het opslaan.")

    # Increment demo_started_count
    try:
        get_supabase().rpc("increment_demo_started", {"demo_id": req.personalized_demo_id}).execute()
    except Exception:
        pass  # Non-critical

    # Send personalized WhatsApp template
    naam = demo_info.get("naam", "daar")
    bedrijf = demo_info.get("bedrijf", "je bedrijf")

    try:
        await send_personalized_demo_template(phone, naam, bedrijf)
    except Exception as e:
        print(f"[personalized] WhatsApp template failed: {e}")

    return {"success": True}
