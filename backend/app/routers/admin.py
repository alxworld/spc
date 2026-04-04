"""Admin routes: manage bookings, blocked dates, and users."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database import get_conn
from app.deps import get_current_user, require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _admin_user(user: dict = Depends(get_current_user)) -> dict:
    return require_admin(user)


def _booking_row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "userName": row["name"],
        "userEmail": row["email"],
        "date": row["date"],
        "startTime": row["start_time"],
        "endTime": row["end_time"],
        "purpose": row["purpose"],
        "attendees": row["attendees"],
        "status": row["status"],
        "createdAt": row["created_at"],
    }


# --- Bookings ---

@router.get("/bookings")
def list_all_bookings(user: dict = Depends(_admin_user)):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT b.*, u.name, u.email FROM bookings b
               JOIN users u ON u.id = b.user_id
               ORDER BY b.date DESC"""
        ).fetchall()
    return [_booking_row_to_dict(r) for r in rows]


class StatusUpdate(BaseModel):
    status: str


@router.put("/bookings/{booking_id}")
def update_booking_status(booking_id: int, body: StatusUpdate, user: dict = Depends(_admin_user)):
    if body.status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status")
    with get_conn() as conn:
        result = conn.execute(
            "UPDATE bookings SET status = ? WHERE id = ?", (body.status, booking_id)
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Booking not found")
    return {"ok": True}


# --- Blocked dates ---

class BlockedDateRequest(BaseModel):
    date: str
    reason: str = "Admin block"


@router.get("/blocked-dates")
def list_blocked_dates(user: dict = Depends(_admin_user)):
    with get_conn() as conn:
        rows = conn.execute("SELECT date, reason FROM blocked_dates ORDER BY date").fetchall()
    return [{"date": r["date"], "reason": r["reason"]} for r in rows]


@router.post("/blocked-dates", status_code=status.HTTP_201_CREATED)
def block_date(body: BlockedDateRequest, user: dict = Depends(_admin_user)):
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO blocked_dates (date, reason) VALUES (?, ?)",
            (body.date, body.reason),
        )
    return {"ok": True}


@router.delete("/blocked-dates/{date}")
def unblock_date(date: str, user: dict = Depends(_admin_user)):
    with get_conn() as conn:
        conn.execute("DELETE FROM blocked_dates WHERE date = ?", (date,))
    return {"ok": True}


# --- Users ---

@router.get("/users")
def list_users(user: dict = Depends(_admin_user)):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]
