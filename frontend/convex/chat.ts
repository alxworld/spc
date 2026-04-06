import { action, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";

const MODEL = "openrouter/openai/gpt-oss-120b";
const EXTRA_BODY = { provider: { order: ["Cerebras"] } };

const SYSTEM_PROMPT = `You are the SPC Assistant for the Saturday Prayer Cell (SPC) Prayer Hall booking system.
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
BOOKING_ACTION:{{"date":"YYYY-MM-DD","startTime":"HH:MM","endTime":"HH:MM","purpose":"...","attendees":N}}

### Modify an existing pending booking
Ask the user which booking they want to change and what they want to change.
Collect all updated details, confirm with the user, then end your reply with:
UPDATE_ACTION:{{"bookingId":"<id>","date":"YYYY-MM-DD","startTime":"HH:MM","endTime":"HH:MM","purpose":"...","attendees":N}}

### Cancel an existing pending booking
Ask which booking they want to cancel, confirm they are sure, then end your reply with:
CANCEL_ACTION:{{"bookingId":"<id>"}}

Only pending bookings can be modified or cancelled.
Do not include any action line until details are fully confirmed. Only emit one action per reply.

## This user's bookings
{user_bookings}

## Hall-wide availability context
{availability}

## Today's date
{today}

Keep responses concise and friendly. If a date is blocked or already booked, suggest alternatives.`;

// ---------------------------------------------------------------------------
// Greeting — simple static query
// ---------------------------------------------------------------------------

export const getGreeting = query({
  args: {},
  handler: async () => {
    return {
      reply:
        "Hello! I'm the SPC Assistant. I can help you learn about our Prayer Hall, check availability, or guide you through booking a slot. How can I help you today?",
      bookingAction: null,
      updateAction: null,
      cancelAction: null,
    };
  },
});

// ---------------------------------------------------------------------------
// Send message — action (calls OpenRouter via fetch)
// ---------------------------------------------------------------------------

export const sendMessage = action({
  args: {
    message: v.string(),
    history: v.array(
      v.object({ role: v.string(), content: v.string() })
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY ?? "";

    // Determine auth — Clerk subject is the plain user ID (no splitting needed)
    const identity = await ctx.auth.getUserIdentity();
    const loggedIn = identity !== null;
    const clerkId = identity?.subject ?? null;
    const userRecord = clerkId
      ? await ctx.runQuery(internal.users.getByClerkId, { clerkId })
      : null;
    const userId = userRecord?._id ?? null;

    // Fetch context data via internal queries
    const availability: string = await ctx.runQuery(
      internal.bookings.getAvailabilityContext,
      {}
    );
    const userBookings: string = userId
      ? await ctx.runQuery(internal.bookings.getUserBookingsContext, { userId })
      : "User is not logged in — no booking data available.";

    const today = new Date().toISOString().slice(0, 10);
    const system = SYSTEM_PROMPT
      .replace("{logged_in}", loggedIn ? "YES — user is signed in" : "NO — user is not signed in")
      .replace("{user_bookings}", userBookings)
      .replace("{availability}", availability)
      .replace("{today}", today);

    const messages = [
      { role: "system", content: system },
      ...args.history,
      { role: "user", content: args.message },
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
        ...EXTRA_BODY,
      }),
    });

    if (!response.ok) {
      throw new ConvexError("AI service unavailable. Please try again.");
    }

    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";

    // Parse optional action markers
    let reply = raw;
    let bookingAction = null;
    let updateAction = null;
    let cancelAction = null;

    const markers = [
      { marker: "BOOKING_ACTION:", field: "booking" },
      { marker: "UPDATE_ACTION:", field: "update" },
      { marker: "CANCEL_ACTION:", field: "cancel" },
    ] as const;

    for (const { marker, field } of markers) {
      if (raw.includes(marker)) {
        const idx = raw.indexOf(marker);
        reply = raw.slice(0, idx).trim();
        const jsonStr = raw.slice(idx + marker.length).trim().split("\n")[0];
        try {
          const parsed = JSON.parse(jsonStr);
          if (field === "booking") bookingAction = parsed;
          else if (field === "update") updateAction = parsed;
          else if (field === "cancel") cancelAction = parsed;
        } catch {
          // Malformed action — ignore and return plain reply
        }
        break;
      }
    }

    return { reply, bookingAction, updateAction, cancelAction };
  },
});
