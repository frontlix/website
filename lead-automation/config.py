from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # WhatsApp (Meta Cloud API)
    whatsapp_phone_number_id: str
    whatsapp_access_token: str
    whatsapp_verify_token: str
    whatsapp_demo_template_name: str = "demo_starten"
    whatsapp_personalized_demo_template_name: str = "demo_persoonlijk"

    # OpenAI
    openai_api_key: str

    # Supabase
    supabase_url: str
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

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
