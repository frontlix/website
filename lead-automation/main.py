import asyncio
import sys
from pathlib import Path

# Add personalized-demo folder to Python path so it can be imported as a module
# while keeping its files physically separate from lead-automation
_pd_path = str(Path(__file__).resolve().parent.parent / "personalized-demo")
if _pd_path not in sys.path:
    sys.path.insert(0, _pd_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.webhook import router as webhook_router
from routes.demo import router as demo_router
from routes.approve import router as approve_router
from routes.edit import router as edit_router
from routes.schedule import router as schedule_router
from routes.dashboard_api import router as dashboard_api_router
from routes.external_webhook import router as external_webhook_router
from routes.web_chat import router as web_chat_router
from routes.test_chat import router as test_chat_router

# Personalized demo routes (separate module in /personalized-demo/)
from pd_routes import router as personalized_router
from pd_approve import router as pd_approve_router
from pd_edit import router as pd_edit_router
from pd_schedule import router as pd_schedule_router

from branches.loader import hydrate_all, start_background_refresh
from services.delivery_timeout_cron import start as start_delivery_timeout_cron
from services.web_chat_reminder_cron import start as start_web_chat_reminder_cron

app = FastAPI(
    title="Frontlix Lead Automation",
    version="1.0.0",
    description="WhatsApp lead automation service — van aanvraag tot offerte tot afspraak.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://frontlix.com", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook_router)
app.include_router(demo_router)
app.include_router(approve_router)
app.include_router(edit_router)
app.include_router(schedule_router)
app.include_router(dashboard_api_router)
# Pakket 4a/4b: HMAC external form webhook + web-chat fallback. Both registered
# before the pd_* block so the pd_* router-block (frozen) stays intact at the end.
app.include_router(external_webhook_router)
app.include_router(web_chat_router)
app.include_router(personalized_router)
app.include_router(pd_approve_router)
app.include_router(pd_edit_router)
app.include_router(pd_schedule_router)
# Browser dev-loop. Registered LAST per Pakket 3 plan — order matters: keep pd_* untouched.
app.include_router(test_chat_router)


@app.on_event("startup")
async def _startup() -> None:
    # Initial hydrate — hard fail bubbelt op zodat de app niet zonder branche-config opstart.
    hydrate_all()
    app.state.config_refresh_task = asyncio.create_task(start_background_refresh(60))
    # Pakket 4b: web-chat fallback crons. Both are no-ops if there are no eligible leads;
    # the reminder cron also self-disables when WEB_CHAT_FALLBACK_ENABLED=false.
    app.state.delivery_timeout_task = asyncio.create_task(start_delivery_timeout_cron())
    app.state.web_chat_reminder_task = asyncio.create_task(start_web_chat_reminder_cron())


@app.on_event("shutdown")
async def _shutdown() -> None:
    for attr in ("config_refresh_task", "delivery_timeout_task", "web_chat_reminder_task"):
        task = getattr(app.state, attr, None)
        if task is not None:
            task.cancel()


@app.get("/health")
async def health():
    return {"status": "ok"}
