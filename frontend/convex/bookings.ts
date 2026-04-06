import { mutation, query, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

const HALL_OPEN = "06:00";
const HALL_CLOSE = "20:00";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  const userId = identity.subject.split("|")[0] as Id<"users">;
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("User not found");
  return user;
}

function validateFields(args: {
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  if (args.date < today) throw new ConvexError("Cannot book a date in the past");
  if (args.startTime < HALL_OPEN || args.startTime >= HALL_CLOSE)
    throw new ConvexError(`Start time must be between ${HALL_OPEN} and ${HALL_CLOSE}`);
  if (args.endTime > HALL_CLOSE)
    throw new ConvexError(`End time cannot be after ${HALL_CLOSE}`);
  if (args.endTime <= args.startTime)
    throw new ConvexError("End time must be after start time");
  if (args.attendees < 1 || args.attendees > 50)
    throw new ConvexError("Attendees must be between 1 and 50");
}

async function checkHallConflict(
  ctx: MutationCtx,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: Id<"bookings">
) {
  const approved = await ctx.db
    .query("bookings")
    .withIndex("by_date_and_status", (q) =>
      q.eq("date", date).eq("status", "approved")
    )
    .take(100);

  const conflict = approved.find(
    (b) =>
      b._id !== excludeId &&
      b.startTime < endTime &&
      b.endTime > startTime
  );
  if (conflict) throw new ConvexError("The hall is already booked for that time slot");
}

async function checkUserConflict(
  ctx: MutationCtx,
  userId: Id<"users">,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: Id<"bookings">
) {
  const userBookings = await ctx.db
    .query("bookings")
    .withIndex("by_userId_and_date", (q) =>
      q.eq("userId", userId).eq("date", date)
    )
    .take(50);

  const conflict = userBookings.find(
    (b) =>
      b._id !== excludeId &&
      (b.status === "pending" || b.status === "approved") &&
      b.startTime < endTime &&
      b.endTime > startTime
  );
  if (conflict)
    throw new ConvexError("You already have a booking overlapping that time slot");
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

/** Returns the current user's bookings, newest first. */
export const getMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
    return bookings.map((b) => ({
      id: b._id,
      userId: b.userId,
      userName: user.name ?? "",
      userEmail: user.email ?? "",
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      purpose: b.purpose,
      attendees: b.attendees,
      status: b.status,
      createdAt: b._creationTime,
    }));
  },
});

/** Returns approved booking dates and blocked dates for the calendar. */
export const getAvailability = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const approved = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .take(500);

    const blocked = await ctx.db
      .query("blockedDates")
      .order("asc")
      .take(200);

    return {
      approvedDates: approved.map((b) => b.date),
      blockedDates: blocked.map((b) => ({ date: b.date, reason: b.reason })),
    };
  },
});

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

const bookingArgs = {
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  purpose: v.string(),
  attendees: v.number(),
};

/** Create a new booking request. */
export const createBooking = mutation({
  args: bookingArgs,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    validateFields(args);

    const blocked = await ctx.db
      .query("blockedDates")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (blocked) throw new ConvexError("Date is blocked");

    await checkHallConflict(ctx, args.date, args.startTime, args.endTime);
    await checkUserConflict(ctx, user._id, args.date, args.startTime, args.endTime);

    const id = await ctx.db.insert("bookings", {
      userId: user._id,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      purpose: args.purpose,
      attendees: args.attendees,
      status: "pending",
    });
    return { id, status: "pending" };
  },
});

/** Cancel a pending booking that belongs to the current user. */
export const cancelBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking not found");
    if (booking.userId !== user._id) throw new ConvexError("Not your booking");
    if (booking.status !== "pending")
      throw new ConvexError("Only pending bookings can be cancelled");
    await ctx.db.delete(args.bookingId);
  },
});

/** Update a pending booking that belongs to the current user. */
export const updateBooking = mutation({
  args: { bookingId: v.id("bookings"), ...bookingArgs },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking not found");
    if (booking.userId !== user._id) throw new ConvexError("Not your booking");
    if (booking.status !== "pending")
      throw new ConvexError("Only pending bookings can be modified");

    validateFields(args);

    const blocked = await ctx.db
      .query("blockedDates")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (blocked) throw new ConvexError("Date is blocked");

    await checkHallConflict(ctx, args.date, args.startTime, args.endTime, args.bookingId);
    await checkUserConflict(ctx, user._id, args.date, args.startTime, args.endTime, args.bookingId);

    await ctx.db.patch(args.bookingId, {
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      purpose: args.purpose,
      attendees: args.attendees,
    });
    return { id: args.bookingId, status: "pending" };
  },
});

// ---------------------------------------------------------------------------
// Internal queries (used by chat action)
// ---------------------------------------------------------------------------

/** Returns availability context string for the AI system prompt. */
export const getAvailabilityContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const approved = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .take(500);
    const blocked = await ctx.db.query("blockedDates").order("asc").take(200);

    const lines: string[] = [];
    if (approved.length > 0)
      lines.push(`Hall-wide approved booking dates: ${approved.map((b) => b.date).join(", ")}`);
    if (blocked.length > 0)
      lines.push(`Blocked dates: ${blocked.map((b) => `${b.date} (${b.reason})`).join(", ")}`);
    if (lines.length === 0)
      lines.push("No dates are currently booked or blocked.");
    return lines.join("\n");
  },
});

/** Returns a user's bookings as a string for the AI system prompt. */
export const getUserBookingsContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("asc")
      .take(50);
    if (bookings.length === 0) return "This user has no bookings yet.";
    return bookings
      .map(
        (b) =>
          `- [booking_id=${b._id}] ${b.date} ${b.startTime}–${b.endTime}: ${b.purpose.slice(0, 200).replace(/\n/g, " ")} (${b.attendees} attendees) — status: ${b.status}`
      )
      .join("\n");
  },
});
