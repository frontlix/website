from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.webhook import router as webhook_router
from routes.demo import router as demo_router
from routes.approve import router as approve_router
from routes.edit import router as edit_router

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


@app.get("/health")
async def health():
    return {"status": "ok"}
