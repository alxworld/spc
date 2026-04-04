"""FastAPI dependency: extract and validate the current user from cookie."""
from fastapi import Cookie, HTTPException, status
from jose import JWTError

from app.auth import decode_token
from app.database import get_conn


def get_current_user(access_token: str | None = Cookie(default=None)) -> dict:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(access_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = int(payload["sub"])
    with get_conn() as conn:
        row = conn.execute("SELECT id, name, email, role, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return dict(row)


def require_admin(user: dict = None) -> dict:
    """Use as a dependency after get_current_user."""
    if user["role"] not in ("admin", "superadmin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
