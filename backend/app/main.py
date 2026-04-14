"""FastAPI application entry point. Serves API routes and static frontend."""
import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()  # picks up .env from CWD or any parent dir (local dev only)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers import admin, auth, bookings, chat

app = FastAPI(title="SPC Prayer Hall")

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
    secret = os.getenv("SECRET_KEY", "")
    if not secret or len(secret) < 32:
        raise RuntimeError("SECRET_KEY env var must be set to at least 32 characters")
    init_db()


FRONTEND_DIR = Path(__file__).parent.parent / "frontend_dist"
FRONTEND_DIR_RESOLVED = FRONTEND_DIR.resolve()


def _within_frontend(path: Path) -> bool:
    """Return True only if path resolves to a location inside FRONTEND_DIR."""
    try:
        return path.resolve().is_relative_to(FRONTEND_DIR_RESOLVED)
    except Exception:
        return False


if FRONTEND_DIR.exists():
    # Serve Next.js static assets (_next/static/...)
    app.mount("/_next", StaticFiles(directory=FRONTEND_DIR / "_next"), name="next-assets")

    # Serve other public assets (images, icons, etc.)
    app.mount("/public", StaticFiles(directory=FRONTEND_DIR), name="public-assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    def serve_frontend(full_path: str):
        """Map any path to the corresponding Next.js static HTML file."""
        clean = full_path.strip("/")

        # Exact HTML file (e.g. /dashboard → dashboard.html)
        html_file = FRONTEND_DIR / f"{clean}.html"
        if _within_frontend(html_file) and html_file.exists():
            return FileResponse(html_file)

        # Index inside a directory (e.g. /dashboard/ → dashboard/index.html)
        index_file = FRONTEND_DIR / clean / "index.html"
        if _within_frontend(index_file) and index_file.exists():
            return FileResponse(index_file)

        # Any other static file (images, svgs, etc.)
        static_file = FRONTEND_DIR / clean
        if _within_frontend(static_file) and static_file.exists() and static_file.is_file():
            return FileResponse(static_file)

        # Root
        root_index = FRONTEND_DIR / "index.html"
        if root_index.exists():
            return FileResponse(root_index)

        return FileResponse(FRONTEND_DIR / "404.html", status_code=404)
