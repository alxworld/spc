"""Booking routes for regular users."""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database import get_conn
from app.deps import get_current_user

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


class BookingRequest(BaseModel):
    date: str
    start_time: str
    end_time: str
    purpose: str
    attendees: int


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


@router.get("")
def list_my_bookings(user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT b.*, u.name, u.email FROM bookings b
               JOIN users u ON u.id = b.user_id
               WHERE b.user_id = ? ORDER BY b.date DESC""",
            (user["id"],),
        ).fetchall()
    return [_booking_row_to_dict(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_booking(body: BookingRequest, user: dict = Depends(get_current_user)):
    if body.end_time <= body.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    with get_conn() as conn:
        # Check blocked dates
        if conn.execute("SELECT 1 FROM blocked_dates WHERE date = ?", (body.date,)).fetchone():
            raise HTTPException(status_code=409, detail="Date is blocked")
        cursor = conn.execute(
            """INSERT INTO bookings (user_id, date, start_time, end_time, purpose, attendees, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)""",
            (user["id"], body.date, body.start_time, body.end_time, body.purpose, body.attendees,
             date_type.today().isoformat()),
        )
        booking_id = cursor.lastrowid
    return {"id": booking_id, "status": "pending"}


@router.get("/availability")
def get_availability(user: dict = Depends(get_current_user)):
    """Returns approved booking dates and blocked dates for calendar display."""
    with get_conn() as conn:
        approved = [r["date"] for r in conn.execute(
            "SELECT date FROM bookings WHERE status = 'approved'"
        ).fetchall()]
        blocked = [{"date": r["date"], "reason": r["reason"]}
                   for r in conn.execute("SELECT date, reason FROM blocked_dates").fetchall()]
    return {"approvedDates": approved, "blockedDates": blocked}
