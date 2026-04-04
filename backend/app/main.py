"""FastAPI application entry point. Serves API routes and static frontend."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers import admin, auth, bookings

app = FastAPI(title="SPC Prayer Hall")

app.include_router(auth.router)
app.include_router(bookings.router)
app.include_router(admin.router)


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
