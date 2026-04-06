import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  const user = await ctx.db.get(identity.subject as Id<"users">);
  if (!user || (user.role !== "admin" && user.role !== "superadmin"))
    throw new ConvexError("Admin access required");
  return user;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

/** Returns all bookings with user details — admin only. */
export const getAllBookings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db.query("bookings").order("desc").take(500);
    return await Promise.all(
      bookings.map(async (b) => {
        const user = await ctx.db.get(b.userId);
        return {
          id: b._id,
          userId: b.userId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          purpose: b.purpose,
          attendees: b.attendees,
          status: b.status,
          createdAt: b._creationTime,
        };
      })
    );
  },
});

/** Approve or reject a booking — admin only. */
export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("pending")
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking not found");
    await ctx.db.patch(args.bookingId, { status: args.status });
  },
});

// ---------------------------------------------------------------------------
// Blocked dates
// ---------------------------------------------------------------------------

/** Returns all blocked dates — admin only. */
export const getBlockedDates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const dates = await ctx.db.query("blockedDates").order("asc").take(200);
    return dates.map((d) => ({ date: d.date, reason: d.reason }));
  },
});

/** Block a date — admin only. */
export const blockDate = mutation({
  args: { date: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("blockedDates")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (!existing) {
      await ctx.db.insert("blockedDates", {
        date: args.date,
        reason: args.reason,
      });
    }
  },
});

/** Unblock a date — admin only. */
export const unblockDate = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("blockedDates")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** Returns all users — admin only. */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(200);
    return users.map((u) => ({
      id: u._id,
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role ?? "user",
      createdAt: u._creationTime,
    }));
  },
});
