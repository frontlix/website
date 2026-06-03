from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Literal, Optional


class Settings(BaseSettings):
    # WhatsApp (Meta Cloud API)
    whatsapp_phone_number_id: str
    whatsapp_access_token: str
    whatsapp_verify_token: str
    whatsapp_demo_template_name: str = "demo_starten"
    whatsapp_personalized_demo_template_name: str = "demo_persoonlijk"

    # OpenAI
    openai_api_key: str

    # Supabase, accept either SUPABASE_URL or the Next.js convention
    # NEXT_PUBLIC_SUPABASE_URL so the same root .env feeds both sides.
    supabase_url: str = Field(validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"))
    supabase_service_role_key: str

    # Google Calendar
    google_client_id: str
    google_client_secret: str
    google_calendar_id: str
    google_refresh_token: str

    # Mail (SMTP)
    mail_host: str = "smtp.hostinger.com"
    mail_port: int = 465
    mail_user: str
    mail_pass: str

    # App
    site_url: str = "https://frontlix.com"
    service_url: str = "http://localhost:8000"  # Public URL of this Python service (ngrok or VPS)

    # Multi-tenant config (Pakket 1)
    # "json" leest clients/<id>/config.json, "db" leest branche_settings + branche_fields
    config_source: Literal["json", "db"] = "json"
    # Bearer-token voor POST /dashboard-api/config/reload. Leeg = endpoint geeft 503.
    dashboard_api_token: Optional[str] = None

    # External form webhook (Pakket 4a), off | dry-run | live
    external_webhook_mode: Literal["off", "dry-run", "live"] = "off"
    external_webhook_secret: Optional[str] = None

    # Web-chat fallback (Pakket 4b), false = detect-only, no mail sent
    web_chat_fallback_enabled: bool = False

    # WhatsApp number of the business owner, receives ALERT messages when an
    # offerte-mail fails to send, so leads don't silently disappear. Leave empty
    # to disable owner-alerts (failures are still logged via the python logger).
    # Format: international with country code, no +, e.g. "31638272245".
    owner_whatsapp_phone: Optional[str] = None

    # Look at lead-automation/.env (local override) first, fall back to the
    # website-root .env so the same secrets file works on Mac dev + VPS deploy.
    model_config = {
        "env_file": ("../.env", ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
