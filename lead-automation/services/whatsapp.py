from __future__ import annotations

import re
import httpx

from config import get_settings

GRAPH_API_VERSION = "v22.0"


def _base_url() -> str:
    s = get_settings()
    return f"https://graph.facebook.com/{GRAPH_API_VERSION}/{s.whatsapp_phone_number_id}/messages"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {get_settings().whatsapp_access_token}",
        "Content-Type": "application/json",
    }


def normalize_phone(phone: str) -> str:
    """Normalize a Dutch phone number to international format without +."""
    cleaned = re.sub(r"[^0-9+]", "", phone)
    if cleaned.startswith("+"):
        cleaned = cleaned[1:]
    if cleaned.startswith("0031"):
        cleaned = cleaned[2:]
    if cleaned.startswith("0"):
        cleaned = "31" + cleaned[1:]
    return cleaned


async def send_text(phone: str, text: str) -> None:
    """Send a free-text WhatsApp message (within 24h conversation window)."""
    to = normalize_phone(phone)
    async with httpx.AsyncClient() as client:
        r = await client.post(
            _base_url(),
            headers=_headers(),
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": text},
            },
        )
        r.raise_for_status()


async def send_template(phone: str, template_name: str, parameters: list[str]) -> None:
    """Send an approved WhatsApp template message."""
    to = normalize_phone(phone)
    components = []
    if parameters:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": p} for p in parameters],
        })

    async with httpx.AsyncClient() as client:
        r = await client.post(
            _base_url(),
            headers=_headers(),
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "nl"},
                    "components": components,
                },
            },
        )
        r.raise_for_status()


async def send_demo_start_template(phone: str, naam: str) -> None:
    """Send the demo_start template with branche selection buttons."""
    s = get_settings()
    await send_template(phone, s.whatsapp_demo_template_name, [naam])


async def send_personalized_demo_template(phone: str, naam: str, bedrijf: str) -> None:
    """Send the personalized demo template."""
    s = get_settings()
    await send_template(phone, s.whatsapp_personalized_demo_template_name, [naam, bedrijf])


async def send_document(phone: str, document_url: str, filename: str, caption: str | None = None) -> None:
    """Send a document (e.g. PDF quote) via WhatsApp."""
    to = normalize_phone(phone)
    doc_payload: dict = {"link": document_url, "filename": filename}
    if caption:
        doc_payload["caption"] = caption

    async with httpx.AsyncClient() as client:
        r = await client.post(
            _base_url(),
            headers=_headers(),
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "document",
                "document": doc_payload,
            },
        )
        r.raise_for_status()


async def get_media_url(media_id: str) -> str | None:
    """Get the temporary download URL for a WhatsApp media message."""
    token = get_settings().whatsapp_access_token
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://graph.facebook.com/{GRAPH_API_VERSION}/{media_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code != 200:
            return None
        return r.json().get("url")


async def download_media(url: str) -> tuple[bytes, str] | None:
    """Download binary file from a Meta media URL. Returns (bytes, content_type)."""
    token = get_settings().whatsapp_access_token
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        if r.status_code != 200:
            return None
        content_type = r.headers.get("content-type", "application/octet-stream")
        return r.content, content_type
