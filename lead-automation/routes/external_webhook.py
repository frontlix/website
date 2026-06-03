"""External form webhook, POST /api/webhook/lead.

Three modes via EXTERNAL_WEBHOOK_MODE:
  off       (default) → 404 (endpoint hidden)
  dry-run             → verify HMAC + payload, return {"mode": "dry-run"}, no side-effects
  live                → call shared lead-intake (DB write + WhatsApp template)

Auth: X-Webhook-Signature: sha256=<hex_digest_of_raw_body>
      computed with HMAC_SHA256(raw_body, EXTERNAL_WEBHOOK_SECRET).
"""
from __future__ import annotations

import hashlib
import hmac
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator

from config import get_settings
from services.lead_intake import IntakeError, IntakePayload, intake_lead


router = APIRouter()


class FormSubmission(BaseModel):
    """Mirror of formSubmissionSchema in Schoon Straatje's src/lib/validation.ts.
    Required fields: naam, email, telefoon, branche."""
    naam: str = Field(min_length=1, max_length=120)
    email: EmailStr
    telefoon: str = Field(min_length=8, max_length=24)
    branche: str
    fotos: list[str] = Field(default_factory=list, max_length=10)
    # Branche-specific extras, free dict, sanitised by intake.
    fields: dict[str, Any] = Field(default_factory=dict)

    @field_validator("branche")
    @classmethod
    def _branche_allowed(cls, v: str) -> str:
        if v not in {"zonnepanelen", "dakdekker", "schoonmaak"}:
            raise ValueError("branche must be one of zonnepanelen|dakdekker|schoonmaak")
        return v

    @field_validator("fotos")
    @classmethod
    def _fotos_http(cls, v: list[str]) -> list[str]:
        for u in v:
            if not (u.startswith("http://") or u.startswith("https://")):
                raise ValueError(f"foto URL must be http(s): {u!r}")
        return v


def _verify_signature(raw_body: bytes, signature_header: Optional[str], secret: str) -> bool:
    """Constant-time compare HMAC-SHA256 of raw body against the X-Webhook-Signature header.
    Expected format: "sha256=<hex>". Returns False on any malformed input."""
    if not signature_header or not secret:
        return False
    parts = signature_header.split("=", 1)
    if len(parts) != 2 or parts[0].lower() != "sha256":
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(parts[1].strip().lower(), expected.lower())


@router.post("/api/webhook/lead")
async def external_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(default=None, alias="X-Webhook-Signature"),
):
    settings = get_settings()
    mode = settings.external_webhook_mode

    # Off mode, endpoint is hidden.
    if mode == "off":
        raise HTTPException(status_code=404, detail="not found")

    secret = settings.external_webhook_secret
    if not secret:
        # Mode is dry-run|live but no secret configured, refuse rather than no-auth.
        raise HTTPException(status_code=503, detail="external webhook secret not configured")

    raw = await request.body()
    if not _verify_signature(raw, x_webhook_signature, secret):
        raise HTTPException(status_code=401, detail="invalid signature")

    # Validate payload shape. ValidationError → 422 with a JSON-safe summary
    # (raw e.errors() may contain ValueError instances that FastAPI cannot serialise).
    try:
        payload = FormSubmission.model_validate_json(raw)
    except ValidationError as e:
        summary = [{"loc": list(err.get("loc", [])), "msg": err.get("msg", ""), "type": err.get("type", "")} for err in e.errors()]
        raise HTTPException(status_code=422, detail=summary) from e

    if mode == "dry-run":
        return {"mode": "dry-run", "ok": True, "received": {
            "naam": payload.naam, "email": payload.email, "telefoon": payload.telefoon,
            "branche": payload.branche, "fotos_count": len(payload.fotos),
            "fields_count": len(payload.fields),
        }}

    # Live mode → shared intake pipeline.
    try:
        lead = await intake_lead(IntakePayload(
            naam=payload.naam,
            email=str(payload.email),
            telefoon=payload.telefoon,
            branche=payload.branche,
            fotos=payload.fotos,
            fields=payload.fields,
        ))
    except IntakeError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from e

    return {"mode": "live", "ok": True, "lead_id": lead.get("id")}
