"""Dashboard reload-endpoint. Triggers een fresh hydrate van BRANCHES uit JSON of DB.

Auth: Bearer-token via DASHBOARD_API_TOKEN. Leeg → 503 (endpoint disabled).
Constant-time compare via hmac.compare_digest.
"""
from __future__ import annotations

import hmac

from fastapi import APIRouter, Header, HTTPException

from config import get_settings
from branches import BRANCHES
from branches.loader import hydrate_all


router = APIRouter()


def _bearer_eq(authorization_header: str, expected_token: str) -> bool:
    """Constant-time vergelijking van een 'Bearer <token>' header met expected."""
    if not authorization_header:
        return False
    parts = authorization_header.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return False
    return hmac.compare_digest(parts[1].strip(), expected_token)


@router.post("/dashboard-api/config/reload")
async def reload_config(authorization: str = Header(default="")):
    token = get_settings().dashboard_api_token
    if not token:
        raise HTTPException(status_code=503, detail="dashboard reload disabled")
    if not _bearer_eq(authorization, token):
        raise HTTPException(status_code=401, detail="unauthorized")
    try:
        hydrate_all()  # sync
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"hydrate failed: {e}") from e
    return {"ok": True, "branches": list(BRANCHES.keys())}
