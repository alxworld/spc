"""AI chat routes using LiteLLM via OpenRouter/Cerebras."""
import os
from datetime import date
from typing import Optional

from fastapi import APIRouter, Cookie, Depends
from litellm import completion
from pydantic import BaseModel

from app.auth import decode_token
from app.database import get_conn

router = APIRouter(prefix="/api/chat", tags=["chat"])

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["Cerebras"]}}

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

SYSTEM_PROMPT = """You are the SPC Assistant for the Saturday Prayer Cell (SPC) Prayer Hall booking system.
You are warm, helpful, and speak with the heart of a servant in a Christian community.

## About the Prayer Hall
- Name: SPC Prayer Hall
- Size: 750 sq ft, capacity up to 50 people
- Free of charge for God's people to gather and pray
- Available daily from 06:00 to 20:00
- Time slots must start and end on the hour (e.g. 09:00–11:00)

## Your role
Help users with:
1. Answering questions about the prayer hall, its mission, and prayer timings
2. Booking the prayer hall or checking availability
3. Modifying or cancelling their existing pending bookings

## Authentication requirement
The user's login status is: {logged_in}

If the user is NOT logged in and they ask to make or change a booking, do NOT collect details.
Instead, tell them they need to sign in first at /login.
You can still answer general questions for unauthenticated users.

## Booking workflow (only for logged-in users)

### New booking
Collect these details through natural conversation:
- Date (YYYY-MM-DD)
- Start time (HH:MM, between 06:00 and 20:00)
- End time (HH:MM, must be after start time)
- Purpose of the gathering
- Expected number of attendees (1–50)

Once ALL five details are confirmed, end your reply with this exact JSON on its own line:
BOOKING_ACTION:{{"date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM","purpose":"...","attendees":N}}

### Modify an existing pending booking
Ask the user which booking they want to change (show them the list if needed) and what they want to change.
Collect all updated details, confirm with the user, then end your reply with:
UPDATE_ACTION:{{"booking_id":N,"date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM","purpose":"...","attendees":N}}

### Cancel an existing pending booking
Ask which booking they want to cancel, confirm they are sure, then end your reply with:
CANCEL_ACTION:{{"booking_id":N}}

Only pending bookings can be modified or cancelled. If the booking is approved or rejected, tell the user it cannot be changed through chat.
Do not include any action line until details are fully confirmed. Only emit one action per reply.

## This user's bookings
{user_bookings}

## Hall-wide availability context
{availability}

## Today's date
{today}

Keep responses concise and friendly. If a date is blocked or already booked, suggest alternatives."""


def _get_availability_context() -> str:
    with get_conn() as conn:
        booked = [r["date"] for r in conn.execute(
            "SELECT date FROM bookings WHERE status = 'approved'"
        ).fetchall()]
        blocked = [f"{r['date']} ({r['reason']})" for r in conn.execute(
            "SELECT date, reason FROM blocked_dates"
        ).fetchall()]
    lines = []
    if booked:
        lines.append(f"Hall-wide approved booking dates: {', '.join(booked)}")
    if blocked:
        lines.append(f"Blocked dates: {', '.join(blocked)}")
    if not lines:
        lines.append("No dates are currently booked or blocked.")
    return "\n".join(lines)


def _get_user_bookings(user_id: int) -> str:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, date, start_time, end_time, purpose, attendees, status "
            "FROM bookings WHERE user_id = ? ORDER BY date",
            (user_id,),
        ).fetchall()
    if not rows:
        return "This user has no bookings yet."
    lines = []
    for r in rows:
        purpose = str(r["purpose"])[:200].replace("\n", " ")
        lines.append(
            f"- [booking_id={r['id']}] {r['date']} {r['start_time']}–{r['end_time']}: {purpose} "
            f"({r['attendees']} attendees) — status: {r['status']}"
        )
    return "\n".join(lines)


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


class BookingAction(BaseModel):
    date: str
    start_time: str
    end_time: str
    purpose: str
    attendees: int


class UpdateAction(BaseModel):
    booking_id: int
    date: str
    start_time: str
    end_time: str
    purpose: str
    attendees: int


class CancelAction(BaseModel):
    booking_id: int


class ChatResponse(BaseModel):
    reply: str
    booking_action: Optional[BookingAction] = None
    update_action: Optional[UpdateAction] = None
    cancel_action: Optional[CancelAction] = None


@router.get("/greeting")
def greeting() -> ChatResponse:
    return ChatResponse(
        reply="Hello! I'm the SPC Assistant. I can help you learn about our Prayer Hall, check availability, or guide you through booking a slot. How can I help you today?"
    )


@router.post("/message")
def chat(body: ChatRequest, access_token: str | None = Cookie(default=None)) -> ChatResponse:
    # Determine login status and user id from cookie
    logged_in = False
    user_id: int | None = None
    if access_token:
        try:
            payload = decode_token(access_token)
            logged_in = True
            user_id = int(payload["sub"])
        except Exception:
            pass

    user_bookings = _get_user_bookings(user_id) if user_id else "User is not logged in — no booking data available."

    system = SYSTEM_PROMPT.format(
        availability=_get_availability_context(),
        user_bookings=user_bookings,
        today=date.today().isoformat(),
        logged_in="YES — user is signed in" if logged_in else "NO — user is not signed in",
    )

    messages = [{"role": "system", "content": system}]
    for m in body.history:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": body.message})

    response = completion(
        model=MODEL,
        messages=messages,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
        api_key=OPENROUTER_API_KEY,
    )
    raw: str = response.choices[0].message.content or ""

    # Parse optional action markers from reply
    import json

    booking_action = None
    update_action = None
    cancel_action = None
    reply = raw

    for marker, model, field in [
        ("BOOKING_ACTION:", BookingAction, "booking"),
        ("UPDATE_ACTION:", UpdateAction, "update"),
        ("CANCEL_ACTION:", CancelAction, "cancel"),
    ]:
        if marker in raw:
            idx = raw.index(marker)
            reply = raw[:idx].strip()
            json_str = raw[idx + len(marker):].strip().split("\n")[0]
            try:
                data = json.loads(json_str)
                if field == "booking":
                    booking_action = BookingAction(**data)
                elif field == "update":
                    update_action = UpdateAction(**data)
                elif field == "cancel":
                    cancel_action = CancelAction(**data)
            except Exception:
                pass
            break

    return ChatResponse(reply=reply, booking_action=booking_action, update_action=update_action, cancel_action=cancel_action)
