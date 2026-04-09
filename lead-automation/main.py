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

# Personalized demo routes (separate module in /personalized-demo/)
from pd_routes import router as personalized_router
from pd_approve import router as pd_approve_router
from pd_edit import router as pd_edit_router
from pd_schedule import router as pd_schedule_router

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
app.include_router(personalized_router)
app.include_router(pd_approve_router)
app.include_router(pd_edit_router)
app.include_router(pd_schedule_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
