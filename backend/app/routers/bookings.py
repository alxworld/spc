"""Booking routes for regular users."""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database import get_conn
from app.deps import get_current_user

HALL_OPEN = "06:00"
HALL_CLOSE = "20:00"


def _validate_booking_fields(body: "BookingRequest"):
    if body.date < date_type.today().isoformat():
        raise HTTPException(status_code=400, detail="Cannot book a date in the past")
    if body.start_time < HALL_OPEN or body.start_time >= HALL_CLOSE:
        raise HTTPException(status_code=400, detail=f"Start time must be between {HALL_OPEN} and {HALL_CLOSE}")
    if body.end_time > HALL_CLOSE:
        raise HTTPException(status_code=400, detail=f"End time cannot be after {HALL_CLOSE}")
    if body.end_time <= body.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    if not (1 <= body.attendees <= 50):
        raise HTTPException(status_code=400, detail="Attendees must be between 1 and 50")


def _check_user_slot_conflict(conn, user_id: int, date: str, start_time: str, end_time: str, exclude_id: int | None = None):
    """Raise 409 if the user already has a pending/approved booking overlapping this slot."""
    query = """
        SELECT id FROM bookings
        WHERE user_id = ? AND date = ? AND status IN ('pending', 'approved')
        AND start_time < ? AND end_time > ?
    """
    params = [user_id, date, end_time, start_time]
    if exclude_id is not None:
        query += " AND id != ?"
        params.append(exclude_id)
    if conn.execute(query, params).fetchone():
        raise HTTPException(status_code=409, detail="You already have a booking overlapping that time slot")


def _check_hall_slot_conflict(conn, date: str, start_time: str, end_time: str, exclude_id: int | None = None):
    """Raise 409 if any approved booking from any user overlaps this slot."""
    query = """
        SELECT id FROM bookings
        WHERE date = ? AND status = 'approved'
        AND start_time < ? AND end_time > ?
    """
    params = [date, end_time, start_time]
    if exclude_id is not None:
        query += " AND id != ?"
        params.append(exclude_id)
    if conn.execute(query, params).fetchone():
        raise HTTPException(status_code=409, detail="The hall is already booked for that time slot")

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
    _validate_booking_fields(body)
    with get_conn() as conn:
        if conn.execute("SELECT 1 FROM blocked_dates WHERE date = ?", (body.date,)).fetchone():
            raise HTTPException(status_code=409, detail="Date is blocked")
        _check_hall_slot_conflict(conn, body.date, body.start_time, body.end_time)
        _check_user_slot_conflict(conn, user["id"], body.date, body.start_time, body.end_time)
        cursor = conn.execute(
            """INSERT INTO bookings (user_id, date, start_time, end_time, purpose, attendees, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)""",
            (user["id"], body.date, body.start_time, body.end_time, body.purpose, body.attendees,
             date_type.today().isoformat()),
        )
        booking_id = cursor.lastrowid
    return {"id": booking_id, "status": "pending"}


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_booking(booking_id: int, user: dict = Depends(get_current_user)):
    """Cancel a pending booking that belongs to the current user."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, user_id, status FROM bookings WHERE id = ?", (booking_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Booking not found")
        if row["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not your booking")
        if row["status"] != "pending":
            raise HTTPException(status_code=409, detail="Only pending bookings can be cancelled")
        conn.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))


@router.put("/{booking_id}")
def update_booking(booking_id: int, body: BookingRequest, user: dict = Depends(get_current_user)):
    """Update a pending booking that belongs to the current user."""
    _validate_booking_fields(body)
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, user_id, status FROM bookings WHERE id = ?", (booking_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Booking not found")
        if row["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not your booking")
        if row["status"] != "pending":
            raise HTTPException(status_code=409, detail="Only pending bookings can be modified")
        if conn.execute("SELECT 1 FROM blocked_dates WHERE date = ?", (body.date,)).fetchone():
            raise HTTPException(status_code=409, detail="Date is blocked")
        _check_hall_slot_conflict(conn, body.date, body.start_time, body.end_time, exclude_id=booking_id)
        _check_user_slot_conflict(conn, user["id"], body.date, body.start_time, body.end_time, exclude_id=booking_id)
        conn.execute(
            "UPDATE bookings SET date=?, start_time=?, end_time=?, purpose=?, attendees=? WHERE id=?",
            (body.date, body.start_time, body.end_time, body.purpose, body.attendees, booking_id),
        )
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
