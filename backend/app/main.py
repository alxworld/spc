"""FastAPI application entry point. Serves API routes and static frontend."""
import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers import admin, auth, bookings, chat

app = FastAPI(title="SPC Prayer Hall")

# Allow the Next.js dev server origin in development.
# In production the frontend is served from the same origin, so this is a no-op.
_allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(bookings.router)
app.include_router(admin.router)
app.include_router(chat.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def startup():
    init_db()


# Serve static frontend — must be mounted last
FRONTEND_DIR = Path(__file__).parent.parent / "frontend_dist"

if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
