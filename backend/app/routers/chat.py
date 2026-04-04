"""AI chat routes using LiteLLM via OpenRouter/Cerebras."""
import os
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from litellm import completion
from pydantic import BaseModel

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
Help users with two things:
1. Answer questions about the prayer hall, its mission, and prayer timings
2. Help them book the prayer hall or check availability

## Booking workflow
When a user wants to book, collect these details through natural conversation:
- Date (YYYY-MM-DD)
- Start time (HH:MM, between 06:00 and 20:00)
- End time (HH:MM, must be after start time)
- Purpose of the gathering
- Expected number of attendees (1–50)

Once you have ALL five details confirmed by the user, end your reply with this exact JSON block on its own line:
BOOKING_ACTION:{{"date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM","purpose":"...","attendees":N}}

Do not include the BOOKING_ACTION line until all details are confirmed. Only include it once.

## Availability context
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
        lines.append(f"Already booked dates: {', '.join(booked)}")
    if blocked:
        lines.append(f"Blocked dates: {', '.join(blocked)}")
    if not lines:
        lines.append("No dates are currently booked or blocked.")
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


class ChatResponse(BaseModel):
    reply: str
    booking_action: Optional[BookingAction] = None


@router.get("/greeting")
def greeting() -> ChatResponse:
    return ChatResponse(
        reply="Hello! I'm the SPC Assistant. I can help you learn about our Prayer Hall, check availability, or guide you through booking a slot. How can I help you today?"
    )


@router.post("/message")
def chat(body: ChatRequest) -> ChatResponse:
    system = SYSTEM_PROMPT.format(
        availability=_get_availability_context(),
        today=date.today().isoformat(),
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

    # Parse optional BOOKING_ACTION from reply
    booking_action = None
    reply = raw
    marker = "BOOKING_ACTION:"
    if marker in raw:
        idx = raw.index(marker)
        reply = raw[:idx].strip()
        json_str = raw[idx + len(marker):].strip()
        try:
            import json
            booking_action = BookingAction(**json.loads(json_str))
        except Exception:
            pass  # malformed — ignore and show reply without action

    return ChatResponse(reply=reply, booking_action=booking_action)
